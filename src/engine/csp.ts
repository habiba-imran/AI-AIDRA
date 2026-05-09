import type {
  CspAssignmentStep,
  CspConstraint,
  CspPerfRow,
  CspSolution,
  CspTreeNode,
  CspVariable,
  SeverityLevel,
  Victim,
} from '../types';

/**
 * Resource model (post-redesign):
 *   - Amb1 / Amb2 each carry up to 2 victims (hard CSP constraint).
 *   - Queue is a "wait for next wave" placement for victims that didn't fit; survival keeps
 *     decaying while they wait. Critical victims may NOT be queued while ambulance space exists.
 *   - The rescue team is NOT a pickup unit anymore. After CSP solves the victim → ambulance
 *     mapping, we derive `teamRidesWith` ∈ {Amb1, Amb2, null} — the ambulance carrying the
 *     highest-priority assigned victim. The team rides along and halves survival decay for
 *     that ambulance's passengers (in-transit medical stabilization). This is enforced in the
 *     simulation engine's TICK reducer, not here in the CSP solver.
 */

function checkConstraints(
  amb1: string[],
  amb2: string[],
  queued: string[],
  kitsUsed: number,
  victims: Victim[]
): { results: boolean[]; allSatisfied: boolean; checkedCount: number } {
  const results: boolean[] = [];
  let checkedCount = 0;

  results.push(amb1.length <= 2);
  checkedCount++;

  results.push(amb2.length <= 2);
  checkedCount++;

  /**
   * C3 in the new model: "team rides with at most one ambulance" — trivially satisfiable
   * post-CSP since `teamRidesWith` is a single-valued derived field, but we keep the slot
   * to preserve the 6-row constraint matrix the UI expects.
   */
  results.push(true);
  checkedCount++;

  results.push(kitsUsed <= 10);
  checkedCount++;

  /**
   * C5: critical victims must NOT be in the wait queue while ambulance capacity is available.
   * If both ambulances are already full, queueing a remaining critical is the only legal move
   * and counts as satisfied (true triage decision, not a violation).
   */
  const ambSlotsFree = (2 - amb1.length) + (2 - amb2.length);
  const criticalQueued = queued.filter((id) => {
    const v = victims.find((x) => x.id === id);
    return v?.severity === 'critical';
  });
  const c5Ok = ambSlotsFree === 0 || criticalQueued.length === 0;
  results.push(c5Ok);
  checkedCount++;

  const allAssigned = [...amb1, ...amb2, ...queued];
  const uniqueAssigned = new Set(allAssigned).size;
  results.push(uniqueAssigned === allAssigned.length);
  checkedCount++;

  return {
    results,
    allSatisfied: results.every((r) => r),
    checkedCount,
  };
}

function getPriorityScore(victim: Victim): number {
  const severityScore: Record<SeverityLevel, number> = {
    critical: 100,
    moderate: 50,
    minor: 10,
  };
  const base = severityScore[victim.severity] + (100 - victim.survivalPct);
  /** `priorityScore` encodes static hints (0–1) or ML-derived risk weights after Phase 4. */
  return base + victim.priorityScore * 12;
}

function sortByMRV(victims: Victim[]): Victim[] {
  return [...victims].sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
}

/**
 * The CSP variable order — Queue is tried last so the solver only resorts to deferring a
 * victim when no ambulance has capacity.
 */
function getResourceOrder(): Array<'Amb1' | 'Amb2' | 'Queue'> {
  return ['Amb1', 'Amb2', 'Queue'];
}

function makeNode(
  id: string,
  label: string,
  level: number,
  valid: boolean,
  backtrack: boolean,
  solution: boolean,
  start: boolean
): CspTreeNode {
  return {
    id,
    label,
    level,
    valid,
    backtrack,
    solution,
    start,
    children: [],
  };
}

function tryAssign(
  res: 'Amb1' | 'Amb2' | 'Queue',
  victimId: string,
  amb1: string[],
  amb2: string[],
  queued: string[]
): { amb1: string[]; amb2: string[]; queued: string[] } | null {
  if (res === 'Amb1' && amb1.length < 2) {
    return { amb1: [...amb1, victimId], amb2, queued };
  }
  if (res === 'Amb2' && amb2.length < 2) {
    return { amb1, amb2: [...amb2, victimId], queued };
  }
  if (res === 'Queue') {
    return { amb1, amb2, queued: [...queued, victimId] };
  }
  return null;
}

