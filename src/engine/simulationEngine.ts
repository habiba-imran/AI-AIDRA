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
  | { type: 'TRIGGER_AFTERSHOCK' }
  | { type: 'BLOCK_RANDOM_ROAD' }
  | { type: 'ADD_NEW_VICTIM' }
  | { type: 'SPREAD_FIRE' }
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
  | 'searchResults'
  | 'localSearchResult'
  | 'allAlgoComparisons'
  | 'currentRouteAmb1'
  | 'currentRouteAmb2'
  | 'currentRouteTeam'
  | 'ambulances'
  | 'fuzzySnapshot'
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
  const finalPath = localRes.path.length > 0 ? localRes.path : pathForLocal;
  const ambulances = state.ambulances.map(cloneAmbulance);
  if (ambulances[0]) {
    ambulances[0] = {
      ...ambulances[0],
      route: finalPath.map((p) => ({ ...p })),
    };
  }
  const allAlgoComparisons = runAllAlgorithms(
    grid,
    state.objectivePriority,
    fuzzyRiskStep,
    fuzzyHeuristic
  );
  const routeCopy = finalPath.map((p) => ({ ...p }));

  return {
    searchResults: searchResult,
    localSearchResult: localRes,
    allAlgoComparisons,
    currentRouteAmb1: routeCopy,
    currentRouteAmb2: [],
    currentRouteTeam: [],
    ambulances,
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

function applyCspSolution(state: SimulationState): SimulationState {
  const { victimsForCsp, victimMlEstimates, mlLogText, fuzzyLogText } =
    buildVictimsForCspWithOptionalMl(state);
  const solution = solveCsp(victimsForCsp);

  const updatedAmbs = state.ambulances.map((amb) => {
    if (amb.id === 'Amb1') {
      return {
        ...amb,
        assignedVictims: solution.amb1Victims,
        status:
          solution.amb1Victims.length > 0 ? ('en-route' as const) : ('idle' as const),
      };
    }
    if (amb.id === 'Amb2') {
      return {
        ...amb,
        assignedVictims: solution.amb2Victims,
        status:
          solution.amb2Victims.length > 0 ? ('en-route' as const) : ('idle' as const),
      };
    }
    return amb;
  });

  const updatedVictims = state.victims.map((v) => {
    if (v.status === 'rescued' || v.status === 'lost') {
      return v;
    }
    let next: Victim;
    if (solution.amb1Victims.includes(v.id)) {
      next = { ...v, assignedTo: 'Amb1', status: 'en-route' as const };
    } else if (solution.amb2Victims.includes(v.id)) {
      next = { ...v, assignedTo: 'Amb2', status: 'en-route' as const };
    } else if (solution.teamVictim === v.id) {
      next = { ...v, assignedTo: 'Team', status: 'en-route' as const };
    } else {
      next = { ...v, assignedTo: null, status: 'waiting' as const };
    }
    return { ...next, priorityScore: v.priorityScore };
  });

  const updatedTeam: RescueTeam = {
    ...state.rescueTeam,
    assignedVictim: solution.teamVictim,
    status: solution.teamVictim ? ('en-route' as const) : ('idle' as const),
  };

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
    victimMlEstimates,
    decisionLog: [...state.decisionLog, ...logLines],
  });
}

