import type { FuzzyRoutingSnapshot, GridCell, SimulationState } from '../types';

/** Triangular membership: 0 outside [left, right], peak 1 at `peak`. */
function tri(x: number, left: number, peak: number, right: number): number {
  if (x <= left || x >= right) return 0;
  if (x <= peak) return (x - left) / Math.max(1e-9, peak - left);
  return (right - x) / Math.max(1e-9, right - peak);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function aggregateCrispFromGrid(grid: GridCell[][]): {
  hazardCrisp: number;
  uncertaintyCrisp: number;
} {
  let fire = 0;
  let collapse = 0;
  let blocked = 0;
  let riskSum = 0;
  let pass = 0;
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (!cell.passable) {
        blocked++;
        continue;
      }
      if (cell.type === 'fire' || cell.onFire) fire++;
      else if (cell.type === 'collapse') collapse++;
      else if (cell.type === 'road' || cell.type === 'safe') {
        riskSum += cell.risk;
        pass++;
      }
    }
  }
  const meanRisk = pass > 0 ? riskSum / pass : 0;
  const hazardCrisp = clamp(fire * 0.04 + collapse * 0.06 + meanRisk * 1.15, 0, 1);
  const uncertaintyCrisp = clamp(blocked * 0.06 + 0.12 + meanRisk * 0.35, 0, 1);
  return { hazardCrisp, uncertaintyCrisp };
}

function aggregateUrgency(victims: SimulationState['victims']): number {
  const waiting = victims.filter((v) => v.status === 'waiting' || v.status === 'en-route');
  if (waiting.length === 0) return 0.2;
  const sum = waiting.reduce((acc, v) => acc + (100 - v.survivalPct) / 100, 0);
  return clamp(sum / waiting.length, 0, 1);
}

/**
 * Mamdani-style rules with singleton consequents; strength = min(antecedent).
 * When fuzzy is disabled in state, caller should not use this — engine passes neutral weights.
 */
export function evaluateFuzzyRouting(state: SimulationState): FuzzyRoutingSnapshot {
  const { hazardCrisp, uncertaintyCrisp } = aggregateCrispFromGrid(state.grid);
  const urgencyCrisp = aggregateUrgency(state.victims);

  const hLow = tri(hazardCrisp, 0, 0.12, 0.38);
  const hMed = tri(hazardCrisp, 0.22, 0.48, 0.78);
  const hHigh = tri(hazardCrisp, 0.52, 0.82, 1.0);

  const uLow = tri(urgencyCrisp, 0, 0.18, 0.45);
  const uMed = tri(urgencyCrisp, 0.28, 0.55, 0.82);
  const uHigh = tri(urgencyCrisp, 0.5, 0.78, 1.0);

  const xLow = tri(uncertaintyCrisp, 0, 0.15, 0.42);
  const xHigh = tri(uncertaintyCrisp, 0.45, 0.72, 1.0);

  type Rule = {
    name: string;
    strength: number;
    riskMult: number;
    heurW: number;
    cspB: number;
  };

  const rules: Rule[] = [
    {
      name: 'R1: hazard HIGH ∨ urgency HIGH → strong caution',
      strength: Math.min(1, Math.max(hHigh, uHigh)),
      riskMult: 1.32,
      heurW: 1.22,
      cspB: 0.09,
    },
    {
      name: 'R2: hazard MED ∧ urgency MED → moderate caution',
      strength: Math.min(hMed, uMed),
      riskMult: 1.12,
      heurW: 1.08,
      cspB: 0.045,
    },
    {
      name: 'R3: hazard LOW ∧ uncertainty LOW ∧ urgency LOW → speed bias',
      strength: Math.min(hLow, xLow, uLow),
      riskMult: 0.94,
      heurW: 0.92,
      cspB: 0.012,
    },
    {
      name: 'R4: uncertainty HIGH → widen risk buffer',
      strength: xHigh,
      riskMult: 1.1,
      heurW: 1.06,
      cspB: 0.055,
    },
  ];

  let numR = 0;
  let denR = 0;
  let numH = 0;
  let denH = 0;
  let numC = 0;
  let denC = 0;
  const firedRules: string[] = [];
  for (const r of rules) {
    if (r.strength < 0.04) continue;
    firedRules.push(`${r.name} (μ=${r.strength.toFixed(2)})`);
    numR += r.strength * r.riskMult;
    denR += r.strength;
    numH += r.strength * r.heurW;
    denH += r.strength;
    numC += r.strength * r.cspB;
    denC += r.strength;
  }

  const riskStepMultiplier =
    denR > 0 ? clamp(numR / denR, 0.88, 1.42) : clamp(1 + hazardCrisp * 0.12 + urgencyCrisp * 0.1, 0.9, 1.35);
  const heuristicRiskWeight =
    denH > 0 ? clamp(numH / denH, 0.85, 1.38) : clamp(1 + hazardCrisp * 0.08, 0.9, 1.28);
  const cspPriorityBump = denC > 0 ? clamp(numC / denC, 0, 0.12) : clamp(urgencyCrisp * 0.06, 0, 0.1);

  const explanation =
    `Fuzzy: hazard=${hazardCrisp.toFixed(2)} urgency=${urgencyCrisp.toFixed(2)} uncertainty=${uncertaintyCrisp.toFixed(
      2
    )} → step×${riskStepMultiplier.toFixed(2)} hRisk×${heuristicRiskWeight.toFixed(2)} CSP+${cspPriorityBump.toFixed(
      3
    )}`;

  return {
    riskStepMultiplier,
    heuristicRiskWeight,
    cspPriorityBump,
    hazardCrisp,
    urgencyCrisp,
    uncertaintyCrisp,
    explanation,
    firedRules,
  };
}
