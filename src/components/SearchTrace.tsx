import { useState } from 'react';
import { SkipBack, ChevronLeft, ChevronRight, Play, Zap, Shield, Scale } from 'lucide-react';
import {
  searchGridCells, SEARCH_GRID_SIZE, expansionLog, algoComparisons, tradeOffStrategies,
  type SearchAlgo, type SearchGridCell,
} from '../data/placeholder';

const algoConfig: Record<SearchAlgo, { label: string; color: string; dotColor: string }> = {
  bfs: { label: 'BFS', color: '#3b82f6', dotColor: 'bg-blue-500' },
  dfs: { label: 'DFS', color: '#a855f7', dotColor: 'bg-purple-500' },
  greedy: { label: 'Greedy', color: '#f59e0b', dotColor: 'bg-amber-500' },
  astar: { label: 'A*', color: '#22c55e', dotColor: 'bg-green-500' },
};

const cellStateStyles: Record<SearchGridCell['state'], { bg: string; overlay?: string; label?: string; borderGlow?: string }> = {
  unvisited: { bg: '#1e293b' },
  visited: { bg: '#1e3a5f' },
  frontier: { bg: '#451a03', borderGlow: '0 0 6px rgba(245,158,11,0.4) inset' },
  current: { bg: '#1d4ed8', borderGlow: '0 0 10px rgba(59,130,246,0.8)' },
  path: { bg: '#14532d', borderGlow: '0 -2px 0 #22c55e inset' },
  fire: { bg: '#450a0a', overlay: '🔥' },
  blocked: { bg: '#09090b', overlay: '✕' },
  start: { bg: '#854d0e', label: '⭐' },
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

export default function SearchTrace() {
  const [activeAlgo, setActiveAlgo] = useState<SearchAlgo>('astar');
  const [playbackSpeed, setPlaybackSpeed] = useState<'Slow' | '1×' | 'Fast'>('1×');

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top Control Bar */}
      <div className="shrink-0 bg-[#0f172a] border-b border-[#1e293b] px-4 py-2.5 flex items-center justify-between">
        {/* Left: Algorithm selector */}
        <div className="flex items-center gap-1.5">
          {(Object.entries(algoConfig) as [SearchAlgo, typeof algoConfig[SearchAlgo]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setActiveAlgo(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                activeAlgo === key
                  ? 'text-[#f1f5f9]'
                  : 'bg-transparent border border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]'
              }`}
              style={activeAlgo === key ? { backgroundColor: cfg.color, boxShadow: `0 0 12px ${cfg.color}60` } : undefined}
            >
              <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
              {cfg.label} {key === 'astar' && '⭐'}
            </button>
          ))}
        </div>

        {/* Center: Playback controls */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#334155] text-[#94a3b8] text-[10px] hover:bg-[#1e293b] transition-colors cursor-pointer">
            <SkipBack className="w-3.5 h-3.5" /> Reset
          </button>
          <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#334155] text-[#94a3b8] text-[10px] hover:bg-[#1e293b] transition-colors cursor-pointer">
            <ChevronLeft className="w-3.5 h-3.5" /> Step Back
          </button>
          <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#334155] text-[#94a3b8] text-[10px] hover:bg-[#1e293b] transition-colors cursor-pointer">
            Step Fwd <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#3b82f6] text-[#f1f5f9] text-[10px] glow-blue hover:bg-[#2563eb] transition-colors cursor-pointer">
            <Play className="w-3.5 h-3.5" /> Auto Play
          </button>
          <div className="flex items-center gap-1 ml-2">
            <span className="text-[9px] text-[#64748b] mr-1">Speed:</span>
            {(['Slow', '1×', 'Fast'] as const).map((s) => (
              <button
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
          <span className="font-mono-display text-[15px] text-[#3b82f6] font-bold">Step: 23 / 147</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 badge-glow-amber">SEARCHING...</span>
            <span className="text-[9px] text-[#64748b]">Solution: Not Found Yet</span>
          </div>
        </div>
      </div>

      {/* Main Body: 2 columns */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Column (55%) */}
        <div className="w-[55%] flex flex-col min-h-0 border-r border-[#1e293b] overflow-y-auto p-4">
          <SectionLabel>Search Expansion Visualizer</SectionLabel>
          <p className="text-[10px] text-[#64748b] mb-3">Watching A* explore the disaster zone grid</p>

          {/* Search Grid */}
          <div className="flex justify-center mb-3">
            <div
              className="grid border border-[#1e293b] rounded-lg overflow-hidden"
              style={{
                gridTemplateColumns: `repeat(${SEARCH_GRID_SIZE}, 34px)`,
                gridTemplateRows: `repeat(${SEARCH_GRID_SIZE}, 34px)`,
              }}
            >
              {searchGridCells.map((cell) => {
                const style = cellStateStyles[cell.state];
                return (
                  <div
                    key={`${cell.row}-${cell.col}`}
                    className="relative flex items-center justify-center text-[9px] cursor-default"
                    style={{
                      width: 34,
                      height: 34,
                      backgroundColor: style.bg,
                      borderRight: '1px solid #0a0f1e',
                      borderBottom: '1px solid #0a0f1e',
                      boxShadow: style.borderGlow,
                      animation: cell.state === 'current' ? 'pulse-dot 1.5s ease-in-out infinite' : undefined,
                    }}
                  >
                    {style.overlay && <span className="absolute text-[8px] opacity-70 select-none">{style.overlay}</span>}
                    {style.label && <span className="absolute text-[7px] font-bold text-[#f1f5f9]/80 select-none">{style.label}</span>}
                    {(cell.state === 'visited' || cell.state === 'frontier') && cell.fValue != null && (
                      <span className="font-mono-display text-[8px] text-[#f1f5f9]/60 select-none">{cell.fValue}</span>
                    )}
                    {cell.state === 'current' && (
                      <span className="absolute inset-0 rounded-sm border-2 border-[#f1f5f9]/60 animate-pulse-dot" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live stat pills */}
          <div className="flex items-center gap-3 justify-center">
            {[
              { dot: 'bg-blue-500', label: 'Visited', value: '23 nodes' },
              { dot: 'bg-amber-500', label: 'Frontier', value: '8 nodes' },
              { dot: 'bg-green-500', label: 'Path Length', value: '14 steps' },
              { dot: 'bg-[#64748b]', label: 'Solution Cost', value: '28' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-1.5 bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-1.5">
                <span className={`w-2 h-2 rounded-full ${stat.dot}`} />
                <span className="text-[9px] text-[#94a3b8]">{stat.label}:</span>
                <span className="text-[10px] text-[#f1f5f9] font-semibold">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (45%) */}
        <div className="w-[45%] flex flex-col min-h-0 overflow-y-auto p-4">
          <SectionLabel>Node Expansion Log</SectionLabel>
          <p className="text-[10px] text-[#64748b] mb-2">Real-time trace of search decisions</p>

          <div className="bg-[#020817] rounded-lg border border-[#1e293b] p-3 flex-1 overflow-y-auto font-mono-display text-[10px] space-y-1 min-h-[200px] leading-relaxed">
            {expansionLog.map((entry) => (
              <div key={entry.step} className={`${logColorMap[entry.type]} ${entry.step === 15 ? 'border-l-2 border-[#3b82f6] pl-2 bg-[#1e293b]/30' : ''}`}>
                <span className="text-[#64748b]">[Step {String(entry.step).padStart(2, '0')}]</span> {entry.text}
              </div>
            ))}
          </div>

          {/* Heuristic Info Card */}
          <div className="card-glass p-3 mt-3 border-glow-left-purple">
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
      </div>

      {/* Bottom: Algorithm Comparison */}
      <div className="shrink-0 border-t border-[#1e293b] bg-[#0a0f1e] px-4 py-3">
        <SectionLabel>Search Algorithm Comparison</SectionLabel>
        <div className="flex gap-4">
          {/* Comparison Table */}
          <div className="flex-1 card-glass p-3 overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-[#64748b] text-[9px] uppercase tracking-wider">
                  <th className="text-left py-1.5 font-medium">Algorithm</th>
                  <th className="text-center py-1.5 font-medium">Nodes Expanded</th>
                  <th className="text-center py-1.5 font-medium">Path Cost</th>
                  <th className="text-center py-1.5 font-medium">Time(ms)</th>
                  <th className="text-center py-1.5 font-medium">Optimal</th>
                  <th className="text-center py-1.5 font-medium">Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {algoComparisons.map((row) => (
                  <tr key={row.algo} className={`border-t border-[#1e293b] ${row.best ? 'border-l-2 border-l-green-500 bg-green-500/5' : ''}`}>
                    <td className="py-1.5 font-semibold text-[#f1f5f9]">
                      {row.algo} {row.best && <span className="ml-1 text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">RECOMMENDED</span>}
                    </td>
                    <td className="py-1.5 text-center text-[#cbd5e1]">{row.nodesExpanded}</td>
                    <td className="py-1.5 text-center text-[#cbd5e1]">{row.pathCost}</td>
                    <td className="py-1.5 text-center text-[#cbd5e1]">{row.timeMs}ms</td>
                    <td className="py-1.5 text-center">{row.optimal ? <span className="text-green-400">✅ Yes</span> : <span className="text-red-400">❌ No</span>}</td>
                    <td className="py-1.5 text-center">
                      <span className={row.riskScore === 'Low' ? 'text-green-400' : row.riskScore === 'Medium' ? 'text-amber-400' : 'text-red-400'}>
                        {row.riskScore} {row.best && '⭐'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Trade-off Analysis */}
          <div className="w-[380px] shrink-0 card-glass p-3 glow-blue">
            <div className="text-[10px] font-semibold tracking-[0.15em] text-[#3b82f6] uppercase mb-2">Trade-off Analysis</div>
            <div className="space-y-2">
              {tradeOffStrategies.map((s) => {
                const borderClass = s.border === 'red' ? 'border-glow-left-red' : s.border === 'green' ? 'border-glow-left-green' : 'border-glow-left-blue';
                const IconComp = s.border === 'red' ? Zap : s.border === 'green' ? Shield : Scale;
                return (
                  <div key={s.title} className={`bg-[#020817] rounded-lg p-2.5 ${borderClass} ${s.recommended ? 'glow-blue' : ''}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <IconComp className={`w-3.5 h-3.5 ${s.border === 'red' ? 'text-red-400' : s.border === 'green' ? 'text-green-400' : 'text-blue-400'}`} />
                      <span className="text-[10px] font-semibold text-[#f1f5f9]">{s.title}</span>
                    </div>
                    <div className="text-[9px] text-[#94a3b8] space-y-0.5">
                      <div>Path Cost: {s.pathCost} | Risk Score: <span className={s.riskScore.includes('LOW') ? 'text-green-400' : s.riskScore.includes('HIGH') ? 'text-red-400' : 'text-amber-400'}>{s.riskScore}</span></div>
                      <div>Time: {s.time} | {s.border === 'red' ? 'Victims at risk: +2' : s.border === 'green' ? 'All victims safe' : 'Recommended approach'}</div>
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
