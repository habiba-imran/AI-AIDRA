import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SkipBack, ChevronLeft, ChevronRight, Play, Zap, Shield, Scale, ChevronUp, ChevronDown, Download, Trash2 } from 'lucide-react';
import type {
  AlgoComparison,
  GridCell,
  LocalSearch,
  LocalSearchResult,
  NodeState,
  ObjectivePriority,
  SearchAlgorithm,
  SearchResult,
  TradeOffStrategy,
  Victim,
} from '../types';
import { runMultiVictimSearch, type MultiVictimSearchResult } from '../engine/search';

const TRACE_GRID = 18;

const algoConfig: Record<
  SearchAlgorithm,
  { label: string; color: string; dotColor: string }
> = {
  BFS: { label: 'BFS', color: '#3b82f6', dotColor: 'bg-blue-500' },
  DFS: { label: 'DFS', color: '#a855f7', dotColor: 'bg-purple-500' },
  Greedy: { label: 'Greedy', color: '#f59e0b', dotColor: 'bg-amber-500' },
  Astar: { label: 'A*', color: '#22c55e', dotColor: 'bg-green-500' },
};

type CellVisualState =
  | NodeState
  | 'goal-mc1'
  | 'goal-mc2';

const cellStateStyles: Record<
  CellVisualState,
  { bg: string; overlay?: string; label?: string; borderGlow?: string }
> = {
  unvisited: { bg: '#1e293b' },
  visited: { bg: '#1e3a5f' },
  frontier: { bg: '#451a03', borderGlow: '0 0 6px rgba(245,158,11,0.4) inset' },
  current: { bg: '#1d4ed8', borderGlow: '0 0 10px rgba(59,130,246,0.8)' },
  path: { bg: '#14532d', borderGlow: '0 -2px 0 #22c55e inset' },
  fire: { bg: '#450a0a', overlay: '🔥' },
  blocked: { bg: '#09090b', overlay: '✕' },
  start: { bg: '#854d0e', label: '⭐' },
  goal: { bg: '#1e3a5f', label: 'MC1' },
  'goal-mc1': { bg: '#1e3a5f', label: 'MC1' },
  'goal-mc2': { bg: '#1e3a5f', label: 'MC2' },
};

