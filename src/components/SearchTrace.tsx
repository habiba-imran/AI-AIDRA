import { useCallback, useEffect, useMemo, useState } from 'react';
import { SkipBack, ChevronLeft, ChevronRight, Play, Zap, Shield, Scale } from 'lucide-react';
import type {
  AlgoComparison,
  GridCell,
  NodeState,
  ObjectivePriority,
  SearchAlgorithm,
  SearchResult,
  TradeOffStrategy,
  Victim,
} from '../types';
import { runSearch } from '../engine/search';

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
  onRunSearch: (algo: SearchAlgorithm) => void;
  /** Phase 5: fuzzy-adjusted edge costs (1 = crisp). */
  fuzzyRiskStep: number;
  fuzzyHeuristicWeight: number;
}

export default function SearchTrace({
  searchResult,
  allAlgoComparisons,
  grid,
  victims,
  objectivePriority,
  onRunSearch,
  fuzzyRiskStep,
  fuzzyHeuristicWeight,
}: SearchTraceProps) {
  const [activeAlgo, setActiveAlgo] = useState<SearchAlgorithm>('Astar');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<'Slow' | '1×' | 'Fast'>('1×');
  const [localResult, setLocalResult] = useState<SearchResult | null>(null);

  const runForAlgo = useCallback(
    (algo: SearchAlgorithm) => {
      if (grid.length === 0) return;
      const r = runSearch(
        algo,
        grid,
        0,
        0,
        0,
        17,
        objectivePriority,
        fuzzyRiskStep,
        fuzzyHeuristicWeight
      );
      setActiveAlgo(algo);
      setLocalResult(r);
      setCurrentStep(0);
      setIsPlaying(false);
      onRunSearch(algo);
    },
    [grid, objectivePriority, onRunSearch, fuzzyRiskStep, fuzzyHeuristicWeight]
  );

  useEffect(() => {
    if (grid.length === 0) return;
    setLocalResult(
      runSearch(activeAlgo, grid, 0, 0, 0, 17, objectivePriority, fuzzyRiskStep, fuzzyHeuristicWeight)
    );
    setCurrentStep(0);
  }, [grid, objectivePriority, activeAlgo, fuzzyRiskStep, fuzzyHeuristicWeight]);

  const displayResult =
    searchResult &&
    searchResult.algorithm === activeAlgo &&
    searchResult.steps.length > 0
      ? searchResult
      : localResult;
  const steps = displayResult?.steps ?? [];
  const step = steps[currentStep];
  const maxStepIdx = Math.max(0, steps.length - 1);

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
      <div className="shrink-0 bg-[#0f172a] border-b border-[#1e293b] px-4 py-2.5 flex items-center justify-between">
        {/* Left: Algorithm selector */}
        <div className="flex items-center gap-1.5">
          {(Object.entries(algoConfig) as [SearchAlgorithm, (typeof algoConfig)[SearchAlgorithm]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => runForAlgo(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCurrentStep(0);
              setIsPlaying(false);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#334155] text-[#94a3b8] text-[10px] hover:bg-[#1e293b] transition-colors cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#334155] text-[#94a3b8] text-[10px] hover:bg-[#1e293b] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Step Back
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.min(prev + 1, maxStepIdx))}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#334155] text-[#94a3b8] text-[10px] hover:bg-[#1e293b] transition-colors cursor-pointer"
          >
            Step Fwd <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#3b82f6] text-[#f1f5f9] text-[10px] glow-blue hover:bg-[#2563eb] transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> Auto Play
          </button>
          <div className="flex items-center gap-1 ml-2">
            <span className="text-[9px] text-[#64748b] mr-1">Speed:</span>
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
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono-display text-[15px] text-[#3b82f6] font-bold">
            Step: {steps.length === 0 ? 0 : currentStep + 1} / {steps.length}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 badge-glow-amber">
              {isPlaying ? 'PLAYING…' : 'SEARCHING...'}
            </span>
            <span className="text-[9px] text-[#64748b]">
              {displayResult?.found
                ? `Solution: cost ${displayResult.pathCost.toFixed(1)}`
                : 'Solution: Not Found Yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Body: Responsive 3-column grid */}
      <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 xl:grid-cols-3">
        {/* Left Column: Square visualizer */}
        <div className="flex flex-col min-h-0 xl:border-r border-[#1e293b] overflow-y-auto p-4">
          <SectionLabel>Search Expansion Visualizer</SectionLabel>
          <p className="text-[10px] text-[#64748b] mb-2">Watching A* explore the disaster zone grid</p>

          {/* Search Grid - forced square container */}
          <div className="flex justify-center mb-2 w-full">
            <div className="w-full max-w-[402px]">
              <div className="flex ml-[18px]">
                {Array.from({ length: TRACE_GRID }, (_, c) => (
                  <div key={`x-${c}`} className="text-[7px] text-[#475569] font-mono-display text-center flex-1">
                    {c}
                  </div>
                ))}
              </div>
              <div className="flex">
                <div className="flex flex-col mr-1 w-[18px]">
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
                      {victim && (
                        <div
                          className={`absolute w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold text-[#f1f5f9] z-20 ${
                            victim.severity === 'critical'
                              ? 'bg-red-500 badge-glow-red'
                              : victim.severity === 'moderate'
                                ? 'bg-amber-500 badge-glow-amber'
                                : 'bg-green-500 badge-glow-green'
                          }`}
                        >
                          {victim.id}
                        </div>
                      )}
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
          <div className="flex items-center gap-2 justify-center flex-wrap">
            {[
              { dot: 'bg-blue-500', label: 'Visited', value: `${step?.nodesVisited ?? 0} nodes` },
              { dot: 'bg-amber-500', label: 'Frontier', value: `${step?.frontierSize ?? 0} nodes` },
              { dot: 'bg-green-500', label: 'Path Length', value: `${step?.pathLength ?? 0} steps` },
              { dot: 'bg-[#64748b]', label: 'Solution Cost', value: step?.solutionCost ? step.solutionCost.toFixed(1) : '0' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-1.5 bg-[#0f172a] border border-[#1e293b] rounded-lg px-2 py-1">
                <span className={`w-2 h-2 rounded-full ${stat.dot}`} />
                <span className="text-[9px] text-[#94a3b8]">{stat.label}:</span>
                <span className="text-[10px] text-[#f1f5f9] font-semibold">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Column: Logs + heuristic details */}
        <div className="flex flex-col min-h-0 xl:border-r border-[#1e293b] overflow-hidden p-4">
          <SectionLabel>Node Expansion Log</SectionLabel>
          <p className="text-[10px] text-[#64748b] mb-2">Real-time trace of search decisions</p>

          <div className="bg-[#020817] rounded-lg border border-[#1e293b] p-3 flex-1 overflow-y-auto font-mono-display text-[10px] space-y-1 min-h-[220px] leading-relaxed">
            {steps.slice(0, currentStep + 1).map((s, idx) => (
              <div
                key={`${s.stepNumber}-${idx}`}
                className={`${logColorMap[s.logType]} ${idx === currentStep ? 'border-l-2 border-[#3b82f6] pl-2 bg-[#1e293b]/30' : ''}`}
              >
                <span className="text-[#64748b]">[Step {String(s.stepNumber).padStart(2, '0')}]</span> {s.logText}
              </div>
            ))}
          </div>

          {/* Heuristic Info Card */}
          <div className="card-glass p-3 mt-2 border-glow-left-purple shrink-0">
            <div className="text-[10px] font-semibold tracking-[0.15em] text-purple-400 uppercase mb-2">Heuristic Analysis</div>
            <div className="font-mono-display text-[10px] space-y-1">
              <div><span className="text-[#64748b]">h(n) formula:  </span><span className="text-[#f1f5f9]">Manhattan Distance + Risk Penalty</span></div>
              <div><span className="text-[#64748b]">h(n) example:  </span><span className="text-[#f1f5f9]">|row-goal| + |col-goal| + (risk×5)</span></div>
              <div><span className="text-[#64748b]">Admissible:    </span><span className="text-green-400">✅ Yes — never overestimates</span></div>
              <div><span className="text-[#64748b]">Consistent:    </span><span className="text-green-400">✅ Yes — satisfies triangle inequality</span></div>
              <div><span className="text-[#64748b]">Weight (ε):    </span><span className="text-[#f1f5f9]">1.0 (standard A*)</span></div>
            </div>
          </div>
        </div>

        {/* Right Column: Algorithm comparison and trade-offs */}
        <div className="flex flex-col min-h-0 overflow-hidden p-4 gap-1.5">
          <SectionLabel>Search Algorithm Comparison</SectionLabel>
          <div className="card-glass p-2 overflow-hidden h-[190px] flex flex-col">
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-[9px] table-fixed">
                <thead>
                  <tr className="text-[#64748b] text-[9px] uppercase tracking-wider">
                    <th className="text-left py-1.5 font-medium w-[26%]">Algo</th>
                    <th className="text-center py-1.5 font-medium w-[16%]">Nodes</th>
                    <th className="text-center py-1.5 font-medium w-[14%]">Cost</th>
                    <th className="text-center py-1.5 font-medium w-[14%]">Time</th>
                    <th className="text-center py-1.5 font-medium w-[14%]">Opt</th>
                    <th className="text-center py-1.5 font-medium w-[16%]">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.algo} className={`border-t border-[#1e293b] ${row.recommended ? 'border-l-2 border-l-green-500 bg-green-500/5' : ''}`}>
                      <td className="py-1.5 font-semibold text-[#f1f5f9]">
                        <div className="truncate">{algoDisplayName(row.algo)}</div>
                        {row.recommended && <span className="mt-0.5 inline-block text-[7px] bg-green-500/20 text-green-400 px-1 py-0.5 rounded-full">⭐ PICK</span>}
                      </td>
                      <td className="py-1.5 text-center text-[#cbd5e1]">{row.nodesExpanded > 0 ? row.nodesExpanded : '-'}</td>
                      <td className="py-1.5 text-center text-[#cbd5e1]">{row.pathCost > 0 ? row.pathCost : '-'}</td>
                      <td className="py-1.5 text-center text-[#cbd5e1]">{row.timeMs > 0 ? row.timeMs : '-'}</td>
                      <td className="py-1.5 text-center">{row.nodesExpanded > 0 ? (row.optimal ? <span className="text-green-400">✅ Yes</span> : <span className="text-red-400">❌ No</span>) : <span className="text-[#64748b]">-</span>}</td>
                      <td className="py-1.5 text-center">
                        {row.nodesExpanded > 0 ? (
                          <span
                            className={
                              row.riskScore < 5
                                ? 'text-green-400'
                                : row.riskScore < 15
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                            }
                          >
                            {row.riskScore.toFixed(2)} {row.recommended && '⭐'}
                          </span>
                        ) : (
                          <span className="text-[#64748b]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card-glass p-3 glow-blue overflow-y-auto min-h-[220px] mt-0.5">
            <div className="text-[10px] font-semibold tracking-[0.15em] text-[#3b82f6] uppercase mb-2">Trade-off Analysis</div>
            <div className="space-y-2">
              {tradeRows.map((s) => {
                const borderClass = s.border === 'red' ? 'border-glow-left-red' : s.border === 'green' ? 'border-glow-left-green' : 'border-glow-left-blue';
                const IconComp = s.border === 'red' ? Zap : s.border === 'green' ? Shield : Scale;
                return (
                  <div key={s.title} className={`bg-[#020817] rounded-lg p-2.5 ${borderClass} ${s.recommended ? 'glow-blue' : ''}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <IconComp className={`w-3.5 h-3.5 ${s.border === 'red' ? 'text-red-400' : s.border === 'green' ? 'text-green-400' : 'text-blue-400'}`} />
                      <span className="text-[10px] font-semibold text-[#f1f5f9]">{s.title}</span>
                    </div>
                    <div className="text-[9px] text-[#94a3b8] space-y-0.5">
                      <div>
                        Path Cost: {s.pathCost} | Risk Score:{' '}
                        <span className={s.riskScore.includes('LOW') ? 'text-green-400' : s.riskScore.includes('HIGH') ? 'text-red-400' : 'text-amber-400'}>
                          {s.riskScore}
                        </span>
                      </div>
                      <div>
                        Time: {s.timeMs}ms | {s.border === 'red' ? 'Victims at risk: +2' : s.border === 'green' ? 'All victims safe' : 'Recommended approach'}
                      </div>
                      <div className="text-[#64748b] italic">&ldquo;{s.detail}&rdquo;</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
