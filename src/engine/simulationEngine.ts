import { useCallback, useMemo, useReducer } from 'react';
import type {
  Ambulance,
  DecisionLogEntry,
  GridCell,
  KPI,
  LocalSearch,
  MLModel,
  ObjectivePriority,
  RescueTeam,
  SearchAlgorithm,
  SimulationActions,
  SimSpeed,
  SimulationState,
  Toast,
  Victim,
} from '../types';
import { evaluateFuzzyRouting } from './fuzzyLogic';
import { solveCsp } from './csp';
import {
  extractVictimFeatures,
  predictWithModel,
  runFullMlEvaluation,
  survivalEstimateFromProbs,
} from './mlRiskPipeline';
import { formatPathOptimalityKpi, pathOptimalityScore } from '../utils/analyticsLive';
import { runLocalSearch } from './localSearch';
import { runAllAlgorithms, runSearch } from './search';
import {
  generateGrid,
  generateInitialAmbulances,
  generateInitialRescueTeam,
  generateInitialVictims,
} from './gridGenerator';
import { formatTime, generateId } from '../utils/formatters';

export type { SimulationActions } from '../types';

type SimAction =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESET'; payload: SimulationState }
  | { type: 'SET_SPEED'; payload: SimSpeed }
  | { type: 'SET_SEARCH'; payload: SearchAlgorithm }
  | { type: 'SET_LOCAL_SEARCH'; payload: LocalSearch }
  | { type: 'SET_ML_MODEL'; payload: MLModel }
  | { type: 'SET_OBJECTIVE'; payload: ObjectivePriority }
  | { type: 'TOGGLE_FUZZY' }
  | { type: 'TRIGGER_AFTERSHOCK'; payload: { row: number; col: number } }
  | { type: 'BLOCK_ROAD_AT'; payload: { row: number; col: number } }
  | { type: 'ADD_VICTIM_AT'; payload: { row: number; col: number } }
  | { type: 'SPREAD_FIRE_FROM'; payload: { row: number; col: number } }
  | { type: 'APPLY_REPLAN' }
  | { type: 'CLEAR_LOG' }
  | { type: 'DISMISS_TOAST'; payload: string }
  | { type: 'TICK' }
  | { type: 'RUN_SEARCH_WITH_ALGO'; payload: SearchAlgorithm }
  | { type: 'RUN_CSP' }
  | { type: 'RUN_ML_EVAL' };

function searchAlgoLabel(a: SearchAlgorithm): string {
  switch (a) {
    case 'BFS':
      return 'BFS';
    case 'DFS':
      return 'DFS';
    case 'Greedy':
      return 'Greedy';
    case 'Astar':
      return 'A*';
    default: {
      const _e: never = a;
      return _e;
    }
  }
}

function fuzzyPlanningLogEntries(
  elapsedSeconds: number,
  snapshot: SimulationState['fuzzySnapshot']
): DecisionLogEntry[] {
  if (!snapshot) return [];
  const rules =
    snapshot.firedRules.length > 0
      ? snapshot.firedRules.slice(0, 4).join(' · ')
      : '(aggregated membership blend)';
  return [
    {
      id: generateId(),
      timestamp: formatTime(elapsedSeconds),
      text: `◇ Fuzzy routing — ${snapshot.explanation} | ${rules}`,
      type: 'info',
    },
  ];
}

function objectiveLabel(o: ObjectivePriority): string {
  switch (o) {
    case 'MinimizeTime':
      return 'Minimize Time';
    case 'MinimizeRisk':
      return 'Minimize Risk';
    case 'Balanced':
      return 'Balanced';
    default: {
      const _e: never = o;
      return _e;
    }
  }
}

function collectRouteCells(
  ambulances: Ambulance[],
  team: RescueTeam
): Array<{ row: number; col: number }> {
  const out: Array<{ row: number; col: number }> = [];
  for (const a of ambulances) {
    out.push(...a.route);
  }
  out.push(...team.route);
  return out;
}

