import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { gridCells, victims, ambulances, rescueTeam, type CellType } from '../data/placeholder';

const CELL_SIZE = 32;
const GRID_SIZE = 18;

const cellColors: Record<CellType, string> = {
  road: '#1e293b',
  fire: '#450a0a',
  collapse: '#292524',
  blocked: '#09090b',
  safe: '#0f2318',
  mc1: '#1e3a5f',
  mc2: '#1e3a5f',
  base: '#1c1917',
};

const cellOverlays: Record<CellType, string> = {
  road: '',
  fire: '🔥',
  collapse: '⚠',
  blocked: '✕',
  safe: '',
  mc1: '🏥',
  mc2: '🏥',
  base: '⭐',
};

const cellLabels: Record<CellType, string[]> = {
  road: [],
  fire: [],
  collapse: [],
  blocked: [],
  safe: [],
  mc1: ['MC1'],
  mc2: ['MC2'],
  base: ['BASE'],
};

function getCellKey(row: number, col: number) {
  return `${row}-${col}`;
}

export default function CenterPanel() {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const cellMap = new Map<string, typeof gridCells[0]>();
  gridCells.forEach((c) => cellMap.set(getCellKey(c.row, c.col), c));

  const victimMap = new Map<string, typeof victims[0]>();
  victims.forEach((v) => victimMap.set(getCellKey(v.row, v.col), v));

  const ambMap = new Map<string, typeof ambulances[0]>();
  ambulances.forEach((a) => ambMap.set(getCellKey(a.row, a.col), a));

  const teamKey = getCellKey(rescueTeam.row, rescueTeam.col);

  const routeCellColors = new Map<string, string>();
  ambulances.forEach((amb) => {
    amb.route.forEach(([r, c]) => {
      routeCellColors.set(getCellKey(r, c), amb.routeColor);
    });
  });
  rescueTeam.route.forEach(([r, c]) => {
    routeCellColors.set(getCellKey(r, c), '#eab308');
  });

  const hovered = hoveredCell ? cellMap.get(getCellKey(hoveredCell.row, hoveredCell.col)) : null;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Objective Banner */}
      <div className="shrink-0 bg-[#451a03] border-b border-amber-900/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-amber-400 text-[12px] font-semibold">Active Objective: Minimize Risk Exposure</span>
        </div>
        <span className="text-amber-500/70 text-[10px] font-mono-display">
          Algorithm: A* | Trade-off: +40% Time, -80% Risk
        </span>
      </div>

      {/* Map Title */}
      <div className="shrink-0 px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-[0.15em] text-[#3b82f6] uppercase">
          Urban Disaster Zone — Grid Map
        </span>
        <span className="text-[10px] text-[#64748b]">(hover cell for details)</span>
      </div>

      {/* Grid Map */}
      <div className="flex-1 flex items-start justify-center overflow-auto px-4 pb-2">
        <div className="relative">
          {/* Column labels */}
          <div className="flex ml-[20px]">
            {Array.from({ length: GRID_SIZE }, (_, c) => (
              <div key={c} className="text-[7px] text-[#475569] font-mono-display text-center" style={{ width: CELL_SIZE }}>
                {c}
              </div>
            ))}
          </div>
          <div className="flex">
            {/* Row labels */}
            <div className="flex flex-col mr-1">
              {Array.from({ length: GRID_SIZE }, (_, r) => (
                <div key={r} className="text-[7px] text-[#475569] font-mono-display flex items-center justify-end pr-1" style={{ height: CELL_SIZE }}>
                  {r}
                </div>
              ))}
            </div>
            {/* Grid */}
            <div
              className="grid border border-[#1e293b] rounded-lg overflow-hidden"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
                gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
                const row = Math.floor(i / GRID_SIZE);
                const col = i % GRID_SIZE;
                const key = getCellKey(row, col);
                const cell = cellMap.get(key);
                const victim = victimMap.get(key);
                const amb = ambMap.get(key);
                const isTeam = key === teamKey;
                const routeColor = routeCellColors.get(key);
                const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;

                const bgColor = cell ? cellColors[cell.type] : '#1e293b';
                const overlay = cell ? cellOverlays[cell.type] : '';
                const labels = cell ? cellLabels[cell.type] : [];

                return (
                  <div
                    key={key}
                    className="relative flex items-center justify-center text-[9px] cursor-pointer transition-all duration-100"
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: routeColor ? `${routeColor}15` : bgColor,
                      borderRight: '1px solid #0a0f1e',
                      borderBottom: '1px solid #0a0f1e',
                      boxShadow: isHovered ? '0 0 8px rgba(59,130,246,0.5), inset 0 0 8px rgba(59,130,246,0.2)' : undefined,
                      zIndex: isHovered ? 10 : 1,
                    }}
                    onMouseEnter={() => setHoveredCell({ row, col })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {overlay && (
                      <span className="absolute text-[8px] opacity-70 select-none">{overlay}</span>
                    )}
                    {labels.length > 0 && (
                      <span className="absolute text-[7px] font-bold text-[#f1f5f9]/80 select-none">{labels[0]}</span>
                    )}
                    {routeColor && !victim && !amb && !isTeam && (
                      <div
                        className="absolute w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: routeColor, opacity: 0.6 }}
                      />
                    )}
                    {victim && (
                      <div
                        className={`absolute w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-[#f1f5f9] z-20 ${
                          victim.severity === 'Critical'
                            ? 'bg-red-500 badge-glow-red'
                            : victim.severity === 'Moderate'
                              ? 'bg-amber-500 badge-glow-amber'
                              : 'bg-green-500 badge-glow-green'
                        }`}
                      >
                        {victim.id}
                      </div>
                    )}
                    {amb && (
                      <div
                        className="absolute w-5 h-5 rounded-full flex items-center justify-center text-[10px] z-20"
                        style={{
                          backgroundColor: amb.routeColor,
                          boxShadow: `0 0 8px ${amb.routeColor}80`,
                        }}
                      >
                        🚑
                      </div>
                    )}
                    {isTeam && (
                      <div className="absolute w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-[10px] z-20 glow-amber">
                        👷
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hover Tooltip */}
          {hovered && hoveredCell && (
            <div
              className="absolute card-glass p-2.5 z-50 pointer-events-none text-[10px] space-y-0.5 min-w-[180px]"
              style={{
                left: Math.min(hoveredCell.col * CELL_SIZE + CELL_SIZE + 28, GRID_SIZE * CELL_SIZE - 180),
                top: Math.min(hoveredCell.row * CELL_SIZE + 20, GRID_SIZE * CELL_SIZE - 80),
              }}
            >
              <div className="text-[#f1f5f9] font-semibold">
                Cell ({hoveredCell.row}, {hoveredCell.col})
              </div>
              <div className="text-[#94a3b8]">
                Type: <span className="text-[#f1f5f9] capitalize">{
                  hovered.type === 'mc1' || hovered.type === 'mc2' ? 'Medical Center' :
                  hovered.type === 'base' ? 'Rescue Base' : hovered.type
                }</span>
              </div>
              <div className="text-[#94a3b8]">
                Risk: <span className="text-amber-400">{hovered.risk.toFixed(2)}</span>
              </div>
              <div className="text-[#94a3b8]">
                Passable: <span className={hovered.passable ? 'text-green-400' : 'text-red-400'}>
                  {hovered.passable ? 'Yes' : 'No'}{hovered.passable && hovered.risk > 0.5 ? ' (penalty)' : ''}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Legend */}
      <div className="shrink-0 px-4 pb-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-[#94a3b8]">
          {[
            { color: '#1e293b', label: 'Road' },
            { color: '#450a0a', label: 'Fire Zone', extra: '🔥' },
            { color: '#292524', label: 'Collapse', extra: '⚠' },
            { color: '#09090b', label: 'Blocked', extra: '✕' },
            { color: '#0f2318', label: 'Safe Area' },
            { color: '#1e3a5f', label: 'Medical Ctr', extra: '🏥' },
            { color: '#1c1917', label: 'Base', extra: '⭐' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm border border-[#334155]" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
          <div className="w-px h-3 bg-[#1e293b] mx-1" />
          {[
            { color: '#ef4444', label: 'Critical Victim' },
            { color: '#f59e0b', label: 'Moderate Victim' },
            { color: '#22c55e', label: 'Minor Victim' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
          <div className="w-px h-3 bg-[#1e293b] mx-1" />
          {[
            { color: '#3b82f6', label: 'Amb1 Route' },
            { color: '#06b6d4', label: 'Amb2 Route' },
            { color: '#eab308', label: 'Team Route' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