function buildInitialState(): SimulationState {
  const grid = generateGrid();
  const victims = generateInitialVictims().map(cloneVictim);
  const ambulances = generateInitialAmbulances().map(cloneAmbulance);
  const rescueTeam = cloneTeam(generateInitialRescueTeam());

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
    mlEvalSnapshot: null,
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
      const candidates: Array<{ row: number; col: number }> = [];
      for (let r = 0; r < 18; r++) {
        for (let c = 0; c < 18; c++) {
          const cell = grid[r][c];
          if (isPassablePlainRoad(cell)) {
            candidates.push({ row: r, col: c });
          }
        }
      }
      const picks = pickRandomIndices(candidates, 2, rng);
      for (const idx of picks) {
        const p = candidates[idx];
        grid[p.row][p.col] = {
          ...grid[p.row][p.col],
          type: 'fire',
          risk: 0.85,
          passable: true,
          onFire: true,
        };
      }
      const logEntry: DecisionLogEntry = {
        id: generateId(),
        timestamp: formatTime(state.elapsedSeconds),
        text: '💥 Aftershock triggered — 2 new fire zones created',
        type: 'event',
      };
      const toast: Toast = {
        id: generateId(),
        type: 'danger',
        message: '💥 Aftershock detected — replanning required',
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

    case 'BLOCK_RANDOM_ROAD': {
      const grid = cloneGrid(state.grid);
      const candidates: Array<{ row: number; col: number }> = [];
      for (let r = 0; r < 18; r++) {
        for (let c = 0; c < 18; c++) {
          if (isPassablePlainRoad(grid[r][c])) {
            candidates.push({ row: r, col: c });
          }
        }
      }
      if (candidates.length === 0) {
        return state;
      }
      const idx = Math.floor(rng() * candidates.length);
      const p = candidates[idx];
      grid[p.row][p.col] = {
        ...grid[p.row][p.col],
        type: 'blocked',
        risk: 0.0,
        passable: false,
        blocked: true,
      };
      const logEntry: DecisionLogEntry = {
        id: generateId(),
        timestamp: formatTime(state.elapsedSeconds),
        text: `⚠ Road blocked at (${p.row},${p.col}) — replanning...`,
        type: 'replan',
      };
      const toast: Toast = {
        id: generateId(),
        type: 'warning',
        message: `⚠ Road blocked at (${p.row},${p.col})`,
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

    case 'ADD_NEW_VICTIM': {
      const occupied = victimOccupiedCells(state.victims);
      const candidates: Array<{ row: number; col: number }> = [];
      for (let r = 0; r < 18; r++) {
        for (let c = 0; c < 18; c++) {
          const cell = state.grid[r][c];
          const key = `${r}-${c}`;
          if (isPassableRoadCell(cell) && !occupied.has(key)) {
            candidates.push({ row: r, col: c });
          }
        }
      }
      if (candidates.length === 0) {
        return state;
      }
      const pick = candidates[Math.floor(rng() * candidates.length)];
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
        row: pick.row,
        col: pick.col,
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
        text: `🆕 New victim detected at (${pick.row},${pick.col}) — severity: ${severity}`,
        type: 'event',
      };
      const toast: Toast = {
        id: generateId(),
        type: 'warning',
        message: '🆕 New victim added — reallocation needed',
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

    case 'SPREAD_FIRE': {
      const grid = cloneGrid(state.grid);
      const firePositions: Array<{ row: number; col: number }> = [];
      for (let r = 0; r < 18; r++) {
        for (let c = 0; c < 18; c++) {
          if (grid[r][c].type === 'fire') {
            firePositions.push({ row: r, col: c });
          }
        }
      }
      let n = 0;
      for (const fp of firePositions) {
        const roadNeighbors: Array<{ row: number; col: number }> = [];
        for (const nb of neighbors4(fp.row, fp.col)) {
          if (!inBounds(nb.row, nb.col)) continue;
          const cell = grid[nb.row][nb.col];
          if (cell.type === 'road') {
            roadNeighbors.push(nb);
          }
        }
        if (roadNeighbors.length === 0) continue;
        const chosen =
          roadNeighbors[Math.floor(rng() * roadNeighbors.length)];
        grid[chosen.row][chosen.col] = {
          ...grid[chosen.row][chosen.col],
          type: 'fire',
          risk: 0.85,
          passable: true,
          onFire: true,
        };
        n += 1;
      }
      const logEntry: DecisionLogEntry = {
        id: generateId(),
        timestamp: formatTime(state.elapsedSeconds),
        text: `🔥 Fire spreading — ${n} new cells affected`,
        type: 'event',
      };
      const toast: Toast = {
        id: generateId(),
        type: 'danger',
        message: '🔥 Fire zone expanding',
        timestamp: Date.now(),
      };
      if (n === 0) {
        return recomputeDerived({
          ...state,
          decisionLog: [...state.decisionLog, logEntry],
          toasts: [...state.toasts, toast],
        });
      }
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
      return recomputeDerived({
        ...state,
        ...planning,
        decisionLog: [
          ...state.decisionLog,
          logEntry,
          routeLog,
          ...fuzzyPlanningLogEntries(state.elapsedSeconds, planning.fuzzySnapshot),
        ],
        toasts: [...state.toasts, toast],
      });
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
      victims = victims.map((v) => {
        if (v.status !== 'waiting') return v;
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

      const next: SimulationState = {
        ...state,
        elapsedSeconds: state.elapsedSeconds + 1,
        victims,
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
  const triggerAfterShock = useCallback(() => {
    dispatch({ type: 'TRIGGER_AFTERSHOCK' });
  }, []);
  const blockRandomRoad = useCallback(() => {
    dispatch({ type: 'BLOCK_RANDOM_ROAD' });
  }, []);
  const addNewVictim = useCallback(() => {
    dispatch({ type: 'ADD_NEW_VICTIM' });
  }, []);
  const spreadFireZone = useCallback(() => {
    dispatch({ type: 'SPREAD_FIRE' });
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
      blockRandomRoad,
      addNewVictim,
      spreadFireZone,
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
      blockRandomRoad,
      addNewVictim,
      spreadFireZone,
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
