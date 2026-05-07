// Cell types for the 18x18 simulation grid
export type CellType =
  | 'road'
  | 'fire'
  | 'collapse'
  | 'blocked'
  | 'safe'
  | 'mc1'
  | 'mc2'
  | 'base';

export interface GridCell {
  row: number;
  col: number;
  type: CellType;
  risk: number; // 0.0 to 1.0
  passable: boolean;
  onFire?: boolean;
  blocked?: boolean;
}

// Victim data
export type SeverityLevel = 'critical' | 'moderate' | 'minor';
export type VictimStatus = 'waiting' | 'en-route' | 'rescued' | 'lost';

export interface Victim {
  id: string; // 'V1' to 'V5'
  row: number;
  col: number;
  severity: SeverityLevel;
  status: VictimStatus;
  assignedTo: string | null; // 'Amb1' | 'Amb2' | 'Team' | null
  survivalPct: number; // 0-100, decays over time
  eta: number | null; // minutes, null if unassigned
  priorityScore: number; // computed from severity + survival
}

// Ambulance data
export type ResourceStatus = 'idle' | 'en-route' | 'returning' | 'active';

export interface Ambulance {
  id: string; // 'Amb1' | 'Amb2'
  label: string;
  status: ResourceStatus;
  assignedVictims: string[]; // victim IDs, max 2
  capacity: number; // always 2
  currentRow: number;
  currentCol: number;
  route: Array<{ row: number; col: number }>;
  routeColor: string; // '#3b82f6' | '#22d3ee'
  eta: number | null;
}

// Rescue team data
export interface RescueTeam {
  id: string; // 'Team1'
  label: string;
  status: ResourceStatus;
  assignedVictim: string | null;
  currentRow: number;
  currentCol: number;
  route: Array<{ row: number; col: number }>;
  eta: number | null;
}

// Decision log entry
export type LogEntryType = 'normal' | 'replan' | 'event' | 'success' | 'info';

export interface DecisionLogEntry {
  id: string;
  timestamp: string; // 'MM:SS' format
  text: string;
  type: LogEntryType;
}

// KPI data
export interface KPI {
  icon: string;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

// Toast notification
export type ToastType = 'warning' | 'danger' | 'success' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  timestamp: number;
}

// Algorithm selection types
export type SearchAlgorithm = 'BFS' | 'DFS' | 'Greedy' | 'Astar';

export type LocalSearch = 'HillClimbing' | 'SimulatedAnnealing';

export type MLModel = 'kNN' | 'NaiveBayes' | 'MLP';

/** Discrete risk label used by the ML risk classifier (0 = low, 1 = medium, 2 = high). */
export type MlRiskClass = 0 | 1 | 2;

