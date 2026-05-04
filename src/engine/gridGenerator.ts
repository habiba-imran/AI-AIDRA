import type {
  Ambulance,
  CellType,
  GridCell,
  RescueTeam,
  Victim,
} from '../types';

const GRID_DIM = 18;

function createSeededRandom() {
  let seed = 42;
  return function seededRandom(): number {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

export function generateGrid(): GridCell[][] {
  const seededRandom = createSeededRandom();

  const fireCoords = new Set<string>([
    cellKey(3, 4),
    cellKey(3, 5),
    cellKey(4, 4),
    cellKey(4, 5),
    cellKey(4, 6),
    cellKey(8, 8),
    cellKey(8, 9),
    cellKey(9, 8),
    cellKey(9, 9),
  ]);
  const collapseCoords = new Set<string>([
    cellKey(6, 10),
    cellKey(6, 11),
    cellKey(7, 10),
  ]);
  const blockedCoords = new Set<string>([
    cellKey(5, 8),
    cellKey(5, 9),
    cellKey(12, 3),
    cellKey(12, 4),
    cellKey(15, 12),
  ]);
  const safeCoords = new Set<string>([
    cellKey(2, 15),
    cellKey(2, 16),
    cellKey(3, 15),
    cellKey(10, 1),
    cellKey(10, 2),
    cellKey(16, 14),
  ]);

  const grid: GridCell[][] = [];
  for (let row = 0; row < GRID_DIM; row++) {
    const rowCells: GridCell[] = [];
    for (let col = 0; col < GRID_DIM; col++) {
      const key = cellKey(row, col);
      let type: CellType = 'road';
      let risk = 0.05 + seededRandom() * (0.35 - 0.05);
      let passable = true;
      let onFire: boolean | undefined;
      let blocked: boolean | undefined;

      if (row === 0 && col === 0) {
        type = 'base';
        risk = 0.0;
        passable = true;
      } else if (row === 0 && col === 17) {
        type = 'mc1';
        risk = 0.0;
        passable = true;
      } else if (row === 17 && col === 17) {
        type = 'mc2';
        risk = 0.0;
        passable = true;
      } else if (fireCoords.has(key)) {
        type = 'fire';
        risk = 0.85;
        passable = true;
        onFire = true;
      } else if (collapseCoords.has(key)) {
        type = 'collapse';
        risk = 0.7;
        passable = true;
      } else if (blockedCoords.has(key)) {
        type = 'blocked';
        risk = 0.0;
        passable = false;
        blocked = true;
      } else if (safeCoords.has(key)) {
        type = 'safe';
        risk = 0.05;
        passable = true;
      }

      rowCells.push({
        row,
        col,
        type,
        risk,
        passable,
        ...(onFire !== undefined ? { onFire } : {}),
        ...(blocked !== undefined ? { blocked } : {}),
      });
    }
    grid.push(rowCells);
  }
  return grid;
}

export function generateInitialVictims(): Victim[] {
  return [
    {
      id: 'V1',
      row: 3,
      col: 7,
      severity: 'critical',
      status: 'waiting',
      assignedTo: null,
      survivalPct: 71,
      eta: null,
      priorityScore: 0.92,
    },
    {
      id: 'V2',
      row: 7,
      col: 3,
      severity: 'critical',
      status: 'waiting',
      assignedTo: null,
      survivalPct: 58,
      eta: null,
      priorityScore: 0.88,
    },
    {
      id: 'V3',
      row: 10,
      col: 12,
      severity: 'moderate',
      status: 'waiting',
      assignedTo: null,
      survivalPct: 84,
      eta: null,
      priorityScore: 0.61,
    },
    {
      id: 'V4',
      row: 14,
      col: 6,
      severity: 'moderate',
      status: 'waiting',
      assignedTo: null,
      survivalPct: 79,
      eta: null,
      priorityScore: 0.57,
    },
    {
      id: 'V5',
      row: 16,
      col: 9,
      severity: 'minor',
      status: 'waiting',
      assignedTo: null,
      survivalPct: 93,
      eta: null,
      priorityScore: 0.31,
    },
  ];
}

export function generateInitialAmbulances(): Ambulance[] {
  return [
    {
      id: 'Amb1',
      label: 'Ambulance 1',
      status: 'idle',
      assignedVictims: [],
      capacity: 2,
      currentRow: 0,
      currentCol: 0,
      routeColor: '#3b82f6',
      route: [],
      eta: null,
    },
    {
      id: 'Amb2',
      label: 'Ambulance 2',
      status: 'idle',
      assignedVictims: [],
      capacity: 2,
      currentRow: 0,
      currentCol: 0,
      routeColor: '#22d3ee',
      route: [],
      eta: null,
    },
  ];
}

export function generateInitialRescueTeam(): RescueTeam {
  return {
    id: 'Team1',
    label: 'Rescue Team Alpha',
    status: 'idle',
    assignedVictim: null,
    currentRow: 0,
    currentCol: 0,
    route: [],
    eta: null,
  };
}
