import type { SimulationState } from '../types';

function triggerDownload(filename: string, json: unknown) {
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.click();
  URL.revokeObjectURL(url);
}

/** Download decision log + key run metadata for reports / submission. */
export function downloadRunSnapshot(state: SimulationState): void {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  triggerDownload(`aidra-run-${stamp}.json`, {
    exportedAt: new Date().toISOString(),
    elapsedSeconds: state.elapsedSeconds,
    running: state.running,
    paused: state.paused,
    objectivePriority: state.objectivePriority,
    searchAlgorithm: state.searchAlgorithm,
    fuzzyLogicEnabled: state.fuzzyLogicEnabled,
    mlModel: state.mlModel,
    replanCount: state.replanCount,
    victimsSaved: state.victimsSaved,
    avgRescueTime: state.avgRescueTime,
    riskExposureScore: state.riskExposureScore,
    kpis: state.kpis,
    decisionLog: state.decisionLog,
  });
}