export interface MlPerClassMetrics {
  classLabel: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface MlModelEvalReport {
  modelId: MLModel;
  accuracy: number;
  macroF1: number;
  weightedF1: number;
  trainTimeMs: number;
  confusionMatrix: number[][];
  perClass: MlPerClassMetrics[];
}

/** Trained parameters + test metrics from one end-to-end ML evaluation run. */
export interface MlEvalSnapshot {
  datasetVersion: string;
  totalSamples: number;
  trainSize: number;
  testSize: number;
  classLabels: [string, string, string];
  /** Train-set counts per class [low, med, high]. */
  classCountsTrain: [number, number, number];
  /** Test-set counts per class. */
  classCountsTest: [number, number, number];
  knnK: number;
  /** Test accuracy for k ∈ [1,2,3,5,7,10] (same order as UI buttons). */
  knnAccByK: number[];
  reports: {
    kNN: MlModelEvalReport;
    NaiveBayes: MlModelEvalReport;
    MLP: MlModelEvalReport;
  };
  mlpLossCurve: number[];
  nbClassPriors: [number, number, number];
  /** Serialized kNN training store (for live inference). */
  knnStore: { k: number; trainX: number[][]; trainY: number[] };
  nbStore: GaussianNbStore;
  mlpStore: MlpStore;
}

/** Gaussian NB sufficient statistics for inference. */
export interface GaussianNbStore {
  priors: [number, number, number];
  means: [number[], number[], number[]];
  variances: [number[], number[], number[]];
}

/** Small MLP weights for risk classification (8 → hidden → 3). */
export interface MlpStore {
  w1: number[][];
  b1: number[];
  w2: number[][];
  b2: number[];
}

/** Per-victim ML output after CSP/planning uses the active model. */
export interface VictimMlEstimate {
  predictedClass: MlRiskClass;
  probs: [number, number, number];
  survivalEstimatePct: number;
}

/** Fuzzy inference snapshot: scales search costs and CSP bumps when engine is ON. */
export interface FuzzyRoutingSnapshot {
  riskStepMultiplier: number;
  heuristicRiskWeight: number;
  cspPriorityBump: number;
  hazardCrisp: number;
  urgencyCrisp: number;
  uncertaintyCrisp: number;
  explanation: string;
  firedRules: string[];
}

export type ObjectivePriority = 'MinimizeTime' | 'MinimizeRisk' | 'Balanced';

export type SimSpeed = 'Slow' | 'Normal' | 'Fast';

export type TabId =
  | 'live-sim'
  | 'search-trace'
  | 'csp-solver'
  | 'ml-studio'
  | 'analytics';

// Simulation state (master state object)
export interface SimulationState {
  running: boolean;
  paused: boolean;
  speed: SimSpeed;
  elapsedSeconds: number;
  searchAlgorithm: SearchAlgorithm;
  localSearch: LocalSearch;
  mlModel: MLModel;
  objectivePriority: ObjectivePriority;
  fuzzyLogicEnabled: boolean;
  grid: GridCell[][];
  victims: Victim[];
  ambulances: Ambulance[];
  rescueTeam: RescueTeam;
  decisionLog: DecisionLogEntry[];
  toasts: Toast[];
  kpis: KPI[];
  replanCount: number;
  victimsSaved: number;
  avgRescueTime: number;
  riskExposureScore: number;
  resourceUtilization: number;
  nextVictimSeq: number;
  searchResults: SearchResult | null;
  allAlgoComparisons: AlgoComparison[];
  localSearchResult: LocalSearchResult | null;
  currentRouteAmb1: Array<{ row: number; col: number }>;
  currentRouteAmb2: Array<{ row: number; col: number }>;
  currentRouteTeam: Array<{ row: number; col: number }>;
  cspSolution: CspSolution | null;
  /** Last ML train/eval run; null until user runs evaluation from ML Studio. */
  mlEvalSnapshot: MlEvalSnapshot | null;
  /** Latest per-victim predictions (updated when CSP runs and snapshot exists). */
  victimMlEstimates: Record<string, VictimMlEstimate>;
  /** Last fuzzy routing inference (null when fuzzy off or before first replan). */
  fuzzySnapshot: FuzzyRoutingSnapshot | null;
}

// CSP Variable
export interface CspVariable {
  id: string;
  icon: string;
  label: string;
  domain: string[];
  maxInfo: string;
  current: string[];
  satisfied: boolean;
}

// CSP Constraint
export interface CspConstraint {
  id: string;
  formula: string;
  satisfied: boolean;
}

// Node in backtracking tree
export interface CspTreeNode {
  id: string;
  label: string;
  level: number;
  valid: boolean;
  backtrack: boolean;
  solution: boolean;
  start: boolean;
  children: CspTreeNode[];
  assignmentKey?: string;
}

// One assignment step in the solver trace
export interface CspAssignmentStep {
  variable: string;
  value: string[];
  valid: boolean;
  constraintsChecked: number;
  backtrackedFrom?: string;
}

// Performance comparison row
export interface CspPerfRow {
  method: string;
  backtracks: number;
  nodes: number;
  constraintsChecked: number;
  timeMs: number;
  best: boolean;
}

// Full CSP solution
export interface CspSolution {
  amb1Victims: string[];
  amb2Victims: string[];
  teamVictim: string | null;
  kitsUsed: number;
  satisfied: boolean;
  backtracks: number;
  nodesExplored: number;
  constraintsChecked: number;
  timeMs: number;
  tree: CspTreeNode;
  assignmentSteps: CspAssignmentStep[];
  variables: CspVariable[];
  constraints: CspConstraint[];
  perfComparison: CspPerfRow[];
}

// Search algorithm node
export interface SearchNode {
  row: number;
  col: number;
  g: number;
  h: number;
  f: number;
  parent: SearchNode | null;
  state: NodeState;
}

export type NodeState =
  | 'unvisited'
  | 'visited'
  | 'frontier'
  | 'current'
  | 'path'
  | 'blocked'
  | 'fire'
  | 'start'
  | 'goal';

// One step in the search trace
export interface SearchStep {
  stepNumber: number;
  expandedNode: { row: number; col: number };
  g: number;
  h: number;
  f: number;
  newFrontier: Array<{ row: number; col: number }>;
  gridSnapshot: NodeState[][];
  logText: string;
  logType: 'normal' | 'best' | 'risk' | 'blocked' | 'replan' | 'found';
  nodesVisited: number;
  frontierSize: number;
  pathLength: number;
  solutionCost: number;
}

// Final result of a search run
export interface SearchResult {
  algorithm: SearchAlgorithm;
  path: Array<{ row: number; col: number }>;
  nodesExpanded: number;
  pathCost: number;
  timeMs: number;
  optimal: boolean;
  riskScore: number;
  steps: SearchStep[];
  found: boolean;
}

// For algorithm comparison table
export interface AlgoComparison {
  algo: SearchAlgorithm;
  nodesExpanded: number;
  pathCost: number;
  timeMs: number;
  optimal: boolean;
  riskScore: number;
  recommended: boolean;
}

// For trade-off strategy display
export interface TradeOffStrategy {
  icon: string;
  title: string;
  pathCost: number;
  riskScore: string;
  timeMs: number;
  detail: string;
  borderColor: string;
  recommended: boolean;
}

// Local search result
export interface LocalSearchResult {
  algorithm: LocalSearch;
  initialCost: number;
  finalCost: number;
  iterations: number;
  improvement: number;
  path: Array<{ row: number; col: number }>;
}

/** Actions returned by `useSimulation` (see `src/engine/simulationEngine.ts`). */
export interface SimulationActions {
  startSimulation: () => void;
  pauseSimulation: () => void;
  resetSimulation: () => void;
  setSpeed: (speed: SimSpeed) => void;
  setSearchAlgorithm: (algo: SearchAlgorithm) => void;
  setLocalSearch: (ls: LocalSearch) => void;
  setMLModel: (model: MLModel) => void;
  setObjectivePriority: (obj: ObjectivePriority) => void;
  toggleFuzzyLogic: () => void;
  triggerAfterShock: (row: number, col: number) => void;
  blockRoadAt: (row: number, col: number) => void;
  addVictimAt: (row: number, col: number) => void;
  spreadFireFrom: (row: number, col: number) => void;
  applyAndReplan: () => void;
  clearLog: () => void;
  dismissToast: (id: string) => void;
  onTick: () => void;
  runSearchForAlgorithm: (algo: SearchAlgorithm) => void;
  runCsp: () => void;
  /** Train/eval kNN, Naive Bayes, and MLP on the synthetic risk dataset; stores snapshot in state. */
  runMlEvaluation: () => void;
}
