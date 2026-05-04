import { describe, expect, it } from 'vitest';
import type { AlgoComparison, SearchAlgorithm } from '../types';
import {
  formatPathOptimalityKpi,
  liveAlgoBarGroups,
  pathOptimalityScore,
} from './analyticsLive';

function row(
  algo: AlgoComparison['algo'],
  pathCost: number,
  nodes = 1
): AlgoComparison {
  return {
    algo,
    nodesExpanded: nodes,
    pathCost,
    timeMs: 1,
    optimal: pathCost <= 10,
    riskScore: 0,
    recommended: false,
  };
}

describe('pathOptimalityScore', () => {
  it('returns 1 when selected algorithm matches lowest cost', () => {
    const comparisons: AlgoComparison[] = [
      row('BFS', 12),
      row('Astar', 10),
      row('DFS', 14),
    ];
    expect(pathOptimalityScore(comparisons, 'Astar')).toBe(1);
  });

  it('returns best/selected when selected is suboptimal', () => {
    const comparisons: AlgoComparison[] = [row('BFS', 10), row('Astar', 20)];
    expect(pathOptimalityScore(comparisons, 'Astar')).toBe(0.5);
  });

  it('returns null when no positive path costs', () => {
    const comparisons: AlgoComparison[] = [
      { ...row('BFS', 0), pathCost: 0 },
      { ...row('DFS', 0), pathCost: 0 },
    ];
    expect(pathOptimalityScore(comparisons, 'BFS' as SearchAlgorithm)).toBeNull();
  });
});

describe('formatPathOptimalityKpi', () => {
  it('formats score to two decimals', () => {
    expect(formatPathOptimalityKpi(0.875)).toBe('0.88');
  });
  it('returns em dash for null', () => {
    expect(formatPathOptimalityKpi(null)).toBe('—');
  });
});

describe('liveAlgoBarGroups', () => {
  it('maps Astar label to A*', () => {
    const g = liveAlgoBarGroups([row('Astar', 5.25, 99)]);
    expect(g[0].label).toBe('A*');
    expect(g[0].values).toEqual([99, 5.25]);
  });
});
