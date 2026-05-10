import type {
  AlgoComparison,
  GridCell,
  NodeState,
  ObjectivePriority,
  SearchAlgorithm,
  SearchNode,
  SearchResult,
  SearchStep,
} from '../types';
import {
  calculatePathRisk,
  getNeighbors,
  manhattanDistance,
  reconstructPath,
  riskWeightedHeuristic,
  stepCost,
} from './heuristics';

function buildNodeStateGrid(grid: GridCell[][]): NodeState[][] {
  return grid.map((row) =>
    row.map((cell) => {
      if (!cell.passable) return 'blocked';
      if (cell.type === 'fire') return 'fire';
      return 'unvisited';
    })
  );
}

function cloneSnapshot(g: NodeState[][]): NodeState[][] {
  return g.map((r) => [...r]);
}

function buildLogText(
  step: number,
  row: number,
  col: number,
  g: number,
  h: number,
  f: number,
  isBest: boolean,
  isRisk: boolean,
  isBlocked: boolean,
  frontierSize: number
): { text: string; type: SearchStep['logType'] } {
  if (isBlocked) {
    return {
      text:
        `[Step ${String(step).padStart(2, '0')}] ` +
        `BLOCKED (${row},${col}) → skipped ✕`,
      type: 'blocked',
    };
  }
  if (isRisk) {
    return {
      text:
        `[Step ${String(step).padStart(2, '0')}] ` +
        `HIGH RISK (${row},${col}) → ` +
        `risk penalty applied`,
      type: 'risk',
    };
  }
  const best = isBest ? ' ← BEST' : '';
  return {
    text:
      `[Step ${String(step).padStart(2, '0')}] ` +
      `Expand (${row},${col}) ` +
      `g=${g.toFixed(1)} h=${h.toFixed(1)} ` +
      `f=${f.toFixed(1)} | ` +
      `frontier=${frontierSize}${best}`,
    type: isBest ? 'best' : 'normal',
  };
}

