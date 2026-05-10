import type { SimulationState, Victim } from '../types';

export function formatSeverityUpper(s: Victim['severity']): string {
  if (s === 'critical') return 'CRITICAL';
  if (s === 'moderate') return 'MODERATE';
  return 'MINOR';
}

function sortDispatchQueue(victims: Victim[]): Victim[] {
  const active = victims.filter((v) => v.status === 'waiting' || v.status === 'en-route');
  return [...active].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    if (a.survivalPct !== b.survivalPct) return a.survivalPct - b.survivalPct;
    return a.id.localeCompare(b.id);
  });
}

function primaryReason(
  v: Victim,
  estimates: SimulationState['victimMlEstimates']
): string {
  const parts: string[] = [];
  parts.push(`CSP priorityScore ${v.priorityScore.toFixed(1)} (severity + survival pressure).`);
  parts.push(`Survival ${v.survivalPct}%.`);
  const ml = estimates[v.id];
  if (ml) {
    const lab = ['low', 'med', 'high'][ml.predictedClass] ?? '?';
    parts.push(`Active ML (${lab} risk class, est. ${ml.survivalEstimatePct}% at last CSP).`);
  }
  return parts.join(' ');
}

function objectiveNarrative(o: SimulationState['objectivePriority']): { title: string; tradeoff: string } {
  switch (o) {
    case 'MinimizeTime':
      return {
        title: 'Minimize Time',
        tradeoff:
          'Routing favors shorter paths; higher-risk cells are cheaper to traverse than under Minimize Risk.',
      };
    case 'MinimizeRisk':
      return {
        title: 'Minimize Risk',
        tradeoff:
          'Routing penalizes hazardous cells more strongly; paths may be longer to avoid fire/collapse corridors.',
      };
    case 'Balanced':
      return {
        title: 'Balanced',
        tradeoff: 'Routing blends travel cost and risk exposure (moderate penalties on risky cells).',
      };
    default: {
      const _e: never = o;
      return { title: String(_e), tradeoff: '' };
    }
  }
}

function cspFirstLegHint(state: SimulationState): string | null {
  const sol = state.cspSolution;
  if (!sol) return null;
  const f1 = sol.amb1Victims[0] ?? null;
  const f2 = sol.amb2Victims[0] ?? null;
  const queued = sol.queuedVictims;
  const ridesWith = sol.teamRidesWith;
  const bits: string[] = [];
  if (f1) bits.push(`Amb1 first: ${f1}`);
  if (f2) bits.push(`Amb2 first: ${f2}`);
  if (ridesWith) bits.push(`Team rides ${ridesWith}`);
  if (queued.length > 0) bits.push(`Queued: ${queued.join(',')}`);
  if (bits.length === 0) return null;
  return `Last CSP allocation — ${bits.join(' · ')}.`;
}

/**
 * Live copy for the Right Panel “Priority Reasoning” card (no routing/CSP logic changes).
 */
export interface PrioritizedVictim {
  id: string;
  severity: Victim['severity'];
  reason: string;
  score: number;
  survival: number;
}

export function buildPriorityReasoning(state: SimulationState): {
  hasQueue: boolean;
  fullQueue: PrioritizedVictim[];
  objectiveTitle: string;
  tradeoffLine: string;
  fuzzyNote: string;
  cspHint: string | null;
} {
  const queue = sortDispatchQueue(state.victims);
  const obj = objectiveNarrative(state.objectivePriority);
  const fuzzyNote = state.fuzzyLogicEnabled
    ? 'Fuzzy routing is ON — edge risk costs and CSP bumps follow the last fuzzy snapshot after each replan.'
    : 'Fuzzy routing is OFF — crisp edge costs for search and neutral CSP bump from fuzzy.';
  const cspHint = cspFirstLegHint(state);

  const fullQueue: PrioritizedVictim[] = queue.map((v) => ({
    id: v.id,
    severity: v.severity,
    reason: primaryReason(v, state.victimMlEstimates),
    score: v.priorityScore,
    survival: v.survivalPct,
  }));

  return {
    hasQueue: fullQueue.length > 0,
    fullQueue,
    objectiveTitle: obj.title,
    tradeoffLine: obj.tradeoff,
    fuzzyNote,
    cspHint,
  };
}

export function severityAccentClass(sev: Victim['severity']): string {
  if (sev === 'critical') return 'text-red-400';
  if (sev === 'moderate') return 'text-amber-400';
  return 'text-green-400';
}
