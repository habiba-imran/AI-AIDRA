import type { AlgoComparison, CspPerfRow, MlEvalSnapshot, SearchAlgorithm, SimulationState } from '../types';

/** Same fields as `ScenarioRow` in `data/placeholder` (kept here to avoid engine → placeholder imports). */
interface AnalyticsScenarioRow {
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

/** Bar groups for Search section — same shape as placeholder `algoComparisons`. */
export function liveAlgoBarGroups(comparisons: AlgoComparison[]): { label: string; values: number[] }[] {
  return comparisons.map((a) => ({
    label: a.algo === 'Astar' ? 'A*' : a.algo,
    values: [a.nodesExpanded, Math.round(a.pathCost * 100) / 100],
  }));
}

export function liveCspPerfGroups(rows: CspPerfRow[]): { label: string; values: number[] }[] {
  return rows.map((d) => ({
    label: d.method.replace('MRV + Forward Checking', 'MRV+FC'),
    values: [d.backtracks, d.timeMs],
  }));
}

/** Macro F1 average per class → 0–100 scale for bar chart next to accuracy. */
export function liveMlBarGroups(snapshot: MlEvalSnapshot): { label: string; values: number[] }[] {
  const models = ['kNN', 'NaiveBayes', 'MLP'] as const;
  return models.map((id) => {
    const r = snapshot.reports[id];
    const macroF1Avg = r.perClass.reduce((s, c) => s + c.f1, 0) / Math.max(1, r.perClass.length);
    const macroPrec = r.perClass.reduce((s, c) => s + c.precision, 0) / Math.max(1, r.perClass.length);
    const macroRec = r.perClass.reduce((s, c) => s + c.recall, 0) / Math.max(1, r.perClass.length);
    return {
      label: id === 'NaiveBayes' ? 'NB' : id,
      values: [
        Math.round(r.accuracy * 100),
        Math.round(macroPrec * 100),
        Math.round(macroRec * 100),
        Math.round(macroF1Avg * 100),
      ],
    };
  });
}

/**
 * Path optimality in [0, 1]: bestKnownCost / selectedCost (1 = optimal vs peers on same grid).
 * Uses only `allAlgoComparisons` — no change to how routes are computed.
 */
export function pathOptimalityScore(
  comparisons: AlgoComparison[],
  selectedAlgo: SearchAlgorithm
): number | null {
  const positive = comparisons.filter((c) => c.pathCost > 0);
  if (positive.length === 0) return null;
  const best = Math.min(...positive.map((c) => c.pathCost));
  if (best <= 0 || !Number.isFinite(best)) return null;
  const sel = comparisons.find((c) => c.algo === selectedAlgo);
  if (!sel || sel.pathCost <= 0 || !Number.isFinite(sel.pathCost)) return null;
  return Math.min(1, best / sel.pathCost);
}

export function formatPathOptimalityKpi(score: number | null): string {
  if (score === null) return '—';
  return score.toFixed(2);
}

/** One table row for the current session; `optimality` is −1 until a plan exists (UI shows em dash). */
export function liveScenarioRow(state: SimulationState): AnalyticsScenarioRow {
  const saved = state.victims.filter((v) => v.status === 'rescued').length;
  const total = state.victims.length;
  const opt = pathOptimalityScore(state.allAlgoComparisons, state.searchAlgorithm);
  const algoLabel = state.searchAlgorithm === 'Astar' ? 'A*' : state.searchAlgorithm;
  const ml =
    state.mlModel === 'NaiveBayes' ? 'NB' : state.mlModel === 'kNN' ? 'kNN' : 'MLP';
  return {
    id: 'Live',
    algorithm: algoLabel,
    mlModel: ml,
    victimsSaved: `${saved}/${total}`,
    avgTime: state.avgRescueTime > 0 ? `${Math.round(state.avgRescueTime * 10) / 10}m` : '—',
    riskScore: Math.round(state.riskExposureScore),
    optimality: opt === null ? -1 : opt,
    replanEvents: state.replanCount,
    outcome: 'CURRENT SESSION',
    outcomeColor: 'amber',
    best: false,
  };
}