export function runBFS(
  grid: GridCell[][],
  startRow: number,
  startCol: number,
  goalRow: number,
  goalCol: number,
  objectivePriority: ObjectivePriority,
  fuzzyRiskStep = 1
): SearchResult {
  const startTime = performance.now();
  const steps: SearchStep[] = [];
  const stateGrid = buildNodeStateGrid(grid);
  const visited = new Set<string>();
  const enqueued = new Set<string>();
  const queue: SearchNode[] = [];
  let nodesExpanded = 0;
  let stepNumber = 0;

  const startKey = `${startRow},${startCol}`;
  const startNode: SearchNode = {
    row: startRow,
    col: startCol,
    g: 0,
    h: manhattanDistance(startRow, startCol, goalRow, goalCol),
    f: 0,
    parent: null,
    state: 'start',
  };
  startNode.f = startNode.g + startNode.h;
  queue.push(startNode);
  enqueued.add(startKey);
  stateGrid[startRow][startCol] = 'start';

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.row},${current.col}`;
    if (visited.has(key)) continue;
    visited.add(key);
    nodesExpanded++;
    stepNumber++;

    stateGrid[current.row][current.col] = 'current';

    const isRisk = grid[current.row][current.col].risk > 0.6;
    const { text, type } = buildLogText(
      stepNumber,
      current.row,
      current.col,
      current.g,
      current.h,
      current.f,
      false,
      isRisk,
      false,
      queue.length
    );

    if (current.row === goalRow && current.col === goalCol) {
      const path = reconstructPath(current);
      stateGrid[goalRow][goalCol] = 'goal';
      path.forEach((p) => {
        if (stateGrid[p.row][p.col] !== 'start' && stateGrid[p.row][p.col] !== 'goal') {
          stateGrid[p.row][p.col] = 'path';
        }
      });
      steps.push({
        stepNumber,
        expandedNode: { row: current.row, col: current.col },
        g: current.g,
        h: current.h,
        f: current.f,
        newFrontier: queue.map((n) => ({ row: n.row, col: n.col })),
        gridSnapshot: cloneSnapshot(stateGrid),
        logText:
          `[Step ${stepNumber}] ` +
          `✅ GOAL REACHED (${goalRow},${goalCol}) — path found!`,
        logType: 'found',
        nodesVisited: nodesExpanded,
        frontierSize: queue.length,
        pathLength: path.length,
        solutionCost: current.g,
      });
      const timeMs = performance.now() - startTime;
      return {
        algorithm: 'BFS',
        path,
        nodesExpanded,
        pathCost: parseFloat(current.g.toFixed(2)),
        timeMs: parseFloat(timeMs.toFixed(2)),
        optimal: true,
        riskScore: parseFloat(calculatePathRisk(path, grid).toFixed(2)),
        steps,
        found: true,
      };
    }

    const neighbors = getNeighbors(current.row, current.col, grid);
    neighbors.forEach((neighbor) => {
      const nKey = `${neighbor.row},${neighbor.col}`;
      if (visited.has(nKey) || enqueued.has(nKey)) return;
      enqueued.add(nKey);
      const g = current.g + stepCost(neighbor, objectivePriority, fuzzyRiskStep);
      const h = manhattanDistance(neighbor.row, neighbor.col, goalRow, goalCol);
      const node: SearchNode = {
        row: neighbor.row,
        col: neighbor.col,
        g,
        h,
        f: g + h,
        parent: current,
        state: 'frontier',
      };
      queue.push(node);
      if (stateGrid[neighbor.row][neighbor.col] === 'unvisited') {
        stateGrid[neighbor.row][neighbor.col] = 'frontier';
      }
    });

    stateGrid[current.row][current.col] = 'visited';
    steps.push({
      stepNumber,
      expandedNode: { row: current.row, col: current.col },
      g: current.g,
      h: current.h,
      f: current.f,
      newFrontier: queue.map((n) => ({ row: n.row, col: n.col })),
      gridSnapshot: cloneSnapshot(stateGrid),
      logText: text,
      logType: type,
      nodesVisited: nodesExpanded,
      frontierSize: queue.length,
      pathLength: 0,
      solutionCost: 0,
    });

    if (steps.length > 500) break;
  }

  const timeMs = performance.now() - startTime;
  return {
    algorithm: 'BFS',
    path: [],
    nodesExpanded,
    pathCost: 0,
    timeMs: parseFloat(timeMs.toFixed(2)),
    optimal: true,
    riskScore: 0,
    steps,
    found: false,
  };
}

export function runDFS(
  grid: GridCell[][],
  startRow: number,
  startCol: number,
  goalRow: number,
  goalCol: number,
  objectivePriority: ObjectivePriority,
  fuzzyRiskStep = 1
): SearchResult {
  const startTime = performance.now();
  const steps: SearchStep[] = [];
  const stateGrid = buildNodeStateGrid(grid);
  const visited = new Set<string>();
  const stack: SearchNode[] = [];
  let nodesExpanded = 0;
  let stepNumber = 0;

  const startNode: SearchNode = {
    row: startRow,
    col: startCol,
    g: 0,
    h: manhattanDistance(startRow, startCol, goalRow, goalCol),
    f: 0,
    parent: null,
    state: 'start',
  };
  startNode.f = startNode.g + startNode.h;
  stack.push(startNode);
  stateGrid[startRow][startCol] = 'start';

  while (stack.length > 0) {
    const current = stack.pop()!;
    const key = `${current.row},${current.col}`;
    if (visited.has(key)) continue;
    visited.add(key);
    nodesExpanded++;
    stepNumber++;

    stateGrid[current.row][current.col] = 'current';

    const isRisk = grid[current.row][current.col].risk > 0.6;
    const { text, type } = buildLogText(
      stepNumber,
      current.row,
      current.col,
      current.g,
      current.h,
      current.f,
      false,
      isRisk,
      false,
      stack.length
    );

    if (current.row === goalRow && current.col === goalCol) {
      const path = reconstructPath(current);
      stateGrid[goalRow][goalCol] = 'goal';
      path.forEach((p) => {
        if (stateGrid[p.row][p.col] !== 'start' && stateGrid[p.row][p.col] !== 'goal') {
          stateGrid[p.row][p.col] = 'path';
        }
      });
      steps.push({
        stepNumber,
        expandedNode: { row: current.row, col: current.col },
        g: current.g,
        h: current.h,
        f: current.f,
        newFrontier: [],
        gridSnapshot: cloneSnapshot(stateGrid),
        logText: `[Step ${stepNumber}] ` + `✅ GOAL REACHED — DFS path found`,
        logType: 'found',
        nodesVisited: nodesExpanded,
        frontierSize: 0,
        pathLength: path.length,
        solutionCost: current.g,
      });
      const timeMs = performance.now() - startTime;
      return {
        algorithm: 'DFS',
        path,
        nodesExpanded,
        pathCost: parseFloat(current.g.toFixed(2)),
        timeMs: parseFloat(timeMs.toFixed(2)),
        optimal: false,
        riskScore: parseFloat(calculatePathRisk(path, grid).toFixed(2)),
        steps,
        found: true,
      };
    }

    const neighbors = getNeighbors(current.row, current.col, grid);
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const neighbor = neighbors[i];
      const nKey = `${neighbor.row},${neighbor.col}`;
      if (!visited.has(nKey)) {
        const g = current.g + stepCost(neighbor, objectivePriority, fuzzyRiskStep);
        const h = manhattanDistance(neighbor.row, neighbor.col, goalRow, goalCol);
        stack.push({
          row: neighbor.row,
          col: neighbor.col,
          g,
          h,
          f: g + h,
          parent: current,
          state: 'frontier',
        });
        if (stateGrid[neighbor.row][neighbor.col] === 'unvisited') {
          stateGrid[neighbor.row][neighbor.col] = 'frontier';
        }
      }
    }

    stateGrid[current.row][current.col] = 'visited';
    steps.push({
      stepNumber,
      expandedNode: { row: current.row, col: current.col },
      g: current.g,
      h: current.h,
      f: current.f,
      newFrontier: stack.map((n) => ({ row: n.row, col: n.col })),
      gridSnapshot: cloneSnapshot(stateGrid),
      logText: text,
      logType: type,
      nodesVisited: nodesExpanded,
      frontierSize: stack.length,
      pathLength: 0,
      solutionCost: 0,
    });

    if (steps.length > 500) break;
  }

  const timeMs = performance.now() - startTime;
  return {
    algorithm: 'DFS',
    path: [],
    nodesExpanded,
    pathCost: 0,
    timeMs: parseFloat(timeMs.toFixed(2)),
    optimal: false,
    riskScore: 0,
    steps,
    found: false,
  };
}

export function runGreedy(
  grid: GridCell[][],
  startRow: number,
  startCol: number,
  goalRow: number,
  goalCol: number,
  objectivePriority: ObjectivePriority,
  fuzzyRiskStep = 1,
  fuzzyHeuristicWeight = 1
): SearchResult {
  const startTime = performance.now();
  const steps: SearchStep[] = [];
  const stateGrid = buildNodeStateGrid(grid);
  const visited = new Set<string>();
  const enqueued = new Set<string>();
  const openList: SearchNode[] = [];
  let nodesExpanded = 0;
  let stepNumber = 0;

  const h0 = manhattanDistance(startRow, startCol, goalRow, goalCol);
  openList.push({
    row: startRow,
    col: startCol,
    g: 0,
    h: h0,
    f: h0,
    parent: null,
    state: 'start',
  });
  enqueued.add(`${startRow},${startCol}`);
  stateGrid[startRow][startCol] = 'start';

  while (openList.length > 0) {
    openList.sort((a, b) => a.h - b.h);
    const current = openList.shift()!;
    const key = `${current.row},${current.col}`;
    if (visited.has(key)) continue;
    visited.add(key);
    nodesExpanded++;
    stepNumber++;

    stateGrid[current.row][current.col] = 'current';
    const isRisk = grid[current.row][current.col].risk > 0.6;
    const minH =
      openList.length > 0 ? Math.min(...openList.map((n) => n.h), current.h) : current.h;
    const isBest = stepNumber === 1 || current.h === minH;
    const { text, type } = buildLogText(
      stepNumber,
      current.row,
      current.col,
      current.g,
      current.h,
      current.f,
      isBest,
      isRisk,
      false,
      openList.length
    );

    if (current.row === goalRow && current.col === goalCol) {
      const path = reconstructPath(current);
      stateGrid[goalRow][goalCol] = 'goal';
      path.forEach((p) => {
        if (stateGrid[p.row][p.col] !== 'start') {
          stateGrid[p.row][p.col] = 'path';
        }
      });
      steps.push({
        stepNumber,
        expandedNode: { row: current.row, col: current.col },
        g: current.g,
        h: current.h,
        f: current.f,
        newFrontier: [],
        gridSnapshot: cloneSnapshot(stateGrid),
        logText: `[Step ${stepNumber}] ` + `✅ GOAL REACHED — Greedy path found`,
        logType: 'found',
        nodesVisited: nodesExpanded,
        frontierSize: 0,
        pathLength: path.length,
        solutionCost: current.g,
      });
      const timeMs = performance.now() - startTime;
      return {
        algorithm: 'Greedy',
        path,
        nodesExpanded,
        pathCost: parseFloat(current.g.toFixed(2)),
        timeMs: parseFloat(timeMs.toFixed(2)),
        optimal: false,
        riskScore: parseFloat(calculatePathRisk(path, grid).toFixed(2)),
        steps,
        found: true,
      };
    }

    const neighbors = getNeighbors(current.row, current.col, grid);
    neighbors.forEach((neighbor) => {
      const nKey = `${neighbor.row},${neighbor.col}`;
      if (visited.has(nKey) || enqueued.has(nKey)) return;
      enqueued.add(nKey);
      const g = current.g + stepCost(neighbor, objectivePriority, fuzzyRiskStep);
      const h = riskWeightedHeuristic(
        neighbor.row,
        neighbor.col,
        goalRow,
        goalCol,
        neighbor.risk,
        fuzzyHeuristicWeight
      );
      openList.push({
        row: neighbor.row,
        col: neighbor.col,
        g,
        h,
        f: h,
        parent: current,
        state: 'frontier',
      });
      if (stateGrid[neighbor.row][neighbor.col] === 'unvisited') {
        stateGrid[neighbor.row][neighbor.col] = 'frontier';
      }
    });

    stateGrid[current.row][current.col] = 'visited';
    steps.push({
      stepNumber,
      expandedNode: { row: current.row, col: current.col },
      g: current.g,
      h: current.h,
      f: current.f,
      newFrontier: openList.map((n) => ({ row: n.row, col: n.col })),
      gridSnapshot: cloneSnapshot(stateGrid),
      logText: text,
      logType: type,
      nodesVisited: nodesExpanded,
      frontierSize: openList.length,
      pathLength: 0,
      solutionCost: 0,
    });

    if (steps.length > 500) break;
  }

  const timeMs = performance.now() - startTime;
  return {
    algorithm: 'Greedy',
    path: [],
    nodesExpanded,
    pathCost: 0,
    timeMs: parseFloat(timeMs.toFixed(2)),
    optimal: false,
    riskScore: 0,
    steps,
    found: false,
  };
}

export function runAstar(
  grid: GridCell[][],
  startRow: number,
  startCol: number,
  goalRow: number,
  goalCol: number,
  objectivePriority: ObjectivePriority,
  fuzzyRiskStep = 1,
  fuzzyHeuristicWeight = 1
): SearchResult {
  const startTime = performance.now();
  const steps: SearchStep[] = [];
  const stateGrid = buildNodeStateGrid(grid);
  const closed = new Set<string>();
  const openList: SearchNode[] = [];
  const gScores = new Map<string, number>();
  let nodesExpanded = 0;
  let stepNumber = 0;

  const h0 = riskWeightedHeuristic(
    startRow,
    startCol,
    goalRow,
    goalCol,
    grid[startRow][startCol].risk,
    fuzzyHeuristicWeight
  );
  const startNode: SearchNode = {
    row: startRow,
    col: startCol,
    g: 0,
    h: h0,
    f: h0,
    parent: null,
    state: 'start',
  };
  openList.push(startNode);
  gScores.set(`${startRow},${startCol}`, 0);
  stateGrid[startRow][startCol] = 'start';

  while (openList.length > 0) {
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;
    const key = `${current.row},${current.col}`;
    const bestG = gScores.get(key);
    if (bestG === undefined || current.g > bestG + 1e-6) continue;
    if (closed.has(key)) continue;
    closed.add(key);
    nodesExpanded++;
    stepNumber++;

    stateGrid[current.row][current.col] = 'current';
    const isRisk = grid[current.row][current.col].risk > 0.6;
    const isBest = openList.length === 0 || current.f <= openList[0].f;
    const { text, type } = buildLogText(
      stepNumber,
      current.row,
      current.col,
      current.g,
      current.h,
      current.f,
      isBest,
      isRisk,
      false,
      openList.length
    );

    if (current.row === goalRow && current.col === goalCol) {
      const path = reconstructPath(current);
      stateGrid[goalRow][goalCol] = 'goal';
      path.forEach((p) => {
        if (stateGrid[p.row][p.col] !== 'start') {
          stateGrid[p.row][p.col] = 'path';
        }
      });
      steps.push({
        stepNumber,
        expandedNode: { row: current.row, col: current.col },
        g: current.g,
        h: current.h,
        f: current.f,
        newFrontier: [],
        gridSnapshot: cloneSnapshot(stateGrid),
        logText:
          `[Step ${stepNumber}] ` +
          `✅ GOAL REACHED — A* optimal ` +
          `path found! cost=${current.g.toFixed(1)}`,
        logType: 'found',
        nodesVisited: nodesExpanded,
        frontierSize: 0,
        pathLength: path.length,
        solutionCost: current.g,
      });
      const timeMs = performance.now() - startTime;
      return {
        algorithm: 'Astar',
        path,
        nodesExpanded,
        pathCost: parseFloat(current.g.toFixed(2)),
        timeMs: parseFloat(timeMs.toFixed(2)),
        optimal: true,
        riskScore: parseFloat(calculatePathRisk(path, grid).toFixed(2)),
        steps,
        found: true,
      };
    }

    const neighbors = getNeighbors(current.row, current.col, grid);
    neighbors.forEach((neighbor) => {
      const nKey = `${neighbor.row},${neighbor.col}`;
      if (closed.has(nKey)) return;

      const tentativeG = current.g + stepCost(neighbor, objectivePriority, fuzzyRiskStep);
      const existingG = gScores.get(nKey) ?? Infinity;

      if (tentativeG < existingG) {
        gScores.set(nKey, tentativeG);
        const h = riskWeightedHeuristic(
          neighbor.row,
          neighbor.col,
          goalRow,
          goalCol,
          neighbor.risk,
          fuzzyHeuristicWeight
        );
        const node: SearchNode = {
          row: neighbor.row,
          col: neighbor.col,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current,
          state: 'frontier',
        };
        openList.push(node);
        if (stateGrid[neighbor.row][neighbor.col] === 'unvisited') {
          stateGrid[neighbor.row][neighbor.col] = 'frontier';
        }
      }
    });

    stateGrid[current.row][current.col] = 'visited';
    steps.push({
      stepNumber,
      expandedNode: { row: current.row, col: current.col },
      g: current.g,
      h: current.h,
      f: current.f,
      newFrontier: openList.map((n) => ({ row: n.row, col: n.col })),
      gridSnapshot: cloneSnapshot(stateGrid),
      logText: text,
      logType: type,
      nodesVisited: nodesExpanded,
      frontierSize: openList.length,
      pathLength: 0,
      solutionCost: 0,
    });

    if (steps.length > 500) break;
  }

  const timeMs = performance.now() - startTime;
  return {
    algorithm: 'Astar',
    path: [],
    nodesExpanded,
    pathCost: 0,
    timeMs: parseFloat(timeMs.toFixed(2)),
    optimal: true,
    riskScore: 0,
    steps,
    found: false,
  };
}

export function runSearch(
  algorithm: SearchAlgorithm,
  grid: GridCell[][],
  startRow: number,
  startCol: number,
  goalRow: number,
  goalCol: number,
  objectivePriority: ObjectivePriority,
  fuzzyRiskStep = 1,
  fuzzyHeuristicWeight = 1
): SearchResult {
  switch (algorithm) {
    case 'BFS':
      return runBFS(grid, startRow, startCol, goalRow, goalCol, objectivePriority, fuzzyRiskStep);
    case 'DFS':
      return runDFS(grid, startRow, startCol, goalRow, goalCol, objectivePriority, fuzzyRiskStep);
    case 'Greedy':
      return runGreedy(
        grid,
        startRow,
        startCol,
        goalRow,
        goalCol,
        objectivePriority,
        fuzzyRiskStep,
        fuzzyHeuristicWeight
      );
    case 'Astar':
    default:
      return runAstar(
        grid,
        startRow,
        startCol,
        goalRow,
        goalCol,
        objectivePriority,
        fuzzyRiskStep,
        fuzzyHeuristicWeight
      );
  }
}

export function runAllAlgorithms(
  grid: GridCell[][],
  objectivePriority: ObjectivePriority,
  fuzzyRiskStep = 1,
  fuzzyHeuristicWeight = 1
): AlgoComparison[] {
  const algorithms: SearchAlgorithm[] = ['BFS', 'DFS', 'Greedy', 'Astar'];
  const results = algorithms.map((algo) =>
    runSearch(algo, grid, 0, 0, 0, 17, objectivePriority, fuzzyRiskStep, fuzzyHeuristicWeight)
  );

  const foundCosts = results.filter((r) => r.found).map((r) => r.pathCost);
  const bestCost = foundCosts.length > 0 ? Math.min(...foundCosts) : Infinity;

  return results.map((r) => ({
    algo: r.algorithm,
    nodesExpanded: r.nodesExpanded,
    pathCost: r.pathCost,
    timeMs: r.timeMs,
    optimal: r.optimal,
    riskScore: r.riskScore,
    recommended: r.algorithm === 'Astar' && r.found && r.pathCost === bestCost,
  }));
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Multi-Victim Search — chains leg-by-leg searches to visit every victim
 *  in nearest-first order, accumulating unified steps with markers for
 *  "victim reached" events. Used exclusively by the Search Trace page.
 * ═══════════════════════════════════════════════════════════════════════════ */

import type { Victim } from '../types';

export interface MultiVictimSearchResult {
  algorithm: SearchAlgorithm;
  /** Concatenated steps across all legs. */
  steps: SearchStep[];
  /** Full path from start through all rescued victims. */
  fullPath: Array<{ row: number; col: number }>;
  totalCost: number;
  totalRisk: number;
  totalNodesExpanded: number;
  timeMs: number;
  /** Order in which victims were rescued (nearest-first). */
  rescueOrder: string[];
  /** Mapping from step index → victim ID rescued at that step (if any). */
  rescuedAtStep: Record<number, string>;
  found: boolean;
}

/**
 * Pick the nearest reachable victim from `(fromRow, fromCol)` using Manhattan distance.
 * Falls back to the first remaining victim if distances are tied.
 */
function pickNearestVictim(
  fromRow: number,
  fromCol: number,
  remaining: Victim[]
): Victim | null {
  if (remaining.length === 0) return null;
  let best = remaining[0];
  let bestDist = manhattanDistance(fromRow, fromCol, best.row, best.col);
  for (let i = 1; i < remaining.length; i++) {
    const d = manhattanDistance(fromRow, fromCol, remaining[i].row, remaining[i].col);
    if (d < bestDist) {
      bestDist = d;
      best = remaining[i];
    }
  }
  return best;
}

/**
 * Run a multi-leg search visiting every active victim (nearest-first) on the shared
 * simulation grid. Each leg uses the selected algorithm to pathfind from the current
 * position to the next victim. When the victim's cell is reached the step is annotated
 * with a "victim rescued" marker and the search continues to the next nearest victim.
 *
 * The grid and victim list come directly from the live simulation state, so blocked
 * roads, fires, and dynamic victims are all reflected in the trace.
 */
export function runMultiVictimSearch(
  algorithm: SearchAlgorithm,
  grid: GridCell[][],
  victims: Victim[],
  startRow: number,
  startCol: number,
  objectivePriority: ObjectivePriority,
  fuzzyRiskStep = 1,
  fuzzyHeuristicWeight = 1
): MultiVictimSearchResult {
  const startTime = performance.now();
  const allSteps: SearchStep[] = [];
  const fullPath: Array<{ row: number; col: number }> = [];
  const rescueOrder: string[] = [];
  const rescuedAtStep: Record<number, string> = {};
  let totalCost = 0;
  let totalRisk = 0;
  let totalNodesExpanded = 0;
  let globalStepNumber = 0;

  // Only visit active victims (not already rescued/lost)
  let remaining = victims.filter((v) => v.status !== 'rescued' && v.status !== 'lost');
  let curRow = startRow;
  let curCol = startCol;

  // Build a persistent stateGrid that accumulates across all legs
  const stateGrid = buildNodeStateGrid(grid);
  stateGrid[startRow][startCol] = 'start';

  // Initial step showing the start position
  globalStepNumber++;
  allSteps.push({
    stepNumber: globalStepNumber,
    expandedNode: { row: startRow, col: startCol },
    g: 0,
    h: 0,
    f: 0,
    newFrontier: [],
    gridSnapshot: cloneSnapshot(stateGrid),
    logText: `[Step 01] 🚑 DISPATCH — Starting multi-victim rescue from BASE (${startRow},${startCol}). ${remaining.length} victims to rescue.`,
    logType: 'found',
    nodesVisited: 0,
    frontierSize: 0,
    pathLength: 0,
    solutionCost: 0,
  });

  while (remaining.length > 0) {
    const target = pickNearestVictim(curRow, curCol, remaining);
    if (!target) break;

    // Log the leg target
    globalStepNumber++;
    allSteps.push({
      stepNumber: globalStepNumber,
      expandedNode: { row: curRow, col: curCol },
      g: totalCost,
      h: manhattanDistance(curRow, curCol, target.row, target.col),
      f: totalCost + manhattanDistance(curRow, curCol, target.row, target.col),
      newFrontier: [],
      gridSnapshot: cloneSnapshot(stateGrid),
      logText: `[Step ${String(globalStepNumber).padStart(2, '0')}] 🎯 TARGET — Routing to ${target.id} (${target.severity.toUpperCase()}) at (${target.row},${target.col}). Distance: ${manhattanDistance(curRow, curCol, target.row, target.col)} cells.`,
      logType: 'replan',
      nodesVisited: totalNodesExpanded,
      frontierSize: 0,
      pathLength: fullPath.length,
      solutionCost: totalCost,
    });

    // Run the single-leg search
    const legResult = runSearch(
      algorithm,
      grid,
      curRow,
      curCol,
      target.row,
      target.col,
      objectivePriority,
      fuzzyRiskStep,
      fuzzyHeuristicWeight
    );

    if (!legResult.found) {
      // Victim unreachable — skip and log
      globalStepNumber++;
      allSteps.push({
        stepNumber: globalStepNumber,
        expandedNode: { row: target.row, col: target.col },
        g: totalCost,
        h: 0,
        f: totalCost,
        newFrontier: [],
        gridSnapshot: cloneSnapshot(stateGrid),
        logText: `[Step ${String(globalStepNumber).padStart(2, '0')}] ❌ UNREACHABLE — ${target.id} at (${target.row},${target.col}) cannot be reached. Skipping.`,
        logType: 'blocked',
        nodesVisited: totalNodesExpanded + legResult.nodesExpanded,
        frontierSize: 0,
        pathLength: fullPath.length,
        solutionCost: totalCost,
      });
      totalNodesExpanded += legResult.nodesExpanded;
      remaining = remaining.filter((v) => v.id !== target.id);
      continue;
    }

    // Merge the leg's intermediate expansion steps into the global timeline
    for (const legStep of legResult.steps) {
      globalStepNumber++;
      // Merge the leg's grid snapshot onto the persistent grid
      for (let r = 0; r < 18; r++) {
        for (let c = 0; c < 18; c++) {
          const legState = legStep.gridSnapshot[r]?.[c];
          if (!legState) continue;
          // Only upgrade states — don't un-visit previously visited cells
          if (legState === 'current' || legState === 'frontier') {
            stateGrid[r][c] = legState;
          } else if (legState === 'visited' && stateGrid[r][c] !== 'path' && stateGrid[r][c] !== 'start') {
            stateGrid[r][c] = 'visited';
          } else if (legState === 'path') {
            stateGrid[r][c] = 'path';
          }
        }
      }

      allSteps.push({
        ...legStep,
        stepNumber: globalStepNumber,
        nodesVisited: totalNodesExpanded + legStep.nodesVisited,
        solutionCost: totalCost + (legStep.solutionCost || 0),
        pathLength: fullPath.length + legStep.pathLength,
        gridSnapshot: cloneSnapshot(stateGrid),
        logText: legStep.logText.replace(
          /\[Step \d+\]/,
          `[Step ${String(globalStepNumber).padStart(2, '0')}]`
        ),
      });
    }

    // Mark the path on the persistent grid
    for (const p of legResult.path) {
      if (stateGrid[p.row][p.col] !== 'start') {
        stateGrid[p.row][p.col] = 'path';
      }
    }

    // Append the leg path (skip first cell as it's the previous leg's end)
    const legPath = legResult.path;
    if (fullPath.length > 0 && legPath.length > 0) {
      fullPath.push(...legPath.slice(1));
    } else {
      fullPath.push(...legPath);
    }

    totalCost += legResult.pathCost;
    totalRisk += legResult.riskScore;
    totalNodesExpanded += legResult.nodesExpanded;
    curRow = target.row;
    curCol = target.col;

    // Mark victim as rescued
    remaining = remaining.filter((v) => v.id !== target.id);
    rescueOrder.push(target.id);

    // Add a "RESCUED" step
    globalStepNumber++;
    rescuedAtStep[allSteps.length] = target.id;
    allSteps.push({
      stepNumber: globalStepNumber,
      expandedNode: { row: target.row, col: target.col },
      g: totalCost,
      h: 0,
      f: totalCost,
      newFrontier: [],
      gridSnapshot: cloneSnapshot(stateGrid),
      logText: `[Step ${String(globalStepNumber).padStart(2, '0')}] ✅ RESCUED — ${target.id} (${target.severity.toUpperCase()}) picked up at (${target.row},${target.col}). Cost so far: ${totalCost.toFixed(1)}. Remaining: ${remaining.length} victims.`,
      logType: 'found',
      nodesVisited: totalNodesExpanded,
      frontierSize: 0,
      pathLength: fullPath.length,
      solutionCost: totalCost,
    });
  }

  // Final summary step
  globalStepNumber++;
  allSteps.push({
    stepNumber: globalStepNumber,
    expandedNode: { row: curRow, col: curCol },
    g: totalCost,
    h: 0,
    f: totalCost,
    newFrontier: [],
    gridSnapshot: cloneSnapshot(stateGrid),
    logText: `[Step ${String(globalStepNumber).padStart(2, '0')}] 🏁 MISSION COMPLETE — ${rescueOrder.length} victims rescued. Total cost: ${totalCost.toFixed(1)}. Total risk: ${totalRisk.toFixed(1)}. Nodes expanded: ${totalNodesExpanded}.`,
    logType: 'found',
    nodesVisited: totalNodesExpanded,
    frontierSize: 0,
    pathLength: fullPath.length,
    solutionCost: totalCost,
  });

  const timeMs = performance.now() - startTime;
  return {
    algorithm,
    steps: allSteps,
    fullPath,
    totalCost: parseFloat(totalCost.toFixed(2)),
    totalRisk: parseFloat(totalRisk.toFixed(2)),
    totalNodesExpanded,
    timeMs: parseFloat(timeMs.toFixed(2)),
    rescueOrder,
    rescuedAtStep,
    found: rescueOrder.length > 0,
  };
}
