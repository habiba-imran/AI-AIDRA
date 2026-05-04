import type { GridCell, ObjectivePriority, SearchNode } from '../types';

export function manhattanDistance(
  row: number,
  col: number,
  goalRow: number,
  goalCol: number
): number {
  return Math.abs(row - goalRow) + Math.abs(col - goalCol);
}

export function riskWeightedHeuristic(
  row: number,
  col: number,
  goalRow: number,
  goalCol: number,
  cellRisk: number,
  weight = 1.0
): number {
  const distance = manhattanDistance(row, col, goalRow, goalCol);
  const riskPenalty = cellRisk * 5;
  return (distance + riskPenalty) * weight;
}

/**
 * Edge cost for search / local search.
 * `fuzzyRiskStepMultiplier` scales the risk-sensitive part when fuzzy logic is active (Phase 5).
 */
export function stepCost(
  cell: GridCell,
  objectivePriority: ObjectivePriority,
  fuzzyRiskStepMultiplier = 1
): number {
  const baseCost = 1;
  const m = fuzzyRiskStepMultiplier;
  if (objectivePriority === 'MinimizeRisk') {
    return baseCost + cell.risk * 10 * m;
  }
  if (objectivePriority === 'MinimizeTime') {
    return baseCost + cell.risk * 1.2 * (m - 1);
  }
  return baseCost + cell.risk * 3 * m;
}

export function getNeighbors(row: number, col: number, grid: GridCell[][]): GridCell[] {
  const neighbors: GridCell[] = [];
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  directions.forEach(([dr, dc]) => {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < 18 && nc >= 0 && nc < 18 && grid[nr][nc].passable) {
      neighbors.push(grid[nr][nc]);
    }
  });
  return neighbors;
}

export function calculatePathRisk(
  path: Array<{ row: number; col: number }>,
  grid: GridCell[][]
): number {
  return path.reduce((total, cell) => total + grid[cell.row][cell.col].risk, 0);
}

export function reconstructPath(node: SearchNode): Array<{ row: number; col: number }> {
  const path: Array<{ row: number; col: number }> = [];
  let current: SearchNode | null = node;
  while (current !== null) {
    path.unshift({ row: current.row, col: current.col });
    current = current.parent;
  }
  return path;
}
