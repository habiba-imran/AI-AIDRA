export type CellType = 'road' | 'fire' | 'collapse' | 'blocked' | 'safe' | 'mc1' | 'mc2' | 'base';

export interface GridCell {
  row: number;
  col: number;
  type: CellType;
  risk: number;
  passable: boolean;
}

export interface Victim {
  id: string;
  severity: 'Critical' | 'Moderate' | 'Minor';
  status: 'En Route' | 'Waiting' | 'Active';
  assigned: string;
  survivalPct: number;
  eta: string;
  row: number;
  col: number;
}

export interface Ambulance {
  id: string;
  label: string;
  status: 'EN ROUTE' | 'IDLE';
  victims: number;
  capacity: number;
  assigned: string;
  eta: string;
  row: number;
  col: number;
  routeColor: string;
  route: [number, number][];
}

export interface RescueTeam {
  id: string;
  label: string;
  status: 'ACTIVE';
  target: string;
  eta: string;
  row: number;
  col: number;
  route: [number, number][];
}

export interface DecisionLogEntry {
  time: string;
  text: string;
  type: 'normal' | 'replan' | 'event' | 'success';
}

export interface KPI {
  icon: string;
  label: string;
  value: string;
  color: 'green' | 'amber' | 'red';
}

export interface Toast {
  id: string;
  type: 'warning' | 'danger' | 'success';
  message: string;
}

const GRID_SIZE = 18;

function buildGrid(): GridCell[] {
  const cells: GridCell[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      let type: CellType = 'road';
      let risk = 0.1;
      let passable = true;

      // Medical Center 1 (top-right area)
      if (r >= 1 && r <= 2 && c >= 15 && c <= 16) {
        type = 'mc1';
        risk = 0.05;
      }
      // Medical Center 2 (bottom-right)
      else if (r >= 15 && r <= 16 && c >= 15 && c <= 16) {
        type = 'mc2';
        risk = 0.05;
      }
      // Rescue Base (top-left)
      else if (r >= 1 && r <= 2 && c >= 1 && c <= 2) {
        type = 'base';
        risk = 0.02;
      }
      // Fire zones (cluster center-ish)
      else if ((r >= 6 && r <= 8 && c >= 5 && c <= 7) || (r >= 10 && r <= 11 && c >= 10 && c <= 12)) {
        type = 'fire';
        risk = 0.82;
      }
      // Structural collapse zones
      else if ((r >= 4 && r <= 5 && c >= 9 && c <= 10) || (r >= 13 && r <= 14 && c >= 3 && c <= 4)) {
        type = 'collapse';
        risk = 0.65;
        passable = true;
      }
      // Blocked roads
      else if ((r === 5 && c === 8) || (r === 5 && c === 9) || (r === 9 && c === 3) || (r === 12 && c === 7)) {
        type = 'blocked';
        risk = 1.0;
        passable = false;
      }
      // Safe open areas
      else if ((r >= 7 && r <= 9 && c >= 13 && c <= 15) || (r >= 3 && r <= 4 && c >= 12 && c <= 14)) {
        type = 'safe';
        risk = 0.05;
      }

      cells.push({ row: r, col: c, type, risk, passable });
    }
  }
  return cells;
}

export const gridCells = buildGrid();

export const victims: Victim[] = [
  { id: 'V1', severity: 'Critical', status: 'En Route', assigned: 'Amb1', survivalPct: 71, eta: '4.2m', row: 6, col: 6 },
  { id: 'V2', severity: 'Critical', status: 'Waiting', assigned: '—', survivalPct: 58, eta: '—', row: 7, col: 5 },
  { id: 'V3', severity: 'Moderate', status: 'En Route', assigned: 'Amb1', survivalPct: 84, eta: '6.1m', row: 10, col: 11 },
  { id: 'V4', severity: 'Moderate', status: 'Waiting', assigned: '—', survivalPct: 79, eta: '—', row: 4, col: 10 },
  { id: 'V5', severity: 'Minor', status: 'Active', assigned: 'Team', survivalPct: 93, eta: '7.1m', row: 13, col: 4 },
];