function computeRiskExposureScore(
  grid: GridCell[][],
  ambulances: Ambulance[],
  team: RescueTeam
): number {
  const seen = new Set<string>();
  let sum = 0;
  for (const { row, col } of collectRouteCells(ambulances, team)) {
    const k = `${row}-${col}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const cell = grid[row]?.[col];
    if (cell) sum += cell.risk;
  }
  return Math.round(sum * 100) / 100;
}

function computeResourceUtilization(
  ambulances: Ambulance[],
  team: RescueTeam
): number {
  const total = ambulances.length + 1;
  let active = 0;
  for (const a of ambulances) {
    if (a.status !== 'idle') active += 1;
  }
  if (team.status !== 'idle') active += 1;
  return Math.round((active / total) * 10000) / 100;
}

function computeKpis(state: SimulationState): KPI[] {
  const saved = state.victims.filter((v) => v.status === 'rescued').length;
  const total = state.victims.length;
  const rescuedWithEta = state.victims.filter(
    (v) => v.status === 'rescued' && v.eta !== null
  );
  const avgEta =
    rescuedWithEta.length === 0
      ? 0
      : rescuedWithEta.reduce((acc, v) => acc + (v.eta as number), 0) /
        rescuedWithEta.length;

  const riskExposure = computeRiskExposureScore(
    state.grid,
    state.ambulances,
    state.rescueTeam
  );
  const resUtil = computeResourceUtilization(
    state.ambulances,
    state.rescueTeam
  );

  const pathOpt = pathOptimalityScore(state.allAlgoComparisons, state.searchAlgorithm);

  return [
    {
      icon: '👥',
      label: 'Victims Saved',
      value: `${saved} / ${total}`,
      color: 'amber',
    },
    {
      icon: '⏱',
      label: 'Avg Rescue Time',
      value: avgEta === 0 ? '—' : `${Math.round(avgEta * 10) / 10}m`,
      color: 'green',
    },
    {
      icon: '📐',
      label: 'Path Optimality',
      value: formatPathOptimalityKpi(pathOpt),
      color: 'blue',
    },
    {
      icon: '⚠',
      label: 'Risk Exposure',
      value: `${Math.round(riskExposure)} pts`,
      color: 'red',
    },
    {
      icon: '🔧',
      label: 'Resource Util',
      value: `${Math.round(resUtil)}%`,
      color: 'green',
    },
    {
      icon: '🔄',
      label: 'Replan Events',
      value: String(state.replanCount),
      color: 'amber',
    },
  ];
}

function runSearchPlanningPatch(
  state: SimulationState,
  algo: SearchAlgorithm
): Pick<
  SimulationState,
  'searchResults' | 'localSearchResult' | 'allAlgoComparisons' | 'fuzzySnapshot'
> {
  const grid = state.grid;
  const fuzzyEval = evaluateFuzzyRouting(state);
  const fuzzyRiskStep = state.fuzzyLogicEnabled ? fuzzyEval.riskStepMultiplier : 1;
  const fuzzyHeuristic = state.fuzzyLogicEnabled ? fuzzyEval.heuristicRiskWeight : 1;
  const fuzzySnapshot = state.fuzzyLogicEnabled ? fuzzyEval : null;

  const searchResult = runSearch(
    algo,
    grid,
    0,
    0,
    0,
    17,
    state.objectivePriority,
    fuzzyRiskStep,
    fuzzyHeuristic
  );
  const pathForLocal =
    searchResult.found && searchResult.path.length > 0 ? searchResult.path : [];
  const localRes = runLocalSearch(
    state.localSearch,
    grid,
    pathForLocal,
    0,
    17,
    state.objectivePriority,
    fuzzyRiskStep
  );
  const allAlgoComparisons = runAllAlgorithms(
    grid,
    state.objectivePriority,
    fuzzyRiskStep,
    fuzzyHeuristic
  );

  return {
    searchResults: searchResult,
    localSearchResult: localRes,
    allAlgoComparisons,
    fuzzySnapshot,
  };
}

/**
 * Phase 8: after grid / victim roster changes, append event logs and — if the sim is live —
 * rerun search + local polish so routes and `allAlgoComparisons` match the new environment
 * (then CSP runs on the returned state).
 */
function appendEventLogsAndMaybeRefreshRoutes(
  state: SimulationState,
  eventLogs: DecisionLogEntry[]
): SimulationState {
  let next: SimulationState = {
    ...state,
    decisionLog: [...state.decisionLog, ...eventLogs],
  };
  if (next.running && !next.paused) {
    const planning = runSearchPlanningPatch(next, next.searchAlgorithm);
    const routeLog: DecisionLogEntry = {
      id: generateId(),
      timestamp: formatTime(next.elapsedSeconds),
      text: planning.searchResults?.found
        ? `⚙ Environment replan — ${searchAlgoLabel(planning.searchResults.algorithm)} ` +
          `cost=${planning.searchResults.pathCost.toFixed(1)} ` +
          `risk=${planning.searchResults.riskScore.toFixed(2)} · ${objectiveLabel(next.objectivePriority)}`
        : `⚙ Environment replan — ${searchAlgoLabel(next.searchAlgorithm)} (no path found)`,
      type: 'normal',
    };
    next = {
      ...next,
      ...planning,
      decisionLog: [
        ...next.decisionLog,
        routeLog,
        ...fuzzyPlanningLogEntries(next.elapsedSeconds, planning.fuzzySnapshot),
      ],
    };
  }
  return recomputeDerived(next);
}

function recomputeDerived(state: SimulationState): SimulationState {
  const victimsSaved = state.victims.filter((v) => v.status === 'rescued').length;
  const rescuedWithEta = state.victims.filter(
    (v) => v.status === 'rescued' && v.eta !== null
  );
  const avgRescueTime =
    rescuedWithEta.length === 0
      ? 0
      : rescuedWithEta.reduce((acc, v) => acc + (v.eta as number), 0) /
        rescuedWithEta.length;

  return {
    ...state,
    victimsSaved,
    avgRescueTime,
    riskExposureScore: computeRiskExposureScore(
      state.grid,
      state.ambulances,
      state.rescueTeam
    ),
    resourceUtilization: computeResourceUtilization(
      state.ambulances,
      state.rescueTeam
    ),
    kpis: computeKpis(state),
  };
}

function cloneGrid(grid: GridCell[][]): GridCell[][] {
  return grid.map((row) => row.map((c) => ({ ...c })));
}

function cloneVictim(v: Victim): Victim {
  return { ...v };
}

function cloneAmbulance(a: Ambulance): Ambulance {
  return {
    ...a,
    assignedVictims: [...a.assignedVictims],
    route: a.route.map((p) => ({ ...p })),
  };
}

function cloneTeam(t: RescueTeam): RescueTeam {
  return {
    ...t,
    route: t.route.map((p) => ({ ...p })),
  };
}

function mlModelLabel(m: SimulationState['mlModel']): string {
  switch (m) {
    case 'kNN':
      return 'kNN';
    case 'NaiveBayes':
      return 'Naive Bayes';
    case 'MLP':
      return 'MLP';
    default: {
      const _e: never = m;
      return _e;
    }
  }
}

function buildVictimsForCspWithOptionalMl(state: SimulationState): {
  victimsForCsp: Victim[];
  victimMlEstimates: SimulationState['victimMlEstimates'];
  mlLogText: string | null;
  fuzzyLogText: string | null;
} {
  const snap = state.mlEvalSnapshot;
  const bumpFuzzy = state.fuzzySnapshot?.cspPriorityBump ?? 0;
  const victimMlEstimates: SimulationState['victimMlEstimates'] = {};
  const parts: string[] = [];

  if (!snap && bumpFuzzy === 0) {
    return {
      victimsForCsp: state.victims,
      victimMlEstimates: {},
      mlLogText: null,
      fuzzyLogText: null,
    };
  }

  if (!snap) {
    const victimsForCsp = state.victims.map((v) => {
      if (v.status === 'rescued' || v.status === 'lost') {
        return v;
      }
      return { ...v, priorityScore: v.priorityScore + bumpFuzzy };
    });
    const fuzzyLogText =
      state.fuzzySnapshot != null
        ? `◇ Fuzzy CSP ordering — ${state.fuzzySnapshot.explanation}`
        : null;
    return { victimsForCsp, victimMlEstimates: {}, mlLogText: null, fuzzyLogText };
  }

  const victimsForCsp = state.victims.map((v) => {
    if (v.status === 'rescued' || v.status === 'lost') {
      return v;
    }
    const feats = extractVictimFeatures(state.grid, v);
    const out = predictWithModel(snap, state.mlModel, feats);
    const survivalEstimatePct = survivalEstimateFromProbs(out.probs);
    victimMlEstimates[v.id] = {
      predictedClass: out.predictedClass,
      probs: out.probs,
      survivalEstimatePct,
    };
    const mlBoost = out.probs[2] * 0.55 + out.probs[1] * 0.22 + out.probs[0] * 0.05;
    const tag = ['LR', 'MR', 'HR'][out.predictedClass];
    parts.push(`${v.id}→${tag}`);
    return { ...v, priorityScore: mlBoost + bumpFuzzy };
  });
  const mlLogText =
    `🤖 ML(${mlModelLabel(state.mlModel)}) risk on live grid — ` +
    parts.join(' ') +
    ` | CSP MRV order uses these scores (${objectiveLabel(state.objectivePriority)})`;
  const fuzzyLogText =
    bumpFuzzy > 0 && state.fuzzySnapshot
      ? `◇ Fuzzy adds +${bumpFuzzy.toFixed(3)} to ML MRV scores — ${state.fuzzySnapshot.explanation}`
      : null;
  return { victimsForCsp, victimMlEstimates, mlLogText, fuzzyLogText };
}

function etaForAmbList(
  state: SimulationState,
  victimId: string,
  orderedIds: string[],
  amb: Ambulance,
  byId: Map<string, Victim>
): number | null {
  const idx = orderedIds.indexOf(victimId);
  if (idx < 0) return null;
  if (idx === 0) {
    return amb.route.length > 1 ? amb.route.length - 1 : null;
  }
  const v0 = byId.get(orderedIds[0]);
  if (!v0) return null;
  let total = amb.route.length > 1 ? amb.route.length - 1 : 0;
  let prev = v0;
  for (let j = 1; j <= idx; j++) {
    const cur = byId.get(orderedIds[j]);
    if (!cur) return null;
    const leg = planRoute(state, prev.row, prev.col, cur.row, cur.col);
    total += leg.length > 1 ? leg.length - 1 : 0;
    prev = cur;
  }
  return total > 0 ? total : null;
}

function applyCspSolution(state: SimulationState): SimulationState {
  const { victimsForCsp, victimMlEstimates, mlLogText, fuzzyLogText } =
    buildVictimsForCspWithOptionalMl(state);
  const solution = solveCsp(victimsForCsp);

  const assignedVictims = state.victims.map((v) => {
    if (v.status === 'rescued' || v.status === 'lost') {
      return v;
    }
    let next: Victim;
    if (solution.amb1Victims.includes(v.id)) {
      next = { ...v, assignedTo: 'Amb1', status: 'en-route' as const, eta: null };
    } else if (solution.amb2Victims.includes(v.id)) {
      next = { ...v, assignedTo: 'Amb2', status: 'en-route' as const, eta: null };
    } else if (solution.teamVictim === v.id) {
      next = { ...v, assignedTo: 'Team', status: 'en-route' as const, eta: null };
    } else {
      next = { ...v, assignedTo: null, status: 'waiting' as const, eta: null };
    }
    return { ...next, priorityScore: v.priorityScore };
  });

  const victimsById = new Map(assignedVictims.map((v) => [v.id, v] as const));

  const updatedAmbs = state.ambulances.map((amb) => {
    const assigned = amb.id === 'Amb1' ? solution.amb1Victims : solution.amb2Victims;
    const firstTarget = assigned[0] ? victimsById.get(assigned[0]) : null;
    const route =
      firstTarget != null
        ? planRoute(state, amb.currentRow, amb.currentCol, firstTarget.row, firstTarget.col)
        : [];
    return {
      ...amb,
      assignedVictims: assigned,
      route,
      eta: route.length > 1 ? route.length - 1 : null,
      status: assigned.length > 0 ? ('en-route' as const) : ('idle' as const),
    };
  });

  const amb1 = updatedAmbs.find((a) => a.id === 'Amb1')!;
  const amb2 = updatedAmbs.find((a) => a.id === 'Amb2')!;

  const teamTarget = solution.teamVictim ? victimsById.get(solution.teamVictim) : null;
  const teamRoute =
    teamTarget != null
      ? planRoute(
          state,
          state.rescueTeam.currentRow,
          state.rescueTeam.currentCol,
          teamTarget.row,
          teamTarget.col
        )
      : [];
  const updatedTeam: RescueTeam = {
    ...state.rescueTeam,
    assignedVictim: solution.teamVictim,
    route: teamRoute,
    eta: teamRoute.length > 1 ? teamRoute.length - 1 : null,
    status: solution.teamVictim ? ('en-route' as const) : ('idle' as const),
  };

  const updatedVictims = assignedVictims.map((v) => {
    if (v.status === 'rescued' || v.status === 'lost') return v;
    if (v.status === 'waiting' || v.assignedTo == null) {
      return { ...v, eta: null };
    }
    if (v.assignedTo === 'Amb1') {
      const eta = etaForAmbList(state, v.id, solution.amb1Victims, amb1, victimsById);
      return { ...v, eta };
    }
    if (v.assignedTo === 'Amb2') {
      const eta = etaForAmbList(state, v.id, solution.amb2Victims, amb2, victimsById);
      return { ...v, eta };
    }
    if (v.assignedTo === 'Team') {
      const eta = updatedTeam.route.length > 1 ? updatedTeam.route.length - 1 : null;
      return { ...v, eta };
    }
    return v;
  });

  const logLines: DecisionLogEntry[] = [];
  if (fuzzyLogText) {
    logLines.push({
      id: generateId(),
      timestamp: formatTime(state.elapsedSeconds),
      text: fuzzyLogText,
      type: 'info',
    });
  }
  if (mlLogText) {
    logLines.push({
      id: generateId(),
      timestamp: formatTime(state.elapsedSeconds),
      text: mlLogText,
      type: 'info',
    });
  }
  logLines.push({
    id: generateId(),
    timestamp: formatTime(state.elapsedSeconds),
    text:
      `⚙ CSP solved — Amb1→{${solution.amb1Victims.join(',')}} ` +
      `Amb2→{${solution.amb2Victims.join(',')}} ` +
      `Team→{${solution.teamVictim ?? '—'}} | backtracks: ${solution.backtracks}`,
    type: 'info',
  });

  return recomputeDerived({
    ...state,
    cspSolution: solution,
    ambulances: updatedAmbs,
    victims: updatedVictims,
    rescueTeam: updatedTeam,
    currentRouteAmb1: updatedAmbs.find((a) => a.id === 'Amb1')?.route ?? [],
    currentRouteAmb2: updatedAmbs.find((a) => a.id === 'Amb2')?.route ?? [],
    currentRouteTeam: updatedTeam.route,
    victimMlEstimates,
    decisionLog: [...state.decisionLog, ...logLines],
  });
}

function buildInitialState(): SimulationState {
  const grid = generateGrid();
  const victims = generateInitialVictims().map(cloneVictim);
  const ambulances = generateInitialAmbulances().map(cloneAmbulance);
  const rescueTeam = cloneTeam(generateInitialRescueTeam());
  const mlEvalSnapshot = runFullMlEvaluation();

  const base: SimulationState = {
    running: false,
    paused: false,
    speed: 'Normal',
    elapsedSeconds: 0,
    searchAlgorithm: 'Astar',
    localSearch: 'SimulatedAnnealing',
    mlModel: 'MLP',
    objectivePriority: 'MinimizeRisk',
    fuzzyLogicEnabled: true,
    grid,
    victims,
    ambulances,
    rescueTeam,
    decisionLog: [],
    toasts: [],
    kpis: [],
    replanCount: 0,
    victimsSaved: 0,
    avgRescueTime: 0,
    riskExposureScore: 0,
    resourceUtilization: 0,
    nextVictimSeq: 6,
    searchResults: null,
    allAlgoComparisons: [],
    localSearchResult: null,
    currentRouteAmb1: [],
    currentRouteAmb2: [],
    currentRouteTeam: [],
    cspSolution: null,
    mlEvalSnapshot,
    victimMlEstimates: {},
    fuzzySnapshot: null,
  };
  return recomputeDerived(base);
}

/** Passable grid cell of type `road` only (baseline roads for mutations). */
function isPassablePlainRoad(cell: GridCell): boolean {
  return cell.passable && cell.type === 'road';
}

function isPassableRoadCell(cell: GridCell): boolean {
  return cell.passable && cell.type === 'road';
}

function pickRandomIndices<T>(arr: T[], count: number, rng: () => number): number[] {
  if (arr.length === 0 || count <= 0) return [];
  const copy = arr.map((_, i) => i);
  const picked: number[] = [];
  for (let k = 0; k < count && copy.length > 0; k++) {
    const idx = Math.floor(rng() * copy.length);
    picked.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return picked;
}

function neighbors4(r: number, c: number): Array<{ row: number; col: number }> {
  return [
    { row: r - 1, col: c },
    { row: r + 1, col: c },
    { row: r, col: c - 1 },
    { row: r, col: c + 1 },
  ];
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 18 && col >= 0 && col < 18;
}

function advancePositionOnRoute(
  currentRow: number,
  currentCol: number,
  route: Array<{ row: number; col: number }>
): { row: number; col: number } {
  if (route.length === 0) return { row: currentRow, col: currentCol };
  const idx = route.findIndex((p) => p.row === currentRow && p.col === currentCol);
  if (idx === -1) return route[0];
  if (idx >= route.length - 1) return route[idx];
  return route[idx + 1];
}

function advanceResourcesOneStep(state: SimulationState): Pick<SimulationState, 'ambulances' | 'rescueTeam'> {
  const ambulances = state.ambulances.map((amb) => {
    if (amb.status === 'idle') return amb;
    const next = advancePositionOnRoute(amb.currentRow, amb.currentCol, amb.route);
    return { ...amb, currentRow: next.row, currentCol: next.col };
  });
  const rescueTeam =
    state.rescueTeam.status === 'idle'
      ? state.rescueTeam
      : (() => {
          const next = advancePositionOnRoute(
            state.rescueTeam.currentRow,
            state.rescueTeam.currentCol,
            state.rescueTeam.route
          );
          return {
            ...state.rescueTeam,
            currentRow: next.row,
            currentCol: next.col,
          };
        })();
  return { ambulances, rescueTeam };
}

function fallbackRoute(
  startRow: number,
  startCol: number,
  goalRow: number,
  goalCol: number
): Array<{ row: number; col: number }> {
  const path: Array<{ row: number; col: number }> = [{ row: startRow, col: startCol }];
  let r = startRow;
  let c = startCol;
  while (r !== goalRow) {
    r += goalRow > r ? 1 : -1;
    path.push({ row: r, col: c });
  }
  while (c !== goalCol) {
    c += goalCol > c ? 1 : -1;
    path.push({ row: r, col: c });
  }
  return path;
}

function planRoute(
  state: SimulationState,
  startRow: number,
  startCol: number,
  goalRow: number,
  goalCol: number
): Array<{ row: number; col: number }> {
  const fuzzyEval = state.fuzzyLogicEnabled
    ? (state.fuzzySnapshot ?? evaluateFuzzyRouting(state))
    : null;
  const result = runSearch(
    state.searchAlgorithm,
    state.grid,
    startRow,
    startCol,
    goalRow,
    goalCol,
    state.objectivePriority,
    fuzzyEval ? fuzzyEval.riskStepMultiplier : 1,
    fuzzyEval ? fuzzyEval.heuristicRiskWeight : 1
  );
  if (result.found && result.path.length > 0) {
    return result.path.map((p) => ({ ...p }));
  }
  return fallbackRoute(startRow, startCol, goalRow, goalCol);
}

function victimOccupiedCells(victims: Victim[]): Set<string> {
  const s = new Set<string>();
  for (const v of victims) {
    s.add(`${v.row}-${v.col}`);
  }
  return s;
}

function reduce(state: SimulationState, action: SimAction): SimulationState {
  const rng = () => Math.random();

  switch (action.type) {
    case 'RESET':
      return recomputeDerived(action.payload);

    case 'START': {
      if (state.running && state.paused) {
        const logEntry: DecisionLogEntry = {
          id: generateId(),
          timestamp: formatTime(state.elapsedSeconds),
          text: 'Simulation resumed',
          type: 'success',
        };
        const toast: Toast = {
          id: generateId(),
          type: 'success',
          message: 'Simulation resumed',
          timestamp: Date.now(),
        };
        return recomputeDerived({
          ...state,
          paused: false,
          decisionLog: [...state.decisionLog, logEntry],
          toasts: [...state.toasts, toast],
        });
      }

      if (state.running && !state.paused) {
        return state;
      }

      const elapsedSeconds = state.elapsedSeconds;
      const logEntry: DecisionLogEntry = {
        id: generateId(),
        timestamp: formatTime(elapsedSeconds),
        text: 'Simulation started — 5 victims detected',
        type: 'success',
      };
      const toast: Toast = {
        id: generateId(),
        type: 'success',
        message: 'Simulation started',
        timestamp: Date.now(),
      };
      const planning = runSearchPlanningPatch(state, state.searchAlgorithm);
      const planLog: DecisionLogEntry = {
        id: generateId(),
        timestamp: formatTime(elapsedSeconds),
        text: planning.searchResults?.found
          ? `⚙ Initial route — ${searchAlgoLabel(planning.searchResults.algorithm)} ` +
            `cost=${planning.searchResults.pathCost.toFixed(1)} ` +
            `risk=${planning.searchResults.riskScore.toFixed(2)}`
          : `⚙ Initial route — ${searchAlgoLabel(state.searchAlgorithm)} (no path found)`,
        type: 'normal',
      };
      const started = recomputeDerived({
        ...state,
        ...planning,
        running: true,
        paused: false,
        decisionLog: [
          ...state.decisionLog,
          logEntry,
          planLog,
          ...fuzzyPlanningLogEntries(elapsedSeconds, planning.fuzzySnapshot),
        ],
        toasts: [...state.toasts, toast],
      });
      return applyCspSolution(started);
    }

    case 'PAUSE': {
      const logEntry: DecisionLogEntry = {
        id: generateId(),
        timestamp: formatTime(state.elapsedSeconds),
        text: 'Simulation paused',
        type: 'normal',
      };
      return recomputeDerived({
        ...state,
        paused: true,
        decisionLog: [...state.decisionLog, logEntry],
      });
    }

    case 'SET_SPEED':
      return recomputeDerived({ ...state, speed: action.payload });

    case 'SET_SEARCH':
      return recomputeDerived({ ...state, searchAlgorithm: action.payload });

    case 'SET_LOCAL_SEARCH':
      return recomputeDerived({ ...state, localSearch: action.payload });

    case 'SET_ML_MODEL':
      return recomputeDerived({
        ...state,
        mlModel: action.payload,
        victimMlEstimates: {},
      });

    case 'SET_OBJECTIVE':
      return recomputeDerived({ ...state, objectivePriority: action.payload });

    case 'TOGGLE_FUZZY':
      return recomputeDerived({
        ...state,
        fuzzyLogicEnabled: !state.fuzzyLogicEnabled,
        fuzzySnapshot: null,
      });

    case 'CLEAR_LOG':
      return recomputeDerived({ ...state, decisionLog: [] });

    case 'DISMISS_TOAST':
      return recomputeDerived({
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      });

    case 'TRIGGER_AFTERSHOCK': {
      const grid = cloneGrid(state.grid);
      const { row, col } = action.payload;
      if (!inBounds(row, col)) return state;
      const target = grid[row][col];
      if (!isPassablePlainRoad(target)) {
        const invalidToast: Toast = {
          id: generateId(),
          type: 'warning',
          message: 'Aftershock target must be a passable road cell',
          timestamp: Date.now(),
        };
        return recomputeDerived({ ...state, toasts: [...state.toasts, invalidToast] });
      }
      grid[row][col] = { ...target, type: 'fire', risk: 0.85, passable: true, onFire: true };
      const logEntry: DecisionLogEntry = {
        id: generateId(),
        timestamp: formatTime(state.elapsedSeconds),
        text: `💥 Aftershock triggered at (${row},${col})`,
        type: 'event',
      };
      const toast: Toast = {
        id: generateId(),
        type: 'danger',
        message: `💥 Aftershock detected at (${row},${col})`,
        timestamp: Date.now(),
      };
      return applyCspSolution(
        appendEventLogsAndMaybeRefreshRoutes(
          {
            ...state,
            grid,
            replanCount: state.replanCount + 1,
            toasts: [...state.toasts, toast],
          },
          [logEntry]
        )
      );
    }

    case 'BLOCK_ROAD_AT': {
      const grid = cloneGrid(state.grid);
      const { row, col } = action.payload;
      if (!inBounds(row, col)) return state;
      if (!isPassablePlainRoad(grid[row][col])) {
        const invalidToast: Toast = {
          id: generateId(),
          type: 'warning',
          message: 'Blocked road target must be a passable road cell',
          timestamp: Date.now(),
        };
        return recomputeDerived({ ...state, toasts: [...state.toasts, invalidToast] });
      }
      grid[row][col] = {
        ...grid[row][col],
        type: 'blocked',
        risk: 0.0,
        passable: false,
        blocked: true,
      };
      const logEntry: DecisionLogEntry = {
        id: generateId(),
        timestamp: formatTime(state.elapsedSeconds),
        text: `⚠ Road blocked at (${row},${col}) — replanning...`,
        type: 'replan',
      };
      const toast: Toast = {
        id: generateId(),
        type: 'warning',
        message: `⚠ Road blocked at (${row},${col})`,
        timestamp: Date.now(),
      };
      return applyCspSolution(
        appendEventLogsAndMaybeRefreshRoutes(
          {
            ...state,
            grid,
            replanCount: state.replanCount + 1,
            toasts: [...state.toasts, toast],
          },
          [logEntry]
        )
      );
    }

    case 'ADD_VICTIM_AT': {
      const { row, col } = action.payload;
      if (!inBounds(row, col)) return state;
      const occupied = victimOccupiedCells(state.victims);
      const cell = state.grid[row][col];
      const key = `${row}-${col}`;
      if (!isPassableRoadCell(cell) || occupied.has(key)) {
        const invalidToast: Toast = {
          id: generateId(),
          type: 'warning',
          message: 'Victim target must be an empty passable road cell',
          timestamp: Date.now(),
        };
        return recomputeDerived({ ...state, toasts: [...state.toasts, invalidToast] });
      }
      const severities: Array<'critical' | 'moderate' | 'minor'> = [
        'critical',
        'moderate',
        'minor',
      ];
      const severity = severities[Math.floor(rng() * severities.length)];
      const survivalPct = Math.floor(45 + rng() * (90 - 45 + 1));
      const id = `V${state.nextVictimSeq}`;
      const newVictim: Victim = {
        id,
        row,
        col,
        severity,
        status: 'waiting',
        assignedTo: null,
        survivalPct,
        eta: null,
        priorityScore: 0.5,
      };
      const logEntry: DecisionLogEntry = {
        id: generateId(),
        timestamp: formatTime(state.elapsedSeconds),
        text: `🆕 New victim detected at (${row},${col}) — severity: ${severity}`,
        type: 'event',
      };
      const toast: Toast = {
        id: generateId(),
        type: 'warning',
        message: `🆕 New victim added at (${row},${col})`,
        timestamp: Date.now(),
      };
      const replanBump = state.running && !state.paused ? 1 : 0;
      return applyCspSolution(
        appendEventLogsAndMaybeRefreshRoutes(
          {
            ...state,
            victims: [...state.victims.map(cloneVictim), newVictim],
            nextVictimSeq: state.nextVictimSeq + 1,
            replanCount: state.replanCount + replanBump,
            toasts: [...state.toasts, toast],
          },
          [logEntry]
        )
      );
    }

    case 'SPREAD_FIRE_FROM': {
      const grid = cloneGrid(state.grid);
      const { row, col } = action.payload;
      if (!inBounds(row, col)) return state;
      if (grid[row][col].type !== 'fire') {
        const invalidToast: Toast = {
          id: generateId(),
          type: 'warning',
          message: 'Spread source must be an existing fire cell',
          timestamp: Date.now(),
        };
        return recomputeDerived({ ...state, toasts: [...state.toasts, invalidToast] });
      }
      const roadNeighbors: Array<{ row: number; col: number }> = [];
      for (const nb of neighbors4(row, col)) {
        if (!inBounds(nb.row, nb.col)) continue;
        const cell = grid[nb.row][nb.col];
        if (cell.type === 'road') {
          roadNeighbors.push(nb);
        }
      }
      if (roadNeighbors.length === 0) {
        const noSpreadLog: DecisionLogEntry = {
          id: generateId(),
          timestamp: formatTime(state.elapsedSeconds),
          text: `🔥 Fire spread from (${row},${col}) — no adjacent road cell`,
          type: 'event',
        };
        return recomputeDerived({
          ...state,
          decisionLog: [...state.decisionLog, noSpreadLog],
        });
      }
      const chosen = roadNeighbors[Math.floor(rng() * roadNeighbors.length)];
      grid[chosen.row][chosen.col] = {
        ...grid[chosen.row][chosen.col],
        type: 'fire',
        risk: 0.85,
        passable: true,
        onFire: true,
      };
      const logEntry: DecisionLogEntry = {
        id: generateId(),
        timestamp: formatTime(state.elapsedSeconds),
        text: `🔥 Fire spread from (${row},${col}) to (${chosen.row},${chosen.col})`,
        type: 'event',
      };
      const toast: Toast = {
        id: generateId(),
        type: 'danger',
        message: `🔥 Fire expanded to (${chosen.row},${chosen.col})`,
        timestamp: Date.now(),
      };
      if (!state.running) {
        return recomputeDerived({
          ...state,
          grid,
          decisionLog: [...state.decisionLog, logEntry],
          toasts: [...state.toasts, toast],
        });
      }
      return applyCspSolution(
        appendEventLogsAndMaybeRefreshRoutes(
          {
            ...state,
            grid,
            replanCount: state.replanCount + 1,
            toasts: [...state.toasts, toast],
          },
          [logEntry]
        )
      );
    }

    case 'APPLY_REPLAN': {
      const logEntry: DecisionLogEntry = {
        id: generateId(),
        timestamp: formatTime(state.elapsedSeconds),
        text: `⚙ Settings applied — replanning with ${searchAlgoLabel(
          state.searchAlgorithm
        )} | Priority: ${objectiveLabel(state.objectivePriority)}`,
        type: 'replan',
      };
      const toast: Toast = {
        id: generateId(),
        type: 'info',
        message: 'Replanning initiated with new settings',
        timestamp: Date.now(),
      };
      const planning = runSearchPlanningPatch(state, state.searchAlgorithm);
      const routeLog: DecisionLogEntry = {
        id: generateId(),
        timestamp: formatTime(state.elapsedSeconds),
        text: planning.searchResults?.found
          ? `⚙ Route — ${searchAlgoLabel(planning.searchResults.algorithm)} ` +
            `cost=${planning.searchResults.pathCost.toFixed(1)} ` +
            `risk=${planning.searchResults.riskScore.toFixed(2)}`
          : `⚙ Route — ${searchAlgoLabel(state.searchAlgorithm)} (no path found)`,
        type: 'normal',
      };
      const merged = recomputeDerived({
        ...state,
        ...planning,
        replanCount: state.replanCount + 1,
        decisionLog: [
          ...state.decisionLog,
          logEntry,
          routeLog,
          ...fuzzyPlanningLogEntries(state.elapsedSeconds, planning.fuzzySnapshot),
        ],
        toasts: [...state.toasts, toast],
      });
      if (!state.running) {
        return merged;
      }
      return applyCspSolution(merged);
    }

    case 'RUN_SEARCH_WITH_ALGO': {
      const algo = action.payload;
      const planning = runSearchPlanningPatch({ ...state, searchAlgorithm: algo }, algo);
      return recomputeDerived({
        ...state,
        searchAlgorithm: algo,
        ...planning,
      });
    }

    case 'RUN_CSP':
      return applyCspSolution(state);

    case 'RUN_ML_EVAL': {
      const snap = runFullMlEvaluation();
      const logEntry: DecisionLogEntry = {
        id: generateId(),
        timestamp: formatTime(state.elapsedSeconds),
        text:
          `📊 ML train/eval complete — ${snap.trainSize} train / ${snap.testSize} test | ` +
          `kNN ${(snap.reports.kNN.accuracy * 100).toFixed(1)}% (k=${snap.knnK}) · ` +
          `NB ${(snap.reports.NaiveBayes.accuracy * 100).toFixed(1)}% · ` +
          `MLP ${(snap.reports.MLP.accuracy * 100).toFixed(1)}%`,
        type: 'info',
      };
      const toast: Toast = {
        id: generateId(),
        type: 'success',
        message: 'ML models trained and evaluated on synthetic risk dataset',
        timestamp: Date.now(),
      };
      return recomputeDerived({
        ...state,
        mlEvalSnapshot: snap,
        decisionLog: [...state.decisionLog, logEntry],
        toasts: [...state.toasts, toast],
      });
    }

    case 'TICK': {
      let victims = state.victims.map(cloneVictim);
      const newToasts: Toast[] = [];
      const tickLogs: DecisionLogEntry[] = [];
      victims = victims.map((v) => {
        if (v.status === 'rescued' || v.status === 'lost') return v;
        const waitingOrTransit = v.status === 'waiting' || v.status === 'en-route';
        if (!waitingOrTransit) return v;
        let decay = 0.15;
        if (v.severity === 'critical') decay = 0.3;
        else if (v.severity === 'minor') decay = 0.05;
        const nextSurvival = v.survivalPct - decay;
        if (nextSurvival <= 0) {
          newToasts.push({
            id: generateId(),
            type: 'danger',
            message: `${v.id} lost — survival depleted`,
            timestamp: Date.now(),
          });
          return {
            ...v,
            survivalPct: 0,
            status: 'lost' as const,
          };
        }
        return { ...v, survivalPct: nextSurvival };
      });

      const moved = advanceResourcesOneStep(state);
      let ambulances = moved.ambulances.map(cloneAmbulance);
      let rescueTeam = cloneTeam(moved.rescueTeam);
      const victimById = new Map(victims.map((v) => [v.id, v] as const));

      for (let i = 0; i < ambulances.length; i++) {
        const amb = ambulances[i];
        if (amb.status === 'en-route' && amb.assignedVictims.length > 0) {
          const targetId = amb.assignedVictims[0];
          const target = victimById.get(targetId);
          if (
            target &&
            target.status !== 'rescued' &&
            target.status !== 'lost' &&
            amb.currentRow === target.row &&
            amb.currentCol === target.col
          ) {
            target.status = 'rescued';
            target.assignedTo = amb.id;
            target.eta = 0;
            newToasts.push({
              id: generateId(),
              type: 'success',
              message: `✅ ${target.id} rescued by ${amb.id}`,
              timestamp: Date.now(),
            });
            tickLogs.push({
              id: generateId(),
              timestamp: formatTime(state.elapsedSeconds),
              text: `✅ ${target.id} rescued by ${amb.id}`,
              type: 'success',
            });

            const remaining = amb.assignedVictims.slice(1);
            if (remaining.length > 0) {
              const nextVictim = victimById.get(remaining[0]);
              const nextRoute =
                nextVictim != null
                  ? planRoute(state, amb.currentRow, amb.currentCol, nextVictim.row, nextVictim.col)
                  : [];
              ambulances[i] = {
                ...amb,
                assignedVictims: remaining,
                route: nextRoute,
                eta: nextRoute.length > 1 ? nextRoute.length - 1 : null,
                status: 'en-route',
              };
            } else {
              const dest = amb.id === 'Amb1' ? { row: 0, col: 17 } : { row: 17, col: 17 };
              const returnRoute = planRoute(state, amb.currentRow, amb.currentCol, dest.row, dest.col);
              ambulances[i] = {
                ...amb,
                assignedVictims: [],
                route: returnRoute,
                eta: returnRoute.length > 1 ? returnRoute.length - 1 : null,
                status: 'returning',
              };
            }
          }
        } else if (amb.status === 'returning') {
          const atAmb1Mc = amb.id === 'Amb1' && amb.currentRow === 0 && amb.currentCol === 17;
          const atAmb2Mc = amb.id === 'Amb2' && amb.currentRow === 17 && amb.currentCol === 17;
          if (atAmb1Mc || atAmb2Mc) {
            ambulances[i] = {
              ...amb,
              status: 'idle',
              route: [],
              eta: null,
            };
          }
        }
      }

      if (rescueTeam.status === 'en-route' && rescueTeam.assignedVictim != null) {
        const target = victimById.get(rescueTeam.assignedVictim);
        if (
          target &&
          target.status !== 'rescued' &&
          target.status !== 'lost' &&
          rescueTeam.currentRow === target.row &&
          rescueTeam.currentCol === target.col
        ) {
          target.status = 'rescued';
          target.assignedTo = 'Team';
          target.eta = 0;
          newToasts.push({
            id: generateId(),
            type: 'success',
            message: `✅ ${target.id} rescued by Team`,
            timestamp: Date.now(),
          });
          tickLogs.push({
            id: generateId(),
            timestamp: formatTime(state.elapsedSeconds),
            text: `✅ ${target.id} rescued by Team`,
            type: 'success',
          });
          rescueTeam = {
            ...rescueTeam,
            assignedVictim: null,
            status: 'idle',
            route: [],
            eta: null,
          };
        }
      }

      const next: SimulationState = {
        ...state,
        elapsedSeconds: state.elapsedSeconds + 1,
        victims,
        ambulances,
        rescueTeam,
        currentRouteAmb1: ambulances.find((a) => a.id === 'Amb1')?.route ?? [],
        currentRouteAmb2: ambulances.find((a) => a.id === 'Amb2')?.route ?? [],
        currentRouteTeam: rescueTeam.route,
        decisionLog: [...state.decisionLog, ...tickLogs],
        toasts: [...state.toasts, ...newToasts],
      };
      return recomputeDerived(next);
    }

    default:
      return state;
  }
}

export function useSimulation(): {
  state: SimulationState;
  actions: SimulationActions;
} {
  const [state, dispatch] = useReducer(reduce, undefined, () => buildInitialState());

  const startSimulation = useCallback(() => {
    dispatch({ type: 'START' });
  }, []);
  const pauseSimulation = useCallback(() => {
    dispatch({ type: 'PAUSE' });
  }, []);
  const resetSimulation = useCallback(() => {
    dispatch({ type: 'RESET', payload: buildInitialState() });
  }, []);
  const setSpeed = useCallback((speed: SimSpeed) => {
    dispatch({ type: 'SET_SPEED', payload: speed });
  }, []);
  const setSearchAlgorithm = useCallback((algo: SearchAlgorithm) => {
    dispatch({ type: 'SET_SEARCH', payload: algo });
  }, []);
  const setLocalSearch = useCallback((ls: LocalSearch) => {
    dispatch({ type: 'SET_LOCAL_SEARCH', payload: ls });
  }, []);
  const setMLModel = useCallback((model: MLModel) => {
    dispatch({ type: 'SET_ML_MODEL', payload: model });
  }, []);
  const setObjectivePriority = useCallback((obj: ObjectivePriority) => {
    dispatch({ type: 'SET_OBJECTIVE', payload: obj });
  }, []);
  const toggleFuzzyLogic = useCallback(() => {
    dispatch({ type: 'TOGGLE_FUZZY' });
  }, []);
  const triggerAfterShock = useCallback((row: number, col: number) => {
    dispatch({ type: 'TRIGGER_AFTERSHOCK', payload: { row, col } });
  }, []);
  const blockRoadAt = useCallback((row: number, col: number) => {
    dispatch({ type: 'BLOCK_ROAD_AT', payload: { row, col } });
  }, []);
  const addVictimAt = useCallback((row: number, col: number) => {
    dispatch({ type: 'ADD_VICTIM_AT', payload: { row, col } });
  }, []);
  const spreadFireFrom = useCallback((row: number, col: number) => {
    dispatch({ type: 'SPREAD_FIRE_FROM', payload: { row, col } });
  }, []);
  const applyAndReplan = useCallback(() => {
    dispatch({ type: 'APPLY_REPLAN' });
  }, []);
  const clearLog = useCallback(() => {
    dispatch({ type: 'CLEAR_LOG' });
  }, []);
  const dismissToast = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_TOAST', payload: id });
  }, []);
  const onTick = useCallback(() => {
    dispatch({ type: 'TICK' });
  }, []);
  const runSearchForAlgorithm = useCallback((algo: SearchAlgorithm) => {
    dispatch({ type: 'RUN_SEARCH_WITH_ALGO', payload: algo });
  }, []);
  const runCsp = useCallback(() => {
    dispatch({ type: 'RUN_CSP' });
  }, []);
  const runMlEvaluation = useCallback(() => {
    dispatch({ type: 'RUN_ML_EVAL' });
  }, []);

  const actions = useMemo<SimulationActions>(
    () => ({
      startSimulation,
      pauseSimulation,
      resetSimulation,
      setSpeed,
      setSearchAlgorithm,
      setLocalSearch,
      setMLModel,
      setObjectivePriority,
      toggleFuzzyLogic,
      triggerAfterShock,
      blockRoadAt,
      addVictimAt,
      spreadFireFrom,
      applyAndReplan,
      clearLog,
      dismissToast,
      onTick,
      runSearchForAlgorithm,
      runCsp,
      runMlEvaluation,
    }),
    [
      startSimulation,
      pauseSimulation,
      resetSimulation,
      setSpeed,
      setSearchAlgorithm,
      setLocalSearch,
      setMLModel,
      setObjectivePriority,
      toggleFuzzyLogic,
      triggerAfterShock,
      blockRoadAt,
      addVictimAt,
      spreadFireFrom,
      applyAndReplan,
      clearLog,
      dismissToast,
      onTick,
      runSearchForAlgorithm,
      runCsp,
      runMlEvaluation,
    ]
  );

  return { state, actions };
}