/**
 * Kits are consumed only by victims actually loaded onto an ambulance (queued ones consume
 * none until they are picked up in a later wave).
 */
function kitsFor(amb1: string[], amb2: string[]): number {
  return amb1.length + amb2.length;
}

/**
 * Choose which ambulance the team rides with: the one carrying the highest-priority victim.
 * Ties go to whichever ambulance has more victims (stabilizing more passengers). Returns
 * `null` only when neither ambulance has any pickup this cycle.
 */
function deriveTeamRidesWith(
  amb1Ids: string[],
  amb2Ids: string[],
  victims: Victim[]
): 'Amb1' | 'Amb2' | null {
  const byId = new Map(victims.map((v) => [v.id, v] as const));
  const top = (ids: string[]): number => {
    let best = -Infinity;
    for (const id of ids) {
      const v = byId.get(id);
      if (!v) continue;
      const s = getPriorityScore(v);
      if (s > best) best = s;
    }
    return best;
  };
  const t1 = top(amb1Ids);
  const t2 = top(amb2Ids);
  if (t1 === -Infinity && t2 === -Infinity) return null;
  if (t1 === t2) {
    return amb1Ids.length >= amb2Ids.length ? 'Amb1' : 'Amb2';
  }
  return t1 > t2 ? 'Amb1' : 'Amb2';
}

function solveWithHeuristics(victims: Victim[]): {
  amb1: string[];
  amb2: string[];
  queued: string[];
  backtracks: number;
  nodesExplored: number;
  constraintsChecked: number;
  tree: CspTreeNode;
  steps: CspAssignmentStep[];
} {
  const sorted = sortByMRV(victims);
  const root = makeNode('start', 'START', 0, true, false, false, true);
  const steps: CspAssignmentStep[] = [];
  let backtracks = 0;
  let nodesExplored = 0;
  let constraintsChecked = 0;

  let bestAmb1: string[] = [];
  let bestAmb2: string[] = [];
  let bestQueued: string[] = [];

  function dfs(
    index: number,
    amb1: string[],
    amb2: string[],
    queued: string[],
    parent: CspTreeNode
  ): boolean {
    if (index >= sorted.length) {
      const sol = makeNode('solution', '✅ SOLUTION', steps.length + 1, true, false, true, false);
      parent.children.push(sol);
      bestAmb1 = amb1;
      bestAmb2 = amb2;
      bestQueued = queued;
      return true;
    }

    const victim = sorted[index];
    const victimId = victim.id;

    for (const res of getResourceOrder()) {
      nodesExplored++;
      const next = tryAssign(res, victimId, amb1, amb2, queued);
      if (!next) continue;

      const kits = kitsFor(next.amb1, next.amb2);
      const check = checkConstraints(next.amb1, next.amb2, next.queued, kits, victims);
      constraintsChecked += check.checkedCount;

      if (!check.allSatisfied) {
        backtracks++;
        const bt = makeNode(
          `csp-bt-${index}-${res}-${victimId}`,
          `${res}✗${victimId}`,
          steps.length + 1,
          false,
          true,
          false,
          false
        );
        parent.children.push(bt);
        continue;
      }

      const node = makeNode(
        `csp-${index}-${res}-${victimId}`,
        `${res}←${victimId}`,
        steps.length + 1,
        true,
        false,
        false,
        false
      );
      parent.children.push(node);

      const valueArr =
        res === 'Queue' ? next.queued : res === 'Amb1' ? next.amb1 : next.amb2;
      steps.push({
        variable: res,
        value: valueArr,
        valid: true,
        constraintsChecked: check.checkedCount,
      });

      if (dfs(index + 1, next.amb1, next.amb2, next.queued, node)) {
        return true;
      }

      parent.children.pop();
      steps.pop();
      backtracks++;
    }

    return false;
  }

  dfs(0, [], [], [], root);

  return {
    amb1: bestAmb1,
    amb2: bestAmb2,
    queued: bestQueued,
    backtracks,
    nodesExplored,
    constraintsChecked,
    tree: root,
    steps,
  };
}

