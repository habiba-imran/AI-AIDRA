import { useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type {
  Ambulance,
  CellType,
  GridCell,
  ObjectivePriority,
  RescueTeam,
  SearchAlgorithm,
  Victim,
} from '../types';

const GRID_SIZE = 18;
/** Column for row/col index labels around the grid */
const AXIS_GUTTER_PX = 24;
/** Fallback before first layout measure */
const DEFAULT_CELL_PX = 22;

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

function severityUi(sev: Victim['severity']): 'Critical' | 'Moderate' | 'Minor' {
  if (sev === 'critical') return 'Critical';
  if (sev === 'moderate') return 'Moderate';
  return 'Minor';
}

function objectiveBannerText(o: ObjectivePriority): string {
  switch (o) {
    case 'MinimizeRisk':
      return 'Objective: Minimize risk';
    case 'MinimizeTime':
      return 'Objective: Minimize time';
    case 'Balanced':
      return 'Objective: Balanced';
    default: {
      const _e: never = o;
      return _e;
    }
  }
}

function algoObjectiveSubtitle(algorithm: SearchAlgorithm, objective: ObjectivePriority): string {
  const algo = algorithm === 'Astar' ? 'A*' : algorithm;
  if (objective === 'MinimizeTime') return `${algo} · time-first`;
  if (objective === 'MinimizeRisk') return `${algo} · time≈risk`;
  return `${algo} · hybrid`;
}

interface CenterPanelProps {
  grid: GridCell[][];
  victims: Victim[];
  ambulances: Ambulance[];
  rescueTeam: RescueTeam;
  objectivePriority: ObjectivePriority;
  searchAlgorithm: SearchAlgorithm;
  routeAmb1?: Array<{ row: number; col: number }>;
  routeAmb2?: Array<{ row: number; col: number }>;
  routeTeam?: Array<{ row: number; col: number }>;
}

export default function CenterPanel({
  grid,
  victims,
  ambulances,
  rescueTeam,
  objectivePriority,
  searchAlgorithm,
  routeAmb1 = [],
  routeAmb2 = [],
  routeTeam = [],
}: CenterPanelProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const mapViewportRef = useRef<HTMLDivElement>(null);
  const gridContentRef = useRef<HTMLDivElement>(null);
  const gridCellAreaRef = useRef<HTMLDivElement>(null);
  const colHeaderRowRef = useRef<HTMLDivElement>(null);
  const [gridScale, setGridScale] = useState(1);
  const [naturalMapSize, setNaturalMapSize] = useState({ w: 424, h: 418 });
  const [mapLayoutWidth, setMapLayoutWidth] = useState(420);
  const [cellPx, setCellPx] = useState(DEFAULT_CELL_PX);
  const [headerRowPx, setHeaderRowPx] = useState(DEFAULT_CELL_PX);

  useLayoutEffect(() => {
    const vp = mapViewportRef.current;
    const content = gridContentRef.current;
    const cellArea = gridCellAreaRef.current;
    const headerRow = colHeaderRowRef.current;
    if (!vp || !content) return;

    const update = () => {
      const cw = vp.clientWidth;
      const ch = vp.clientHeight;
      if (cw <= 0 || ch <= 0) return;

      const nextW = Math.min(600, Math.max(120, cw));
      setMapLayoutWidth(nextW);

      const measure = () => {
        const kw = content.offsetWidth;
        const kh = content.offsetHeight;
        if (kw <= 0 || kh <= 0) return;
        setNaturalMapSize({ w: kw, h: kh });
        setGridScale(Math.min(1, cw / kw, ch / kh));
        const area = gridCellAreaRef.current;
        const hdr = colHeaderRowRef.current;
        if (area) {
          setCellPx(area.clientWidth / GRID_SIZE);
        }
        if (hdr) {
          setHeaderRowPx(hdr.offsetHeight || DEFAULT_CELL_PX);
        }
      };

      requestAnimationFrame(measure);
    };

    const ro = new ResizeObserver(update);
    ro.observe(vp);
    ro.observe(content);
    if (cellArea) ro.observe(cellArea);
    if (headerRow) ro.observe(headerRow);
    update();
    return () => ro.disconnect();
  }, []);

  const cellMap = new Map<string, GridCell>();
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = grid[r]?.[c];
      if (cell) cellMap.set(getCellKey(r, c), cell);
    }
  }

  const victimMap = new Map<string, Victim>();
  victims.forEach((v) => victimMap.set(getCellKey(v.row, v.col), v));

  const ambMap = new Map<string, Ambulance>();
  ambulances.forEach((a) => ambMap.set(getCellKey(a.currentRow, a.currentCol), a));

  const teamKey = getCellKey(rescueTeam.currentRow, rescueTeam.currentCol);

  const routeCellColors = new Map<string, string>();
  routeAmb1.forEach(({ row: r, col: c }) => {
    routeCellColors.set(getCellKey(r, c), '#3b82f6');
  });
  routeAmb2.forEach(({ row: r, col: c }) => {
    routeCellColors.set(getCellKey(r, c), '#22d3ee');
  });
  routeTeam.forEach(({ row: r, col: c }) => {
    routeCellColors.set(getCellKey(r, c), '#eab308');
  });
  ambulances.forEach((amb) => {
    amb.route.forEach(({ row: r, col: c }) => {
      const k = getCellKey(r, c);
      if (!routeCellColors.has(k)) {
        routeCellColors.set(k, amb.routeColor);
      }
    });
  });
  rescueTeam.route.forEach(({ row: r, col: c }) => {
    const k = getCellKey(r, c);
    if (!routeCellColors.has(k)) {
      routeCellColors.set(k, '#eab308');
    }
  });

  const hovered = hoveredCell ? cellMap.get(getCellKey(hoveredCell.row, hoveredCell.col)) : null;

  return (
    <div className="flex-1 min-w-0 min-h-0 h-full overflow-hidden flex items-center justify-center p-1">
      <div
        className="card-glass border border-[#1e293b] rounded-xl overflow-hidden flex flex-col min-h-0 h-full max-h-full w-full max-w-[min(748px,100%,calc(100vw-36rem))] mx-auto shadow-lg shadow-black/20"
      >
          <div className="shrink-0 bg-[#451a03] border-b border-amber-900/50 px-2.5 py-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-amber-400 text-[10px] font-semibold leading-tight truncate">
                {objectiveBannerText(objectivePriority)}
              </span>
            </div>
            <span className="text-amber-500/70 text-[8px] font-mono-display shrink-0 hidden sm:inline">
              {algoObjectiveSubtitle(searchAlgorithm, objectivePriority)}
            </span>
          </div>

          <div className="shrink-0 px-2.5 pt-1.5 pb-0.5 flex items-center justify-between gap-2">
            <span className="text-[9px] font-semibold tracking-[0.12em] text-[#3b82f6] uppercase truncate">
              Grid map
            </span>
            <span className="text-[8px] text-[#64748b] shrink-0">Hover cells</span>
          </div>

          <div
            ref={mapViewportRef}
            className="flex-1 min-h-0 flex items-center justify-center overflow-hidden px-2 pb-1 min-w-0"
          >
            <div
              className="relative flex items-center justify-center overflow-hidden"
              style={{
                width: naturalMapSize.w * gridScale,
                height: naturalMapSize.h * gridScale,
              }}
            >
              <div
                ref={gridContentRef}
                className="relative mx-auto flex flex-col"
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: mapLayoutWidth,
                  transform: `translate(-50%, -50%) scale(${gridScale})`,
                  transformOrigin: 'center center',
                }}
              >
              <div
                ref={colHeaderRowRef}
                className="flex min-w-0"
                style={{ paddingLeft: AXIS_GUTTER_PX }}
              >
                {Array.from({ length: GRID_SIZE }, (_, c) => (
                  <div
                    key={c}
                    className="text-[10px] font-semibold text-[#94a3b8] font-mono-display text-center leading-none flex flex-1 min-w-0 items-center justify-center py-0.5"
                  >
                    {c}
                  </div>
                ))}
              </div>
              <div className="flex min-w-0 items-stretch">
                <div
                  className="flex shrink-0 flex-col justify-stretch gap-0 py-0 pr-1"
                  style={{ width: AXIS_GUTTER_PX }}
                >
                  {Array.from({ length: GRID_SIZE }, (_, r) => (
                    <div
                      key={r}
                      className="flex min-h-0 flex-1 flex-col items-end justify-center pr-0.5"
                    >
                      <span className="text-[10px] font-semibold leading-none text-[#94a3b8] font-mono-display">
                        {r}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  ref={gridCellAreaRef}
                  className="grid aspect-square min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-[#1e293b]"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
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
                        className="relative box-border flex aspect-square size-full min-h-0 min-w-0 cursor-pointer items-center justify-center text-[9px] transition-all duration-100 max-[420px]:text-[8px]"
                        style={{
                          backgroundColor: routeColor ? `${routeColor}15` : bgColor,
                          borderRight: '0.5px solid rgba(255, 255, 255, 0.1)',
                          borderBottom: '0.5px solid rgba(255, 255, 255, 0.1)',
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
                            className={`absolute w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-[#f1f5f9] z-20 ${
                              severityUi(victim.severity) === 'Critical'
                                ? 'bg-red-500 badge-glow-red'
                                : severityUi(victim.severity) === 'Moderate'
                                  ? 'bg-amber-500 badge-glow-amber'
                                  : 'bg-green-500 badge-glow-green'
                            }`}
                          >
                            {victim.id}
                          </div>
                        )}
                        {amb && (
                          <div
                            className="absolute w-4 h-4 rounded-full flex items-center justify-center text-[8px] z-20"
                            style={{
                              backgroundColor: amb.routeColor,
                              boxShadow: `0 0 8px ${amb.routeColor}80`,
                            }}
                          >
                            🚑
                          </div>
                        )}
                        {amb && rescueTeam.ridesWith === amb.id && (
                          <div
                            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-purple-500 z-30 ring-1 ring-[#0a0f1e]"
                            title="Rescue team riding with this ambulance"
                          />
                        )}
                        {isTeam && rescueTeam.ridesWith == null && (
                          <div className="absolute w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-[8px] z-20 glow-amber">
                            👷
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {hovered && hoveredCell && (
                <div
                  className="absolute card-glass p-2.5 z-50 pointer-events-none text-[10px] space-y-0.5 min-w-[180px]"
                  style={{
                    left: Math.min(
                      AXIS_GUTTER_PX + hoveredCell.col * cellPx + 4,
                      AXIS_GUTTER_PX + GRID_SIZE * cellPx - 172
                    ),
                    top: Math.min(
                      headerRowPx + hoveredCell.row * cellPx + 4,
                      headerRowPx + GRID_SIZE * cellPx - 76
                    ),
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
          </div>

          <div className="shrink-0 px-2 pb-1.5 pt-0.5 border-t border-[#1e293b]/80">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[8px] text-[#94a3b8] leading-tight">
              {[
                { color: '#1e293b', label: 'Road' },
                { color: '#450a0a', label: 'Fire Zone', extra: '🔥' },
                { color: '#292524', label: 'Collapse', extra: '⚠' },
                { color: '#09090b', label: 'Blocked', extra: '✕' },
                { color: '#0f2318', label: 'Safe Area' },
                { color: '#1e3a5f', label: 'Medical Ctr', extra: '🏥' },
                { color: '#1c1917', label: 'Base', extra: '⭐' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-0.5">
                  <div className="w-2 h-2 rounded-sm border border-[#334155]" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
              <div className="w-px h-2.5 bg-[#1e293b] mx-0.5" />
              {[
                { color: '#ef4444', label: 'Crit.' },
                { color: '#f59e0b', label: 'Mod.' },
                { color: '#22c55e', label: 'Min.' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-0.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
              <div className="w-px h-2.5 bg-[#1e293b] mx-0.5" />
              {[
                { color: '#3b82f6', label: 'A1' },
                { color: '#06b6d4', label: 'A2' },
                { color: '#eab308', label: 'Team' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-0.5">
                  <div className="w-2 h-1 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
    </div>
  );
}