const logColorMap = {
  normal: 'text-[#4ade80]',
  best: 'text-[#3b82f6] font-bold',
  risk: 'text-[#f59e0b]',
  blocked: 'text-[#ef4444]',
  replan: 'text-[#f59e0b] font-bold',
  found: 'text-[#f1f5f9] font-bold',
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-semibold tracking-[0.15em] text-[#3b82f6] uppercase mb-2 mt-1">{children}</div>;
}

function mapNodeStateToVisual(s: NodeState): CellVisualState {
  if (s === 'goal') return 'goal';
  return s;
}

function algoDisplayName(a: SearchAlgorithm): string {
  switch (a) {
    case 'BFS':
      return 'BFS';
    case 'DFS':
      return 'DFS';
    case 'Greedy':
      return 'Greedy Best-First';
    case 'Astar':
      return 'A*';
    default: {
      const _e: never = a;
      return _e;
    }
  }
}

function riskScoreLabel(n: number): string {
  if (n < 5) return 'Low';
  if (n < 15) return 'Medium';
  return 'High';
}

function buildTradeRows(comps: AlgoComparison[]): Array<TradeOffStrategy & { border: 'red' | 'green' | 'blue' }> {
  const ok = comps.filter((c) => c.pathCost > 0 || c.riskScore > 0);
  if (ok.length === 0) {
    return [
      {
        icon: '⚡',
        title: 'MINIMIZE TIME (BFS/DFS)',
        pathCost: 0,
        riskScore: 'HIGH',
        timeMs: 0,
        detail: 'Fastest route through hazard zone',
        borderColor: 'red',
        recommended: false,
        border: 'red',
      },
      {
        icon: '🛡',
        title: 'MINIMIZE RISK (A* weighted)',
        pathCost: 0,
        riskScore: 'LOW ✅',
        timeMs: 0,
        detail: '+28% longer but avoids fire zone',
        borderColor: 'green',
        recommended: false,
        border: 'green',
      },
      {
        icon: '⚖',
        title: 'BALANCED (A* standard) ⭐',
        pathCost: 0,
        riskScore: 'MEDIUM',
        timeMs: 0,
        detail: 'Optimal trade-off — selected',
        borderColor: 'blue',
        recommended: true,
        border: 'blue',
      },
    ];
  }
  const byTime = [...ok].sort((a, b) => a.pathCost - b.pathCost)[0];
  const byRisk = [...ok].sort((a, b) => a.riskScore - b.riskScore)[0];
  const astar = ok.find((c) => c.algo === 'Astar') ?? byTime;
  return [
    {
      icon: '⚡',
      title: `MINIMIZE TIME (${algoDisplayName(byTime.algo)})`,
      pathCost: byTime.pathCost,
      riskScore: riskScoreLabel(byTime.riskScore),
      timeMs: byTime.timeMs,
      detail: 'Lowest path cost among compared runs',
      borderColor: 'red',
      recommended: false,
      border: 'red',
    },
    {
      icon: '🛡',
      title: `MINIMIZE RISK (${algoDisplayName(byRisk.algo)})`,
      pathCost: byRisk.pathCost,
      riskScore: riskScoreLabel(byRisk.riskScore),
      timeMs: byRisk.timeMs,
      detail: 'Lowest cumulative path risk',
      borderColor: 'green',
      recommended: false,
      border: 'green',
    },
    {
      icon: '⚖',
      title: `BALANCED (${algoDisplayName(astar.algo)})`,
      pathCost: astar.pathCost,
      riskScore: riskScoreLabel(astar.riskScore),
      timeMs: astar.timeMs,
      detail: 'A* trade-off baseline',
      borderColor: 'blue',
      recommended: astar.recommended,
      border: 'blue',
    },
  ];
}

interface SearchTraceProps {
  searchResult: SearchResult | null;
  allAlgoComparisons: AlgoComparison[];
  grid: GridCell[][];
  victims: Victim[];
  objectivePriority: ObjectivePriority;
  localSearchResult: LocalSearchResult | null;
  localSearchAlgorithm: LocalSearch;
  onRunSearch: (algo: SearchAlgorithm) => void;
  fuzzyRiskStep: number;
  fuzzyHeuristicWeight: number;
}

export default function SearchTrace({
  searchResult,
  allAlgoComparisons,
  grid,
  victims,
  objectivePriority,
  localSearchResult,
  localSearchAlgorithm,
  onRunSearch,
  fuzzyRiskStep,
  fuzzyHeuristicWeight,
}: SearchTraceProps) {
  const [activeAlgo, setActiveAlgo] = useState<SearchAlgorithm>('Astar');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<'Slow' | '1×' | 'Fast'>('1×');
  const [mvResult, setMvResult] = useState<MultiVictimSearchResult | null>(null);
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  
  const logScrollRef = useRef<HTMLDivElement>(null);

  const runForAlgo = useCallback(
    (algo: SearchAlgorithm) => {
      if (grid.length === 0) return;
      const r = runMultiVictimSearch(
        algo, grid, victims, 0, 0,
        objectivePriority, fuzzyRiskStep, fuzzyHeuristicWeight
      );
      setActiveAlgo(algo);
      setMvResult(r);
      setCurrentStep(0);
      setIsPlaying(false);
      onRunSearch(algo);
    },
    [grid, victims, objectivePriority, onRunSearch, fuzzyRiskStep, fuzzyHeuristicWeight]
  );

  useEffect(() => {
    if (grid.length === 0) return;
    setMvResult(
      runMultiVictimSearch(activeAlgo, grid, victims, 0, 0, objectivePriority, fuzzyRiskStep, fuzzyHeuristicWeight)
    );
    setCurrentStep(0);
  }, [grid, victims, objectivePriority, activeAlgo, fuzzyRiskStep, fuzzyHeuristicWeight]);

  const steps = mvResult?.steps ?? [];
  const step = steps[currentStep];
  const maxStepIdx = Math.max(0, steps.length - 1);

  // Compute which victims have been rescued up to the current step
  const rescuedVictimIds = useMemo(() => {
    if (!mvResult) return new Set<string>();
    const ids = new Set<string>();
    for (const [stepIdx, vid] of Object.entries(mvResult.rescuedAtStep)) {
      if (Number(stepIdx) <= currentStep) ids.add(vid);
    }
    return ids;
  }, [mvResult, currentStep]);

  useEffect(() => {
    if (!isPlaying || steps.length === 0) return undefined;
    const ms =
      playbackSpeed === 'Slow' ? 800 : playbackSpeed === 'Fast' ? 50 : 300;
    const id = window.setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= maxStepIdx) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [isPlaying, playbackSpeed, steps.length, maxStepIdx]);

  useEffect(() => {
    const el = logScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [currentStep, isLogExpanded]);

  const emptySnapshot = useMemo(() => {
    const empty: NodeState[][] = [];
    for (let r = 0; r < TRACE_GRID; r++) {
      const row: NodeState[] = [];
      for (let c = 0; c < TRACE_GRID; c++) {
        row.push('unvisited');
      }
      empty.push(row);
    }
    return empty;
  }, []);

  const snapshot = step?.gridSnapshot ?? emptySnapshot;
  const victimMap = useMemo(() => {
    const m = new Map<string, Victim>();
    victims.forEach((v) => m.set(`${v.row}-${v.col}`, v));
    return m;
  }, [victims]);

  const tradeRows = buildTradeRows(allAlgoComparisons.length > 0 ? allAlgoComparisons : []);
  const comparisonRows: AlgoComparison[] =
    allAlgoComparisons.length > 0
      ? allAlgoComparisons
      : (Object.keys(algoConfig) as SearchAlgorithm[]).map((algo) => ({
          algo,
          nodesExpanded: 0,
          pathCost: 0,
          timeMs: 0,
          optimal: false,
          recommended: algo === 'Astar',
          riskScore: 0,
        }));

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top Control Bar */}
      <div className="shrink-0 bg-[#0f172a] border-b border-[#1e293b] px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Algorithm selector */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {(Object.entries(algoConfig) as [SearchAlgorithm, (typeof algoConfig)[SearchAlgorithm]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => runForAlgo(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeAlgo === key
                  ? 'text-[#f1f5f9]'
                  : 'bg-transparent border border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]'
              }`}
              style={activeAlgo === key ? { backgroundColor: cfg.color, boxShadow: `0 0 12px ${cfg.color}60` } : undefined}
            >
              <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
              {cfg.label} {key === 'Astar' && '⭐'}
            </button>
          ))}
        </div>

        {/* Center: Playback controls */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => {
              setCurrentStep(0);
              setIsPlaying(false);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#334155] text-[#94a3b8] text-[10px] hover:bg-[#1e293b] transition-colors cursor-pointer whitespace-nowrap"
          >
            <SkipBack className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#334155] text-[#94a3b8] text-[10px] hover:bg-[#1e293b] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.min(prev + 1, maxStepIdx))}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#334155] text-[#94a3b8] text-[10px] hover:bg-[#1e293b] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#3b82f6] text-[#f1f5f9] text-[10px] glow-blue hover:bg-[#2563eb] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" /> {isPlaying ? 'Pause' : 'Auto Play'}
          </button>
          <div className="flex items-center gap-1 sm:ml-2">
            <span className="text-[9px] text-[#64748b] hidden sm:inline">Speed:</span>
            {(['Slow', '1×', 'Fast'] as const).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-2 py-0.5 rounded text-[9px] font-medium transition-all cursor-pointer ${
                  playbackSpeed === s
                    ? 'bg-[#3b82f6] text-[#f1f5f9] glow-blue'
                    : 'border border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Step info */}
        <div className="flex items-center md:items-end gap-4 md:flex-col md:gap-0.5">
          <span className="font-mono-display text-[15px] text-[#3b82f6] font-bold whitespace-nowrap">
            Step: {steps.length === 0 ? 0 : currentStep + 1}/{steps.length}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 badge-glow-amber whitespace-nowrap">
              {isPlaying ? 'PLAYING…' : 'READY'}
            </span>
            <span className="text-[9px] text-[#64748b] hidden lg:inline">
              {mvResult?.found
                ? `Cost: ${mvResult.totalCost.toFixed(1)} · ${mvResult.rescueOrder.length} rescued`
                : 'Searching...'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Body: Responsive 3-column grid */}
      <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 xl:grid-cols-3">
        {/* Left Column: Square visualizer */}
        <div className="flex flex-col min-h-0 xl:border-r border-[#1e293b] overflow-y-auto p-4">
          <SectionLabel>Search Expansion Visualizer</SectionLabel>

          {/* Search Grid - forced square container */}
          <div className="flex justify-center mb-2 w-full">
            <div className="w-full max-w-[clamp(280px,80dvh,500px)]">
              <div className="flex ml-[1.2rem]">
                {Array.from({ length: TRACE_GRID }, (_, c) => (
                  <div key={`x-${c}`} className="text-[7px] text-[#475569] font-mono-display text-center flex-1">
                    {c}
                  </div>
                ))}
              </div>
              <div className="flex">
                <div className="flex flex-col mr-1 w-[1.2rem]">
                  {Array.from({ length: TRACE_GRID }, (_, r) => (
                    <div key={`y-${r}`} className="text-[7px] text-[#475569] font-mono-display flex items-center justify-end flex-1">
                      {r}
                    </div>
                  ))}
                </div>
                <div
                  className="grid border border-[#1e293b] rounded-lg overflow-hidden w-full aspect-square"
                  style={{
                    gridTemplateColumns: `repeat(${TRACE_GRID}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: TRACE_GRID * TRACE_GRID }, (_, idx) => {
                const row = Math.floor(idx / TRACE_GRID);
                const col = idx % TRACE_GRID;
                const rawState = snapshot[row]?.[col] ?? 'unvisited';
                const visual = mapNodeStateToVisual(rawState);
                const style = cellStateStyles[visual];
                const terrainType = grid[row]?.[col]?.type;
                const victim = victimMap.get(`${row}-${col}`);
                const fVal =
                  step &&
                  step.expandedNode.row === row &&
                  step.expandedNode.col === col
                    ? step.f
                    : undefined;
                  return (
                    <div
                      key={`${row}-${col}`}
                      className="relative flex items-center justify-center text-[9px] cursor-default aspect-square"
                      style={{
                        backgroundColor: style.bg,
                        borderRight: '1px solid #0a0f1e',
                        borderBottom: '1px solid #0a0f1e',
                        boxShadow: style.borderGlow,
                        animation: rawState === 'current' ? 'pulse-dot 1.5s ease-in-out infinite' : undefined,
                      }}
                    >
                      {style.overlay && <span className="absolute text-[8px] opacity-70 select-none">{style.overlay}</span>}
                      {style.label && <span className="absolute text-[7px] font-bold text-[#f1f5f9]/80 select-none">{style.label}</span>}
                      {terrainType === 'base' && (
                        <span className="absolute text-[7px] font-bold text-[#f59e0b] select-none">BASE</span>
                      )}
                      {terrainType === 'mc1' && (
                        <span className="absolute text-[7px] font-bold text-[#93c5fd] select-none">MC1</span>
                      )}
                      {terrainType === 'mc2' && (
                        <span className="absolute text-[7px] font-bold text-[#93c5fd] select-none">MC2</span>
                      )}
                      {(rawState === 'visited' || rawState === 'frontier') && fVal != null && (
                        <span className="font-mono-display text-[8px] text-[#f1f5f9]/60 select-none">{fVal.toFixed(0)}</span>
                      )}
                      {victim && (() => {
                        const isRescued = rescuedVictimIds.has(victim.id);
                        return (
                          <div
                            className={`absolute w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold z-20 ${
                              isRescued
                                ? 'bg-emerald-600 text-white ring-1 ring-emerald-400'
                                : victim.severity === 'critical'
                                  ? 'bg-red-500 badge-glow-red text-[#f1f5f9]'
                                  : victim.severity === 'moderate'
                                    ? 'bg-amber-500 badge-glow-amber text-[#f1f5f9]'
                                    : 'bg-green-500 badge-glow-green text-[#f1f5f9]'
                            }`}
                            style={isRescued ? { opacity: 0.5 } : undefined}
                          >
                            {isRescued ? '✓' : victim.id}
                          </div>
                        );
                      })()}
                      {rawState === 'current' && (
                        <span className="absolute inset-0 rounded-sm border-2 border-[#f1f5f9]/60 animate-pulse-dot" />
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          </div>

          {/* Live stat pills */}
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-2 gap-2 mt-auto pt-2">
            {[
              { dot: 'bg-blue-500', label: 'Visited', value: `${step?.nodesVisited ?? 0}`, unit: 'nodes' },
              { dot: 'bg-emerald-500', label: 'Rescued', value: `${rescuedVictimIds.size}/${victims.filter(v => v.status !== 'rescued' && v.status !== 'lost').length}`, unit: 'victims' },
              { dot: 'bg-green-500', label: 'Path Length', value: `${step?.pathLength ?? 0}`, unit: 'steps' },
              { dot: 'bg-purple-500', label: 'Total Cost', value: step?.solutionCost ? step.solutionCost.toFixed(1) : '0', unit: 'units' },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col bg-[#0f172a]/50 border border-[#1e293b] rounded-lg px-2.5 py-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${stat.dot}`} />
                  <span className="text-[8px] font-bold text-[#64748b] uppercase tracking-wider">{stat.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[11px] text-[#f1f5f9] font-bold font-mono-display">{stat.value}</span>
                  <span className="text-[8px] text-[#475569]">{stat.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Column: Comparison + Heuristic */}
        <div className="flex flex-col min-h-0 xl:border-r border-[#1e293b] overflow-y-auto p-4">
          <SectionLabel>Search Algorithm Comparison</SectionLabel>
          <div className="card-glass overflow-hidden flex flex-col mb-4 shadow-lg border-[#334155]/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1e293b]/50 text-[#94a3b8] text-[9px] uppercase tracking-wider font-bold">
                    <th className="px-3 py-2 border-b border-[#334155]/50">Algo</th>
                    <th className="px-2 py-2 border-b border-[#334155]/50 text-center">Nodes</th>
                    <th className="px-2 py-2 border-b border-[#334155]/50 text-center">Cost</th>
                    <th className="px-2 py-2 border-b border-[#334155]/50 text-center">Time</th>
                    <th className="px-2 py-2 border-b border-[#334155]/50 text-center">Opt</th>
                    <th className="px-3 py-2 border-b border-[#334155]/50 text-right">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/30">
                  {comparisonRows.map((row) => (
                    <tr 
                      key={row.algo} 
                      className={`group transition-colors hover:bg-[#1e293b]/40 ${row.recommended ? 'bg-green-500/5' : ''}`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-[#f1f5f9] tracking-tight">{algoDisplayName(row.algo)}</span>
                          {row.recommended && (
                            <span className="mt-0.5 text-[8px] font-extrabold text-green-400 uppercase tracking-tighter">
                              Recommended
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono-display text-[10px] text-[#cbd5e1]">
                        {row.nodesExpanded > 0 ? row.nodesExpanded.toLocaleString() : '—'}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono-display text-[10px] text-[#cbd5e1]">
                        {row.pathCost > 0 ? row.pathCost.toFixed(1) : '—'}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono-display text-[10px] text-[#cbd5e1]">
                        {row.timeMs > 0 ? `${row.timeMs}ms` : '—'}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {row.nodesExpanded > 0 ? (
                          row.optimal ? 
                            <span className="text-green-400 text-[10px]">✔</span> : 
                            <span className="text-red-400 text-[10px]">✘</span>
                        ) : <span className="text-[#475569]">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono-display text-[10px]">
                        {row.nodesExpanded > 0 ? (
                          <span
                            className={`font-bold ${
                              row.riskScore < 5
                                ? 'text-green-400'
                                : row.riskScore < 15
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                            }`}
                          >
                            {row.riskScore.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[#475569]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <SectionLabel>Heuristic Analysis</SectionLabel>
          <div className="card-glass p-4 shadow-lg border-purple-500/20 bg-purple-500/5">
            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div className="col-span-2 flex flex-col gap-1 bg-[#020817] p-2 rounded-md border border-[#1e293b]">
                <span className="text-[8px] font-bold text-[#64748b] uppercase tracking-wider">Target Function h(n)</span>
                <span className="text-[#f1f5f9] font-mono-display text-[9px]">Manhattan(goal) + (Risk × 5)</span>
              </div>
              <div className="flex flex-col gap-1 bg-[#020817] p-2 rounded-md border border-[#1e293b]">
                <span className="text-[8px] font-bold text-[#64748b] uppercase tracking-wider">Admissible</span>
                <span className="text-green-400 font-bold">✔ YES</span>
              </div>
              <div className="flex flex-col gap-1 bg-[#020817] p-2 rounded-md border border-[#1e293b]">
                <span className="text-[8px] font-bold text-[#64748b] uppercase tracking-wider">Consistent</span>
                <span className="text-green-400 font-bold">✔ YES</span>
              </div>
              <div className="col-span-2 flex items-center justify-between px-2 py-1.5 bg-purple-500/10 rounded-md border border-purple-500/20">
                <span className="text-[8px] font-bold text-purple-300 uppercase tracking-wider">Standard Weight (ε)</span>
                <span className="text-purple-300 font-mono-display font-bold">1.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Optimization + Trade-offs + LOG DRAWER */}
        <div className="flex flex-col min-h-0 overflow-hidden border-l border-[#1e293b] bg-[#0f172a]">
          {/* Top part: Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <SectionLabel>Optimization & Trade-offs</SectionLabel>
            
            {(() => {
              const lsLabel = localSearchAlgorithm === 'HillClimbing' ? 'Hill Climbing' : 'Simulated Annealing';
              const hasResult = !!localSearchResult && localSearchResult.iterations > 0;
              const initial = localSearchResult?.initialCost ?? 0;
              const final = localSearchResult?.finalCost ?? 0;
              const iters = localSearchResult?.iterations ?? 0;
              const improvement = localSearchResult?.improvement ?? 0;
              const improvedColor = improvement > 5 ? 'text-green-400' : improvement > 0 ? 'text-amber-300' : 'text-[#94a3b8]';
              return (
                <div className="card-glass p-3 shadow-lg border-purple-500/20 bg-purple-500/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">
                      Local Search Polish
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[8px] font-bold uppercase tracking-tighter">
                      {lsLabel}
                    </div>
                  </div>
                  {hasResult ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] uppercase tracking-wider text-[#64748b] font-bold">Initial Cost</span>
                        <span className="text-xs font-mono-display text-[#cbd5e1]">{initial.toFixed(1)} units</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] uppercase tracking-wider text-[#64748b] font-bold">Optimized</span>
                        <span className="text-xs font-mono-display text-white font-bold">{final.toFixed(1)} <span className="text-green-500">−{improvement.toFixed(1)}%</span></span>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center justify-between text-[8px] text-[#64748b] font-bold uppercase mb-1">
                          <span>Efficiency Gain</span>
                          <span className={improvedColor}>+{improvement.toFixed(1)}%</span>
                        </div>
                        <div className="h-1 bg-[#1e293b] rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, improvement * 5)}%` }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-[10px] text-[#94a3b8] italic">Awaiting global path...</div>
                  )}
                </div>
              );
            })()}

            <div className="card-glass p-3 shadow-lg border-[#3b82f6]/20 bg-[#3b82f6]/5">
              <div className="text-[10px] font-bold tracking-widest text-[#3b82f6] uppercase mb-3">Trade-off Analysis</div>
              <div className="space-y-3">
                {tradeRows.map((s) => {
                  const IconComp = s.border === 'red' ? Zap : s.border === 'green' ? Shield : Scale;
                  return (
                    <div key={s.title} className={`rounded-xl border p-2.5 ${s.border === 'red' ? 'border-red-500/30 bg-red-500/5' : s.border === 'green' ? 'border-green-500/30 bg-green-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <IconComp className={`w-3.5 h-3.5 ${s.border === 'red' ? 'text-red-400' : s.border === 'green' ? 'text-green-400' : 'text-blue-400'}`} />
                        <span className="text-[9px] font-bold text-[#f1f5f9] uppercase tracking-tight">{s.title}</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-[#64748b]">Risk: <span className="text-[#cbd5e1]">{s.riskScore}</span></span>
                        <span className="text-[#64748b]">Cost: <span className="text-[#cbd5e1]">{s.pathCost}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Drawer: Node Expansion Log (Restricted to Column 3) */}
          <div className={`shrink-0 flex flex-col bg-[#0a0f1e] border-t border-[#1e293b] transition-all duration-300 ease-in-out ${isLogExpanded ? 'h-[40%]' : 'h-[42px]'}`}>
            <button 
              onClick={() => setIsLogExpanded(!isLogExpanded)}
              className="flex items-center justify-between px-4 h-[42px] hover:bg-[#1e293b]/30 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#3b82f6]">Node Expansion Log</span>
                <span className="text-[9px] text-[#64748b] bg-[#1e293b] px-1.5 rounded-full">{steps.length}</span>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button title="Reset Trace" onClick={(e) => { e.stopPropagation(); setCurrentStep(0); setIsPlaying(false); }} className="p-1 hover:bg-[#3b82f6]/20 rounded text-[#64748b] hover:text-[#3b82f6] transition-colors"><SkipBack className="w-3.5 h-3.5" /></button>
                 </div>
                 {isLogExpanded ? <ChevronDown className="w-4 h-4 text-[#64748b]" /> : <ChevronUp className="w-4 h-4 text-[#64748b]" />}
              </div>
            </button>
            
            {isLogExpanded && (
              <div 
                ref={logScrollRef}
                className="flex-1 overflow-y-auto p-4 font-mono-display text-[10px] space-y-1.5 bg-[#020817] custom-scrollbar"
              >
                {steps.slice(0, currentStep + 1).map((s, idx) => (
                  <div
                    key={`${s.stepNumber}-${idx}`}
                    className={`${logColorMap[s.logType]} flex gap-3 border-b border-[#1e293b]/30 pb-1.5 ${idx === currentStep ? 'bg-[#3b82f6]/10 px-2 rounded' : ''}`}
                  >
                    <span className="text-[#64748b] shrink-0 font-bold">[Step {String(s.stepNumber).padStart(2, '0')}]</span>
                    <span className="leading-relaxed">{s.logText}</span>
                  </div>
                ))}
                {steps.length === 0 && <div className="text-[#64748b] italic text-center py-8">Awaiting search initiation...</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