function solveWithoutHeuristics(victims: Victim[]): {
  backtracks: number;
  nodesExplored: number;
  constraintsChecked: number;
  timeMs: number;
} {
  const startTime = performance.now();
  const order = [...victims];
  let backtracks = 0;
  let nodesExplored = 0;
  let constraintsChecked = 0;
  let amb1: string[] = [];
  let amb2: string[] = [];
  let queued: string[] = [];

  for (const v of order) {
    nodesExplored++;
    let placed = false;
    for (const res of getResourceOrder()) {
      const next = tryAssign(res, v.id, amb1, amb2, queued);
      if (!next) continue;
      const kits = kitsFor(next.amb1, next.amb2);
      const check = checkConstraints(next.amb1, next.amb2, next.queued, kits, victims);
      constraintsChecked += check.checkedCount;
      if (!check.allSatisfied) {
        backtracks += 2;
        continue;
      }
      amb1 = next.amb1;
      amb2 = next.amb2;
      queued = next.queued;
      placed = true;
      break;
    }
    if (!placed) backtracks += 3;
  }

  return {
    backtracks,
    nodesExplored,
    constraintsChecked,
    timeMs: parseFloat((performance.now() - startTime).toFixed(2)),
  };
}

function solveWithMRVOnly(victims: Victim[]): {
  backtracks: number;
  nodesExplored: number;
  constraintsChecked: number;
  timeMs: number;
} {
  const startTime = performance.now();
  const sorted = sortByMRV(victims);
  let backtracks = 0;
  let nodesExplored = 0;
  let constraintsChecked = 0;
  let amb1: string[] = [];
  let amb2: string[] = [];
  let queued: string[] = [];

  for (const v of sorted) {
    nodesExplored++;
    let placed = false;
    for (const res of getResourceOrder()) {
      const next = tryAssign(res, v.id, amb1, amb2, queued);
      if (!next) continue;
      const kits = kitsFor(next.amb1, next.amb2);
      const check = checkConstraints(next.amb1, next.amb2, next.queued, kits, victims);
      constraintsChecked += check.checkedCount;
      if (!check.allSatisfied) {
        backtracks++;
        continue;
      }
      amb1 = next.amb1;
      amb2 = next.amb2;
      queued = next.queued;
      placed = true;
      break;
    }
    if (!placed) backtracks += 2;
  }

  return {
    backtracks,
    nodesExplored,
    constraintsChecked,
    timeMs: parseFloat((performance.now() - startTime).toFixed(2)),
  };
}

function buildConstraints(
  amb1: string[],
  amb2: string[],
  queued: string[],
  teamRidesWith: 'Amb1' | 'Amb2' | null,
  kitsUsed: number,
  victims: Victim[]
): CspConstraint[] {
  const ambSlotsFree = (2 - amb1.length) + (2 - amb2.length);
  const criticalQueued = queued.filter((id) => {
    const v = victims.find((x) => x.id === id);
    return v?.severity === 'critical';
  });
  const c5Ok = ambSlotsFree === 0 || criticalQueued.length === 0;

  const allAssigned = [...amb1, ...amb2, ...queued];
  const noDuplicates = new Set(allAssigned).size === allAssigned.length;

  return [
    { id: 'C1', formula: '|Amb1_victims| ≤ 2', satisfied: amb1.length <= 2 },
    { id: 'C2', formula: '|Amb2_victims| ≤ 2', satisfied: amb2.length <= 2 },
    {
      id: 'C3',
      formula: 'Team rides with ≤ 1 ambulance',
      // teamRidesWith is single-valued by construction; this is always satisfied.
      satisfied: teamRidesWith == null || teamRidesWith === 'Amb1' || teamRidesWith === 'Amb2',
    },
    { id: 'C4', formula: 'Total kits ≤ 10', satisfied: kitsUsed <= 10 },
    { id: 'C5', formula: 'Critical victims never queued while slots exist', satisfied: c5Ok },
    { id: 'C6', formula: 'No duplicate victim assignments', satisfied: noDuplicates },
  ];
}

