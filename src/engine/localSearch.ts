import type { GridCell, LocalSearch, LocalSearchResult, ObjectivePriority } from '../types';
import { getNeighbors, stepCost } from './heuristics';

function calculatePathCost(
  path: Array<{ row: number; col: number }>,
  grid: GridCell[][],
  objectivePriority: ObjectivePriority,
  fuzzyRiskStepMultiplier = 1
): number {
  return path.reduce((total, cell, i) => {
    if (i === 0) return total;
    return total + stepCost(grid[cell.row][cell.col], objectivePriority, fuzzyRiskStepMultiplier);
  }, 0);
}

function isPathConnected(path: Array<{ row: number; col: number }>): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const dr = Math.abs(path[i + 1].row - path[i].row);
    const dc = Math.abs(path[i + 1].col - path[i].col);
    if (dr + dc !== 1) return false;
  }
  return true;
}

export function runHillClimbing(
  grid: GridCell[][],
  initialPath: Array<{ row: number; col: number }>,
  _goalRow: number,
  _goalCol: number,
  objectivePriority: ObjectivePriority,
  fuzzyRiskStepMultiplier = 1
): LocalSearchResult {
  if (initialPath.length === 0) {
    return {
      algorithm: 'HillClimbing',
      initialCost: 0,
      finalCost: 0,
      iterations: 0,
      improvement: 0,
      path: [],
    };
  }

  let currentPath = [...initialPath];
  let currentCost = calculatePathCost(currentPath, grid, objectivePriority, fuzzyRiskStepMultiplier);
  const initialCost = currentCost;
  let iterations = 0;
  const maxIterations = 100;

  while (iterations < maxIterations) {
    iterations++;
    let improved = false;

    for (let i = 1; i < currentPath.length - 1; i++) {
      const neighbors = getNeighbors(currentPath[i].row, currentPath[i].col, grid);

      for (const neighbor of neighbors) {
        const alreadyInPath = currentPath.some(
          (p) => p.row === neighbor.row && p.col === neighbor.col
        );
        if (alreadyInPath) continue;

        const newPath = [
          ...currentPath.slice(0, i),
          { row: neighbor.row, col: neighbor.col },
          ...currentPath.slice(i + 1),
        ];

        if (!isPathConnected(newPath)) continue;

        const newCost = calculatePathCost(newPath, grid, objectivePriority, fuzzyRiskStepMultiplier);

        if (newCost < currentCost) {
          currentPath = newPath;
          currentCost = newCost;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }

    if (!improved) break;
  }

  const improvementPct =
    initialCost === 0
      ? 0
      : parseFloat((((initialCost - currentCost) / initialCost) * 100).toFixed(1));

  return {
    algorithm: 'HillClimbing',
    initialCost: parseFloat(initialCost.toFixed(2)),
    finalCost: parseFloat(currentCost.toFixed(2)),
    iterations,
    improvement: improvementPct,
    path: currentPath,
  };
}

export function runSimulatedAnnealing(
  grid: GridCell[][],
  initialPath: Array<{ row: number; col: number }>,
  objectivePriority: ObjectivePriority,
  fuzzyRiskStepMultiplier = 1
): LocalSearchResult {
  if (initialPath.length === 0) {
    return {
      algorithm: 'SimulatedAnnealing',
      initialCost: 0,
      finalCost: 0,
      iterations: 0,
      improvement: 0,
      path: [],
    };
  }

  let currentPath = [...initialPath];
  let currentCost = calculatePathCost(currentPath, grid, objectivePriority, fuzzyRiskStepMultiplier);
  const initialCost = currentCost;
  let bestPath = [...currentPath];
  let bestCost = currentCost;

  let temperature = 100.0;
  const coolingRate = 0.95;
  const minTemp = 0.01;
  let iterations = 0;

  while (temperature > minTemp) {
    iterations++;

    if (currentPath.length < 3) break;

    const i = 1 + Math.floor(Math.random() * (currentPath.length - 2));
    const neighbors = getNeighbors(currentPath[i].row, currentPath[i].col, grid);

    if (neighbors.length === 0) {
      temperature *= coolingRate;
      continue;
    }

    const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
    const alreadyInPath = currentPath.some(
      (p) => p.row === neighbor.row && p.col === neighbor.col
    );
    if (alreadyInPath) {
      temperature *= coolingRate;
      continue;
    }

    const newPath = [
      ...currentPath.slice(0, i),
      { row: neighbor.row, col: neighbor.col },
      ...currentPath.slice(i + 1),
    ];

    if (!isPathConnected(newPath)) {
      temperature *= coolingRate;
      continue;
    }

    const newCost = calculatePathCost(newPath, grid, objectivePriority, fuzzyRiskStepMultiplier);
    const delta = newCost - currentCost;

    if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
      currentPath = newPath;
      currentCost = newCost;
      if (currentCost < bestCost) {
        bestPath = [...currentPath];
        bestCost = currentCost;
      }
    }

    temperature *= coolingRate;
  }

  const improvementPct =
    initialCost === 0
      ? 0
      : parseFloat((((initialCost - bestCost) / initialCost) * 100).toFixed(1));

  return {
    algorithm: 'SimulatedAnnealing',
    initialCost: parseFloat(initialCost.toFixed(2)),
    finalCost: parseFloat(bestCost.toFixed(2)),
    iterations,
    improvement: improvementPct,
    path: bestPath,
  };
}

export function runLocalSearch(
  algorithm: LocalSearch,
  grid: GridCell[][],
  initialPath: Array<{ row: number; col: number }>,
  goalRow: number,
  goalCol: number,
  objectivePriority: ObjectivePriority,
  fuzzyRiskStepMultiplier = 1
): LocalSearchResult {
  switch (algorithm) {
    case 'HillClimbing':
      return runHillClimbing(
        grid,
        initialPath,
        goalRow,
        goalCol,
        objectivePriority,
        fuzzyRiskStepMultiplier
      );
    case 'SimulatedAnnealing':
    default:
      return runSimulatedAnnealing(grid, initialPath, objectivePriority, fuzzyRiskStepMultiplier);
  }
}