export const ambulances: Ambulance[] = [
  {
    id: 'amb1',
    label: 'Ambulance 1',
    status: 'EN ROUTE',
    victims: 1,
    capacity: 2,
    assigned: 'V1 (Critical)',
    eta: '4.2 min',
    row: 4,
    col: 7,
    routeColor: '#3b82f6',
    route: [[2, 2], [2, 3], [3, 3], [3, 4], [4, 4], [4, 5], [4, 6], [4, 7], [5, 7], [6, 7], [6, 8], [7, 8], [7, 9], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [8, 15], [7, 15], [6, 15], [5, 15], [4, 15], [3, 15], [2, 15], [1, 15]],
  },
  {
    id: 'amb2',
    label: 'Ambulance 2',
    status: 'IDLE',
    victims: 0,
    capacity: 2,
    assigned: 'Standby at BASE',
    eta: '—',
    row: 2,
    col: 2,
    routeColor: '#06b6d4',
    route: [[2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [15, 3], [15, 4], [15, 5], [15, 6], [15, 7], [15, 8], [15, 9], [15, 10], [15, 11], [15, 12], [15, 13], [15, 14], [15, 15]],
  },
];

export const rescueTeam: RescueTeam = {
  id: 'team1',
  label: 'Rescue Team Alpha',
  status: 'ACTIVE',
  target: 'V5',
  eta: '7.1 min',
  row: 8,
  col: 3,
  route: [[2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [13, 4]],
};

export const decisionLog: DecisionLogEntry[] = [
  { time: '00:01', text: 'Simulation initialized — 5 victims detected', type: 'normal' },
  { time: '00:02', text: 'CSP solved: Amb1→{V1,V3} Amb2→{V2,V4}', type: 'normal' },
  { time: '00:03', text: 'A* route: BASE→(4,7)→(8,9)→MC1  cost=14', type: 'normal' },
  { time: '00:05', text: '⚠ REPLAN: road (5,8)↔(5,9) BLOCKED', type: 'replan' },
  { time: '00:05', text: 'Objective switched → Minimize Risk', type: 'replan' },
  { time: '00:06', text: 'New route: cost=18 (+28% time, -80% risk)', type: 'normal' },
  { time: '00:07', text: '✅ V1 rescued — survival: 89% — 6.8 min', type: 'success' },
  { time: '00:09', text: '💥 Aftershock zone D4 — replanning...', type: 'event' },
];

export const kpis: KPI[] = [
  { icon: '👥', label: 'Victims Saved', value: '2 / 5', color: 'amber' },
  { icon: '⏱', label: 'Avg Rescue Time', value: '8.4m', color: 'green' },
  { icon: '📐', label: 'Path Optimality', value: '0.87', color: 'green' },
  { icon: '⚠', label: 'Risk Exposure', value: '34 pts', color: 'red' },
  { icon: '🔧', label: 'Resource Util', value: '75%', color: 'green' },
  { icon: '🔄', label: 'Replan Events', value: '3', color: 'amber' },
];

export const toasts: Toast[] = [
  { id: '1', type: 'warning', message: 'Road blocked at (5,8) — rerouting' },
  { id: '2', type: 'danger', message: 'V2 survival dropping — 58%' },
  { id: '3', type: 'success', message: 'V1 rescued successfully' },
];

// ─── Tab 2: Search Trace ───

export type SearchAlgo = 'bfs' | 'dfs' | 'greedy' | 'astar';

export interface SearchGridCell {
  row: number;
  col: number;
  state: 'unvisited' | 'visited' | 'frontier' | 'current' | 'path' | 'fire' | 'blocked' | 'start' | 'goal-mc1' | 'goal-mc2';
  fValue?: number;
}

export interface ExpansionLogEntry {
  step: number;
  text: string;
  type: 'normal' | 'best' | 'risk' | 'blocked' | 'replan' | 'found';
}

export interface AlgoComparison {
  algo: string;
  nodesExpanded: number;
  pathCost: number;
  timeMs: number;
  optimal: boolean;
  riskScore: string;
  best?: boolean;
}

export interface TradeOffStrategy {
  icon: string;
  title: string;
  pathCost: number;
  riskScore: string;
  time: string;
  detail: string;
  border: 'red' | 'green' | 'blue';
  recommended?: boolean;
}

export const SEARCH_GRID_SIZE = 16;

function buildSearchGrid(): SearchGridCell[] {
  const cells: SearchGridCell[] = [];
  const visitedSet = new Set([
    '0-0','0-1','1-0','1-1','2-0','2-1','3-0','3-1','4-0','4-1','4-2',
    '5-2','5-3','6-3','6-4','7-4','7-5','8-5','8-6','9-6','9-7','10-7',
  ]);
  const frontierSet = new Set([
    '5-1','6-2','7-3','8-4','9-5','10-6','11-7','11-8',
  ]);
  const pathSet = new Set([
    '0-0','1-0','2-0','3-0','4-0','4-1','4-2','5-2','5-3','6-3','6-4',
    '7-4','7-5','8-5','8-6','9-6','9-7','10-7','10-8','10-9','10-10',
    '11-10','12-10','12-11','13-11','13-12','14-12','14-13','14-14',
  ]);
  const fireSet = new Set(['6-5','6-6','7-6','7-7','8-7','8-8']);
  const blockedSet = new Set(['5-4','9-3','12-8']);

  const fValues: Record<string, number> = {
    '0-0': 18, '0-1': 17, '1-0': 16, '1-1': 17, '2-0': 15, '2-1': 15,
    '3-0': 15, '3-1': 16, '4-0': 15, '4-1': 15, '4-2': 15, '5-2': 14,
    '5-3': 13, '6-3': 12, '6-4': 11, '7-4': 10, '7-5': 9, '8-5': 8,
    '8-6': 7, '9-6': 6, '9-7': 5, '10-7': 4,
    '5-1': 16, '6-2': 14, '7-3': 13, '8-4': 12, '9-5': 11, '10-6': 10,
    '11-7': 9, '11-8': 8,
  };

  for (let r = 0; r < SEARCH_GRID_SIZE; r++) {
    for (let c = 0; c < SEARCH_GRID_SIZE; c++) {
      const key = `${r}-${c}`;
      let state: SearchGridCell['state'] = 'unvisited';
      if (r === 0 && c === 0) state = 'start';
      else if (r === 1 && c === 14) state = 'goal-mc1';
      else if (r === 14 && c === 14) state = 'goal-mc2';
      else if (fireSet.has(key)) state = 'fire';
      else if (blockedSet.has(key)) state = 'blocked';
      else if (pathSet.has(key)) state = 'path';
      else if (key === '10-7') state = 'current';
      else if (frontierSet.has(key)) state = 'frontier';
      else if (visitedSet.has(key)) state = 'visited';

      cells.push({ row: r, col: c, state, fValue: fValues[key] });
    }
  }
  return cells;
}

export const searchGridCells = buildSearchGrid();

export const expansionLog: ExpansionLogEntry[] = [
  { step: 1, text: 'Expand (0,0)=BASE → g=0 h=18 f=18', type: 'normal' },
  { step: 2, text: 'Open: (0,1) f=17 | (1,0) f=16', type: 'normal' },
  { step: 3, text: 'Expand (1,0) → g=1 h=15 f=16 ← BEST', type: 'best' },
  { step: 4, text: 'Open: (2,0) f=15 | (1,1) f=17', type: 'normal' },
  { step: 5, text: 'Expand (2,0) → g=2 h=13 f=15', type: 'normal' },
  { step: 6, text: 'HIGH RISK (3,1) → penalty +5 applied', type: 'risk' },
  { step: 7, text: 'Expand (2,1) → g=3 h=12 f=15', type: 'normal' },
  { step: 8, text: 'BLOCKED (3,2) → node skipped ✕', type: 'blocked' },
  { step: 9, text: 'Expand (3,0) → g=4 h=11 f=15', type: 'normal' },
  { step: 10, text: 'Frontier size: 6 nodes', type: 'normal' },
  { step: 11, text: 'Expand (4,0) → g=5 h=10 f=15', type: 'normal' },
  { step: 12, text: 'Expand (4,1) → g=6 h=9 f=15', type: 'normal' },
  { step: 13, text: 'REPLAN triggered — new blockage detected', type: 'replan' },
  { step: 14, text: 'Backtracking to (4,0)...', type: 'replan' },
  { step: 15, text: 'New branch: (4,2) → g=7 h=8 f=15', type: 'normal' },
];

export const algoComparisons: AlgoComparison[] = [
  { algo: 'BFS', nodesExpanded: 89, pathCost: 14, timeMs: 23, optimal: true, riskScore: 'High' },
  { algo: 'DFS', nodesExpanded: 34, pathCost: 21, timeMs: 8, optimal: false, riskScore: 'High' },
  { algo: 'Greedy', nodesExpanded: 18, pathCost: 16, timeMs: 5, optimal: false, riskScore: 'Medium' },
  { algo: 'A*', nodesExpanded: 27, pathCost: 14, timeMs: 11, optimal: true, riskScore: 'Low', best: true },
];

export const tradeOffStrategies: TradeOffStrategy[] = [
  { icon: '⚡', title: 'MINIMIZE TIME (BFS/DFS)', pathCost: 14, riskScore: 'HIGH', time: '23ms', detail: 'Fastest route through hazard zone', border: 'red' },
  { icon: '🛡', title: 'MINIMIZE RISK (A* weighted)', pathCost: 18, riskScore: 'LOW ✅', time: '31ms', detail: '+28% longer but avoids fire zone', border: 'green' },
  { icon: '⚖', title: 'BALANCED (A* standard) ⭐', pathCost: 16, riskScore: 'MEDIUM', time: '11ms', detail: 'Optimal trade-off — selected', border: 'blue', recommended: true },
];

// ─── Tab 3: CSP Solver ───

export interface CspVariable {
  id: string;
  icon: string;
  label: string;
  domain: string;
  maxInfo: string;
  current: string;
  satisfied: boolean;
}

export interface CspConstraint {
  id: string;
  formula: string;
  satisfied: boolean;
}

export interface CspTreeNode {
  id: string;
  label: string;
  valid: boolean;
  level: number;
  children: string[];
  backtrack?: boolean;
  solution?: boolean;
  start?: boolean;
}

export interface CspPerfRow {
  method: string;
  backtracks: number;
  nodes: number;
  constraintsChecked: number;
  timeMs: number;
  best?: boolean;
}

export const cspVariables: CspVariable[] = [
  { id: 'amb1', icon: '📦', label: 'Amb1_Assignment', domain: '{V1, V2, V3, V4, V5}', maxInfo: 'Max capacity: 2 victims', current: '{V1, V3}', satisfied: true },
  { id: 'amb2', icon: '📦', label: 'Amb2_Assignment', domain: '{V1, V2, V3, V4, V5}', maxInfo: 'Max capacity: 2 victims', current: '{V2, V4}', satisfied: true },
  { id: 'team', icon: '👷', label: 'Team_Assignment', domain: '{V1, V2, V3, V4, V5}', maxInfo: 'Max: 1 location at a time', current: '{V5}', satisfied: true },
  { id: 'kits', icon: '🧰', label: 'Kit_Allocation', domain: '{0, 1, 2, 3} per victim', maxInfo: 'Total limit: ≤ 10 kits', current: '4 kits used', satisfied: true },
];

export const cspConstraints: CspConstraint[] = [
  { id: 'C1', formula: '|Amb1_victims| ≤ 2', satisfied: true },
  { id: 'C2', formula: '|Amb2_victims| ≤ 2', satisfied: true },
  { id: 'C3', formula: 'Team services 1 location/time', satisfied: true },
  { id: 'C4', formula: 'Total kits ≤ 10', satisfied: true },
  { id: 'C5', formula: 'Critical victims assigned first', satisfied: true },
  { id: 'C6', formula: 'No duplicate victim assignments', satisfied: true },
];

export const cspTreeNodes: Record<string, CspTreeNode> = {
  start: { id: 'start', label: 'START', valid: true, level: 0, children: ['amb1-v1', 'amb1-v2'], start: true },
  'amb1-v1': { id: 'amb1-v1', label: 'Amb1=V1', valid: true, level: 1, children: ['amb1-v1-v3', 'amb1-v1-v2'] },
  'amb1-v2': { id: 'amb1-v2', label: 'Amb1=V2', valid: false, level: 1, children: ['amb1-v2-v1'], backtrack: true },
  'amb1-v1-v3': { id: 'amb1-v1-v3', label: '+V3', valid: true, level: 2, children: ['amb2-v2'] },
  'amb1-v1-v2': { id: 'amb1-v1-v2', label: '+V2', valid: false, level: 2, children: [], backtrack: true },
  'amb1-v2-v1': { id: 'amb1-v2-v1', label: '+V1', valid: false, level: 2, children: [], backtrack: true },
  'amb2-v2': { id: 'amb2-v2', label: 'Amb2=V2', valid: true, level: 3, children: ['amb2-v2-v4'] },
  'amb2-v2-v4': { id: 'amb2-v2-v4', label: '+V4', valid: true, level: 4, children: ['team-v5'] },
  'team-v5': { id: 'team-v5', label: 'Team=V5', valid: true, level: 5, children: ['solution'], solution: true },
  'solution': { id: 'solution', label: 'SOLUTION ✅', valid: true, level: 6, children: [], solution: true },
};

export const cspPerfData: CspPerfRow[] = [
  { method: 'No Heuristic', backtracks: 23, nodes: 89, constraintsChecked: 234, timeMs: 89 },
  { method: 'MRV only', backtracks: 11, nodes: 42, constraintsChecked: 128, timeMs: 34 },
  { method: 'MRV + FC', backtracks: 4, nodes: 18, constraintsChecked: 47, timeMs: 12, best: true },
];

export const cspConstraintMatrix: boolean[][] = [
  [true, true, true, true, true],
  [true, true, true, true, true],
  [true, true, true, true, true],
  [true, true, true, true, true],
  [true, true, true, true, true],
  [true, true, true, true, true],
];

// ─── Tab 4: ML Studio ───

export interface FeatureRow {
  id: number;
  name: string;
  type: string;
  range: string;
  importance: number;
}

export const features: FeatureRow[] = [
  { id: 1, name: 'distance_to_hazard', type: 'Numeric', range: '0–100m', importance: 0.82 },
  { id: 2, name: 'victim_severity', type: 'Ordinal', range: '1–3', importance: 0.78 },
  { id: 3, name: 'road_blockage_prob', type: 'Float', range: '0.0–1.0', importance: 0.71 },
  { id: 4, name: 'aftershock_frequency', type: 'Numeric', range: '0–10/hr', importance: 0.64 },
  { id: 5, name: 'time_elapsed', type: 'Numeric', range: '0–60min', importance: 0.58 },
  { id: 6, name: 'resource_available', type: 'Boolean', range: '0/1', importance: 0.52 },
  { id: 7, name: 'zone_temperature', type: 'Numeric', range: '20–800°', importance: 0.47 },
  { id: 8, name: 'structural_integrity', type: 'Float', range: '0.0–1.0', importance: 0.39 },
];

export const knnAccByK = [71, 74, 84, 85, 83, 82, 80, 79, 78, 77];

export const mlpLossCurve = [
  1.2, 1.05, 0.92, 0.81, 0.72, 0.64, 0.57, 0.51, 0.46, 0.41,
  0.37, 0.34, 0.31, 0.28, 0.26, 0.24, 0.22, 0.21, 0.20, 0.19,
  0.185, 0.18, 0.176, 0.173, 0.17, 0.168, 0.166, 0.164, 0.163, 0.162,
  0.161, 0.16, 0.159, 0.158, 0.197, 0.196, 0.195, 0.194, 0.193, 0.192,
  0.191, 0.19, 0.189, 0.188, 0.187, 0.186, 0.185, 0.184, 0.183, 0.18,
];

export interface ClassMetrics {
  cls: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface ModelEval {
  model: string;
  accuracy: number;
  macroF1: number;
  weightedF1: number;
  classes: ClassMetrics[];
  confusionMatrix: number[][];
  borderColor: string;
  borderGlow: string;
}

export const modelEvals: ModelEval[] = [
  {
    model: 'kNN',
    accuracy: 84,
    macroF1: 0.83,
    weightedF1: 0.84,
    classes: [
      { cls: 'Low Risk', precision: 0.88, recall: 0.84, f1: 0.86, support: 34 },
      { cls: 'Med Risk', precision: 0.79, recall: 0.81, f1: 0.80, support: 38 },
      { cls: 'High Risk', precision: 0.83, recall: 0.85, f1: 0.84, support: 28 },
    ],
    confusionMatrix: [[29, 3, 2], [4, 31, 3], [2, 2, 24]],
    borderColor: 'border-blue-500/30',
    borderGlow: 'glow-blue',
  },
  {
    model: 'Naive Bayes',
    accuracy: 78,
    macroF1: 0.76,
    weightedF1: 0.77,
    classes: [
      { cls: 'Low Risk', precision: 0.81, recall: 0.76, f1: 0.78, support: 34 },
      { cls: 'Med Risk', precision: 0.74, recall: 0.79, f1: 0.76, support: 38 },
      { cls: 'High Risk', precision: 0.77, recall: 0.74, f1: 0.75, support: 28 },
    ],
    confusionMatrix: [[26, 5, 3], [5, 30, 3], [3, 4, 21]],
    borderColor: 'border-purple-500/30',
    borderGlow: 'glow-purple',
  },
  {
    model: 'MLP',
    accuracy: 89,
    macroF1: 0.88,
    weightedF1: 0.88,
    classes: [
      { cls: 'Low Risk', precision: 0.91, recall: 0.88, f1: 0.89, support: 34 },
      { cls: 'Med Risk', precision: 0.85, recall: 0.87, f1: 0.86, support: 38 },
      { cls: 'High Risk', precision: 0.88, recall: 0.89, f1: 0.88, support: 28 },
    ],
    confusionMatrix: [[30, 2, 2], [3, 33, 2], [1, 2, 25]],
    borderColor: 'border-amber-500/30',
    borderGlow: 'glow-amber',
  },
];

export interface MasterCompRow {
  metric: string;
  knn: string;
  nb: string;
  mlp: string;
  best: string;
}

export const masterCompRows: MasterCompRow[] = [
  { metric: 'Accuracy', knn: '84%', nb: '78%', mlp: '89%', best: 'MLP' },
  { metric: 'Precision (avg)', knn: '0.83', nb: '0.77', mlp: '0.88', best: 'MLP' },
  { metric: 'Recall (avg)', knn: '0.83', nb: '0.76', mlp: '0.88', best: 'MLP' },
  { metric: 'F1-Score (avg)', knn: '0.83', nb: '0.76', mlp: '0.88', best: 'MLP' },
  { metric: 'Train Time', knn: '0.8ms', nb: '0.3ms', mlp: '124ms', best: 'NB' },
  { metric: 'Inference Time', knn: '1.2ms', nb: '0.4ms', mlp: '0.9ms', best: 'NB' },
  { metric: 'Used In Agent', knn: '✅ Yes', nb: '✅ Yes', mlp: '✅ Yes', best: '—' },
];

// ─── Tab 5: Analytics ───

export interface ScenarioRow {
  id: string;
  algorithm: string;
  mlModel: string;
  victimsSaved: string;
  avgTime: string;
  riskScore: number;
  optimality: number;
  replanEvents: number;
  best?: boolean;
  outcome: string;
  outcomeColor: string;
}

export const scenarioRows: ScenarioRow[] = [
  { id: 'S1', algorithm: 'BFS', mlModel: 'kNN', victimsSaved: '3/5', avgTime: '6.2m', riskScore: 78, optimality: 0.71, replanEvents: 1, outcome: 'SUBOPTIMAL', outcomeColor: 'red' },
  { id: 'S2', algorithm: 'DFS', mlModel: 'NB', victimsSaved: '3/5', avgTime: '5.8m', riskScore: 82, optimality: 0.64, replanEvents: 0, outcome: 'SUBOPTIMAL', outcomeColor: 'red' },
  { id: 'S3', algorithm: 'Greedy', mlModel: 'kNN', victimsSaved: '4/5', avgTime: '7.1m', riskScore: 54, optimality: 0.79, replanEvents: 2, outcome: 'ADEQUATE', outcomeColor: 'amber' },
  { id: 'S4', algorithm: 'A*+Fuzz', mlModel: 'MLP', victimsSaved: '5/5', avgTime: '8.1m', riskScore: 38, optimality: 0.94, replanEvents: 3, best: true, outcome: 'OPTIMAL ⭐', outcomeColor: 'green' },
];

export const tradeoffData = [
  { scenario: 'S1', time: 6.2, risk: 78 },
  { scenario: 'S2', time: 8.1, risk: 52 },
  { scenario: 'S3', time: 10.4, risk: 31 },
  { scenario: 'S4', time: 9.2, risk: 38 },
  { scenario: 'S5', time: 7.8, risk: 45 },
];

export const TABS = [
  { id: 'live-sim', label: 'Live Simulation', icon: 'Map' },
  { id: 'search-trace', label: 'Search Trace', icon: 'Search' },
  { id: 'csp-solver', label: 'CSP Solver', icon: 'Puzzle' },
  { id: 'ml-studio', label: 'ML Studio', icon: 'Bot' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
] as const;

export type TabId = typeof TABS[number]['id'];
