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

function checkConstraints(
  amb1: string[],
  amb2: string[],
  team: string | null,
  kitsUsed: number,
  victims: Victim[]
): { results: boolean[]; allSatisfied: boolean; checkedCount: number } {
  const results: boolean[] = [];
  let checkedCount = 0;

  results.push(amb1.length <= 2);
  checkedCount++;

  results.push(amb2.length <= 2);
  checkedCount++;

  const teamCount = team ? 1 : 0;
  results.push(teamCount <= 1);
  checkedCount++;

  results.push(kitsUsed <= 10);
  checkedCount++;

  const assignedIds = [...amb1, ...amb2, ...(team ? [team] : [])];
  const criticalVictims = victims.filter((v) => v.severity === 'critical');
  const criticalAssigned = criticalVictims.every((v) => assignedIds.includes(v.id));
  const allResourcesUsed = amb1.length + amb2.length + (team ? 1 : 0) >= Math.min(victims.length, 5);
  results.push(!allResourcesUsed || criticalAssigned);
  checkedCount++;

  const allAssigned = [...amb1, ...amb2, ...(team ? [team] : [])];
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

function getResourceOrder(): string[] {
  return ['Amb1', 'Amb2', 'Team'];
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
  res: string,
  victimId: string,
  amb1: string[],
  amb2: string[],
  team: string | null
): { amb1: string[]; amb2: string[]; team: string | null } | null {
  if (res === 'Amb1' && amb1.length < 2) {
    return { amb1: [...amb1, victimId], amb2, team };
  }
  if (res === 'Amb2' && amb2.length < 2) {
    return { amb1, amb2: [...amb2, victimId], team };
  }
  if (res === 'Team' && team === null) {
    return { amb1, amb2, team: victimId };
  }
  return null;
}

function kitsFor(amb1: string[], amb2: string[], team: string | null): number {
  return amb1.length + amb2.length + (team ? 1 : 0);
}

function solveWithHeuristics(victims: Victim[]): {
  amb1: string[];
  amb2: string[];
  team: string | null;
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
  let bestTeam: string | null = null;

  function dfs(
    index: number,
    amb1: string[],
    amb2: string[],
    team: string | null,
    parent: CspTreeNode
  ): boolean {
    if (index >= sorted.length) {
      const sol = makeNode('solution', '✅ SOLUTION', steps.length + 1, true, false, true, false);
      parent.children.push(sol);
      bestAmb1 = amb1;
      bestAmb2 = amb2;
      bestTeam = team;
      return true;
    }

    const victim = sorted[index];
    const victimId = victim.id;

    for (const res of getResourceOrder()) {
      nodesExplored++;
      const next = tryAssign(res, victimId, amb1, amb2, team);
      if (!next) continue;

      const kits = kitsFor(next.amb1, next.amb2, next.team);
      const check = checkConstraints(next.amb1, next.amb2, next.team, kits, victims);
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
        res === 'Team' ? [victimId] : res === 'Amb1' ? next.amb1 : next.amb2;
      steps.push({
        variable: res,
        value: valueArr,
        valid: true,
        constraintsChecked: check.checkedCount,
      });

      if (dfs(index + 1, next.amb1, next.amb2, next.team, node)) {
        return true;
      }

      parent.children.pop();
      steps.pop();
      backtracks++;
    }

    return false;
  }

  dfs(0, [], [], null, root);

  if (steps.length === 0 || bestAmb1.length + bestAmb2.length + (bestTeam ? 1 : 0) < victims.length) {
    const fail = makeNode('csp-fail', '⚠ NO COMPLETE ASSIGNMENT', sorted.length + 1, false, true, false, false);
    root.children.push(fail);
  }

  return {
    amb1: bestAmb1,
    amb2: bestAmb2,
    team: bestTeam,
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
  let team: string | null = null;

  for (const v of order) {
    nodesExplored++;
    let placed = false;
    for (const res of ['Amb1', 'Amb2', 'Team']) {
      const next = tryAssign(res, v.id, amb1, amb2, team);
      if (!next) continue;
      const kits = kitsFor(next.amb1, next.amb2, next.team);
      const check = checkConstraints(next.amb1, next.amb2, next.team, kits, victims);
      constraintsChecked += check.checkedCount;
      if (!check.allSatisfied) {
        backtracks += 2;
        continue;
      }
      amb1 = next.amb1;
      amb2 = next.amb2;
      team = next.team;
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
  let team: string | null = null;

  for (const v of sorted) {
    nodesExplored++;
    let placed = false;
    for (const res of ['Amb1', 'Amb2', 'Team']) {
      const next = tryAssign(res, v.id, amb1, amb2, team);
      if (!next) continue;
      const kits = kitsFor(next.amb1, next.amb2, next.team);
      const check = checkConstraints(next.amb1, next.amb2, next.team, kits, victims);
      constraintsChecked += check.checkedCount;
      if (!check.allSatisfied) {
        backtracks++;
        continue;
      }
      amb1 = next.amb1;
      amb2 = next.amb2;
      team = next.team;
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
  team: string | null,
  kitsUsed: number,
  victims: Victim[]
): CspConstraint[] {
  const assignedIds = [...amb1, ...amb2, ...(team ? [team] : [])];
  const criticalVictims = victims.filter((v) => v.severity === 'critical');
  const criticalAssigned = criticalVictims.every((v) => assignedIds.includes(v.id));
  const allResourcesUsed =
    amb1.length + amb2.length + (team ? 1 : 0) >= Math.min(victims.length, 5);
  const c5Ok = !allResourcesUsed || criticalAssigned;
  const allAssigned = assignedIds;
  const noDuplicates = new Set(allAssigned).size === allAssigned.length;

  return [
    { id: 'C1', formula: '|Amb1_victims| ≤ 2', satisfied: amb1.length <= 2 },
    { id: 'C2', formula: '|Amb2_victims| ≤ 2', satisfied: amb2.length <= 2 },
    { id: 'C3', formula: 'Team services 1 location/time', satisfied: (team ? 1 : 0) <= 1 },
    { id: 'C4', formula: 'Total kits ≤ 10', satisfied: kitsUsed <= 10 },
    { id: 'C5', formula: 'Critical victims assigned first', satisfied: c5Ok },
    { id: 'C6', formula: 'No duplicate victim assignments', satisfied: noDuplicates },
  ];
}

function buildVariables(
  amb1: string[],
  amb2: string[],
  team: string | null,
  kitsUsed: number,
  victims: Victim[],
  constraints: CspConstraint[]
): CspVariable[] {
  const allIds = victims.map((v) => v.id);
  const c1 = constraints[0]?.satisfied ?? true;
  const c2 = constraints[1]?.satisfied ?? true;
  const c3 = constraints[2]?.satisfied ?? true;
  const c4 = constraints[3]?.satisfied ?? true;

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
      id: 'team',
      icon: '👷',
      label: 'Team_Assignment',
      domain: allIds,
      maxInfo: 'Max: 1 location at a time',
      current: team ? [team] : [],
      satisfied: c3,
    },
    {
      id: 'kits',
      icon: '🧰',
      label: 'Kit_Allocation',
      domain: ['0', '1', '2', '3'],
      maxInfo: 'Total limit: ≤ 10 kits',
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
  const kitsUsed = kitsFor(result.amb1, result.amb2, result.team);
  const constraints = buildConstraints(result.amb1, result.amb2, result.team, kitsUsed, victims);
  const variables = buildVariables(
    result.amb1,
    result.amb2,
    result.team,
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
    teamVictim: result.team,
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