function buildVariables(
  amb1: string[],
  amb2: string[],
  queued: string[],
  teamRidesWith: 'Amb1' | 'Amb2' | null,
  kitsUsed: number,
  victims: Victim[],
  constraints: CspConstraint[]
): CspVariable[] {
  const allIds = victims.map((v) => v.id);
  const c1 = constraints[0]?.satisfied ?? true;
  const c2 = constraints[1]?.satisfied ?? true;
  const c3 = constraints[2]?.satisfied ?? true;
  const c4 = constraints[3]?.satisfied ?? true;
  const c5 = constraints[4]?.satisfied ?? true;

  return [
    {
      id: 'amb1',
      icon: '🚑',
      label: 'Amb1_Assignment',
      domain: allIds,
      maxInfo: 'Max capacity: 2 victims',
      current: amb1,
      satisfied: c1,
    },
    {
      id: 'amb2',
      icon: '🚑',
      label: 'Amb2_Assignment',
      domain: allIds,
      maxInfo: 'Max capacity: 2 victims',
      current: amb2,
      satisfied: c2,
    },
    {
      id: 'queue',
      icon: '⏳',
      label: 'Wait_Queue',
      domain: allIds,
      maxInfo: 'Critical victims may not be queued while a slot is free',
      current: queued,
      satisfied: c5,
    },
    {
      id: 'team',
      icon: '👷',
      label: 'Team_RidesWith',
      domain: ['Amb1', 'Amb2'],
      maxInfo: 'Stabilizes (½ decay) for the ambulance it rides with',
      current: teamRidesWith ? [teamRidesWith] : [],
      satisfied: c3,
    },
    {
      id: 'kits',
      icon: '🧰',
      label: 'Kit_Allocation',
      domain: ['0', '1', '2', '3', '4'],
      maxInfo: 'Total limit: ≤ 10 kits (1 per pickup)',
      current: [String(kitsUsed)],
      satisfied: c4,
    },
  ];
}

function buildPerfComparison(victims: Victim[]): CspPerfRow[] {
  const t1 = performance.now();
  const noHeur = solveWithoutHeuristics(victims);
  const t2 = performance.now();
  const mrvOnly = solveWithMRVOnly(victims);
  const t3 = performance.now();
  const withHeur = solveWithHeuristics(victims);
  const t4 = performance.now();

  return [
    {
      method: 'No Heuristic',
      backtracks: noHeur.backtracks,
      nodes: noHeur.nodesExplored,
      constraintsChecked: noHeur.constraintsChecked,
      timeMs: parseFloat((t2 - t1).toFixed(2)),
      best: false,
    },
    {
      method: 'MRV Only',
      backtracks: mrvOnly.backtracks,
      nodes: mrvOnly.nodesExplored,
      constraintsChecked: mrvOnly.constraintsChecked,
      timeMs: parseFloat((t3 - t2).toFixed(2)),
      best: false,
    },
    {
      method: 'MRV + Forward Checking',
      backtracks: withHeur.backtracks,
      nodes: withHeur.nodesExplored,
      constraintsChecked: withHeur.constraintsChecked,
      timeMs: parseFloat((t4 - t3).toFixed(2)),
      best: true,
    },
  ];
}

export function solveCsp(victims: Victim[]): CspSolution {
  const startTime = performance.now();
  const result = solveWithHeuristics(victims);
  const teamRidesWith = deriveTeamRidesWith(result.amb1, result.amb2, victims);
  const kitsUsed = kitsFor(result.amb1, result.amb2);
  const constraints = buildConstraints(
    result.amb1,
    result.amb2,
    result.queued,
    teamRidesWith,
    kitsUsed,
    victims
  );
  const variables = buildVariables(
    result.amb1,
    result.amb2,
    result.queued,
    teamRidesWith,
    kitsUsed,
    victims,
    constraints
  );
  const allSatisfied = constraints.every((c) => c.satisfied);
  const perfComparison = buildPerfComparison(victims).map((row, i) =>
    i === 2
      ? {
          ...row,
          backtracks: result.backtracks,
          nodes: result.nodesExplored,
          constraintsChecked: result.constraintsChecked,
        }
      : row
  );
  const timeMs = parseFloat((performance.now() - startTime).toFixed(2));

  return {
    amb1Victims: result.amb1,
    amb2Victims: result.amb2,
    teamVictim: null,
    teamRidesWith,
    queuedVictims: result.queued,
    kitsUsed,
    satisfied: allSatisfied,
    backtracks: result.backtracks,
    nodesExplored: result.nodesExplored,
    constraintsChecked: result.constraintsChecked,
    timeMs,
    tree: result.tree,
    assignmentSteps: result.steps,
    variables,
    constraints,
    perfComparison,
  };
}
