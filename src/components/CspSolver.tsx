import { Play, RotateCcw, Sparkles, GitBranch, Filter } from 'lucide-react';
import {
  cspVariables, cspConstraints, cspTreeNodes, cspPerfData, cspConstraintMatrix,
} from '../data/placeholder';

function SectionLabel({ children, color = 'text-[#3b82f6]' }: { children: React.ReactNode; color?: string }) {
  return <div className={`text-[10px] font-semibold tracking-[0.15em] uppercase mb-2 mt-1 ${color}`}>{children}</div>;
}

function TreeNode({ nodeId, nodes, x, y }: { nodeId: string; nodes: Record<string, typeof cspTreeNodes[string]>; x: number; y: number }) {
  const node = nodes[nodeId];
  if (!node) return null;

  const isStart = node.start;
  const isSolution = node.solution;
  const isBacktrack = node.backtrack;
  const isValid = node.valid && !isBacktrack;

  let bg = '#1e293b';
  let borderColor = '#334155';
  let textColor = '#f1f5f9';
  let extraLabel = '';

  if (isStart) { bg = '#854d0e'; borderColor = '#a16207'; }
  else if (isSolution) { bg = '#14532d'; borderColor = '#22c55e'; }
  else if (isBacktrack) { bg = '#450a0a'; borderColor = '#ef4444'; textColor = '#ef4444'; extraLabel = '✕ BACKTRACK'; }
  else if (isValid) { bg = '#14532d'; borderColor = '#22c55e'; }

  const nodeWidth = 100;
  const nodeHeight = 28;

  return (
    <g>
      {node.children.map((childId, i) => {
        const child = nodes[childId];
        if (!child) return null;
        const childX = x + (i - (node.children.length - 1) / 2) * 120;
        const childY = y + 56;
        const lineColor = child.backtrack ? '#ef4444' : '#22c55e';
        return (
          <g key={childId}>
            <line x1={x} y1={y + nodeHeight / 2} x2={childX} y2={childY - nodeHeight / 2} stroke={lineColor} strokeWidth={1.5} opacity={0.6} />
            <TreeNode nodeId={childId} nodes={nodes} x={childX} y={childY} />
          </g>
        );
      })}
      <rect
        x={x - nodeWidth / 2} y={y - nodeHeight / 2}
        width={nodeWidth} height={nodeHeight}
        rx={6} fill={bg} stroke={borderColor} strokeWidth={1.5}
        style={isSolution ? { filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.5))' } : isStart ? { filter: 'drop-shadow(0 0 6px rgba(161,97,7,0.4))' } : undefined}
      />
      <text
        x={x} y={y + 1}
        textAnchor="middle" dominantBaseline="central"
        fill={textColor} fontSize={isBacktrack ? 9 : 10}
        fontFamily="JetBrains Mono, monospace"
        fontWeight={isSolution || isStart ? 'bold' : 'normal'}
        textDecoration={isBacktrack ? 'line-through' : 'none'}
      >
        {node.label}
      </text>
      {extraLabel && (
        <text x={x} y={y + nodeHeight / 2 + 10} textAnchor="middle" fill="#ef4444" fontSize={7} fontFamily="Inter, sans-serif">
          {extraLabel}
        </text>
      )}
    </g>
  );
}

export default function CspSolver() {
  const constraintHeaders = ['Amb1', 'Amb2', 'Team', 'Kits', 'Overall'];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top Status Bar */}
      <div className="shrink-0 bg-[#0f172a] border-b border-[#1e293b] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#94a3b8] font-semibold">CSP STATUS:</span>
          <span className="text-[9px] font-semibold px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400 badge-glow-green">✅ FEASIBLE SOLUTION FOUND</span>
        </div>

        <div className="flex items-center gap-2">
          {[
            { label: 'Variables', value: '4', color: 'text-blue-400' },
            { label: 'Domains', value: '5 values', color: 'text-amber-400' },
            { label: 'Constraints', value: '6', color: 'text-red-400' },
            { label: 'Backtracks', value: '4', color: 'text-purple-400' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-1.5 bg-[#020817] border border-[#1e293b] rounded-lg px-2.5 py-1">
              <span className="text-[9px] text-[#64748b]">{stat.label}:</span>
              <span className={`text-[10px] font-bold ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#3b82f6] text-[#f1f5f9] text-[10px] glow-blue hover:bg-[#2563eb] transition-colors cursor-pointer">
            <Play className="w-3.5 h-3.5" /> Run Solver
          </button>
          <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#334155] text-[#94a3b8] text-[10px] hover:bg-[#1e293b] transition-colors cursor-pointer">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[9px] text-[#64748b]">Heuristics:</span>
            {['MRV ✓', 'Degree ✓', 'FC ✓'].map((h) => (
              <span key={h} className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-[#3b82f6]/20 text-blue-400">{h}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Body: 2 columns */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Column (45%) */}
        <div className="w-[45%] flex flex-col min-h-0 border-r border-[#1e293b] overflow-y-auto p-4 space-y-4">
          <div className="card-glass p-4 border-glow-left-purple">
            <SectionLabel color="text-purple-400">CSP Formulation</SectionLabel>

            <SectionLabel color="text-purple-400">Variables</SectionLabel>
            <div className="space-y-2 mb-4">
              {cspVariables.map((v) => (
                <div key={v.id} className="bg-[#020817] rounded-lg p-3 border border-[#1e293b]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[12px]">{v.icon}</span>
                    <span className="text-[11px] font-semibold text-[#f1f5f9]">{v.label}</span>
                  </div>
                  <div className="text-[10px] text-[#94a3b8] space-y-0.5 ml-5">
                    <div>Domain: <span className="text-[#f1f5f9] font-mono-display">{v.domain}</span></div>
                    <div>{v.maxInfo}</div>
                    <div>Current: <span className="text-[#f1f5f9] font-mono-display">{v.current}</span> <span className="text-green-400">✅</span></div>
                  </div>
                </div>
              ))}
            </div>

            <SectionLabel>Constraints</SectionLabel>
            <div className="space-y-1 mb-4">
              {cspConstraints.map((c) => (
                <div key={c.id} className="flex items-center gap-2 bg-[#020817] rounded-lg px-3 py-1.5 border border-[#1e293b]">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#3b82f6]/20 text-blue-400 font-mono-display">{c.id}</span>
                  <span className="text-[10px] text-[#cbd5e1] font-mono-display flex-1">{c.formula}</span>
                  <span className="text-[9px] font-semibold text-green-400">✅ SATISFIED</span>
                </div>
              ))}
            </div>

            <SectionLabel color="text-purple-400">Heuristics Used</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Sparkles, title: 'MRV', subtitle: 'Min Remaining Values', desc: 'Assign most constrained var first' },
                { icon: GitBranch, title: 'Degree', subtitle: 'Heuristic', desc: 'Choose var with most constraints' },
                { icon: Filter, title: 'Forward', subtitle: 'Checking', desc: 'Prune domains early' },
              ].map((h) => (
                <div key={h.title} className="card-glass p-2.5 border-glow-left-purple text-center">
                  <h.icon className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                  <div className="text-[10px] font-semibold text-[#f1f5f9]">{h.title}</div>
                  <div className="text-[9px] text-[#94a3b8]">{h.subtitle}</div>
                  <div className="text-[9px] text-[#64748b] mt-1 italic">&ldquo;{h.desc}&rdquo;</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (55%) */}
        <div className="w-[55%] flex flex-col min-h-0 overflow-y-auto p-4 space-y-4">
          <div>
            <SectionLabel>Backtracking Search Tree</SectionLabel>
            <p className="text-[10px] text-[#64748b] mb-2">Visual trace of CSP variable assignments</p>

            <div className="bg-[#020817] rounded-lg border border-[#1e293b] p-3 overflow-x-auto">
              <svg width="600" height="420" viewBox="0 0 600 420">
                <TreeNode nodeId="start" nodes={cspTreeNodes} x={300} y={24} />
              </svg>
            </div>
          </div>

          <div>
            <SectionLabel>Assignment Timeline</SectionLabel>
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { step: 1, label: 'Amb1←V1', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                { step: 2, label: 'Amb1←V3', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                { step: 3, label: 'Amb2←V2', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
                { step: 4, label: 'Amb2←V4', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
                { step: 5, label: 'Team←V5', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
              ].map((item, i) => (
                <div key={item.step} className="flex items-center gap-1">
                  <span className={`text-[9px] font-semibold px-2 py-1 rounded-lg border ${item.color}`}>
                    {String.fromCharCode(0x2460 + i)} {item.label}
                  </span>
                  {i < 4 && <span className="text-[#64748b] text-[9px]">→</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="card-glass p-4 border-glow-left-green">
            <SectionLabel color="text-green-400">✅ Optimal Assignment Found</SectionLabel>
            <div className="bg-[#020817] rounded-lg p-3 border border-[#1e293b] space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-[13px]">🚑</span>
                <div>
                  <span className="text-[11px] font-semibold text-[#f1f5f9]">Ambulance 1</span>
                  <span className="text-[10px] text-[#94a3b8]"> → V1 (Critical) 🔴</span>
                  <br />
                  <span className="text-[10px] text-[#94a3b8] ml-6">V3 (Moderate) 🟡</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[13px]">🚑</span>
                <div>
                  <span className="text-[11px] font-semibold text-[#f1f5f9]">Ambulance 2</span>
                  <span className="text-[10px] text-[#94a3b8]"> → V2 (Critical) 🔴</span>
                  <br />
                  <span className="text-[10px] text-[#94a3b8] ml-6">V4 (Moderate) 🟡</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px]">👷</span>
                <span className="text-[11px] font-semibold text-[#f1f5f9]">Rescue Team</span>
                <span className="text-[10px] text-[#94a3b8]"> → V5 (Minor) 🟢</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px]">🧰</span>
                <span className="text-[11px] font-semibold text-[#f1f5f9]">Kits Used</span>
                <span className="text-[10px] text-[#94a3b8]"> → 4 / 10</span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-green-400 space-y-0.5">
              <div>All 6 constraints satisfied ✅</div>
              <div>Critical victims prioritized by MRV heuristic ✅</div>
              <div>Resource utilization: 100% ambulances, 100% team ✅</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Performance */}
      <div className="shrink-0 border-t border-[#1e293b] bg-[#0a0f1e] px-4 py-3">
        <SectionLabel>CSP Solver Performance Analysis</SectionLabel>
        <div className="flex gap-4">
          <div className="flex-1 card-glass p-3 overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-[#64748b] text-[9px] uppercase tracking-wider">
                  <th className="text-left py-1.5 font-medium">Method</th>
                  <th className="text-center py-1.5 font-medium">Backtracks</th>
                  <th className="text-center py-1.5 font-medium">Nodes</th>
                  <th className="text-center py-1.5 font-medium">Constraints Checked</th>
                  <th className="text-center py-1.5 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {cspPerfData.map((row) => (
                  <tr key={row.method} className={`border-t border-[#1e293b] ${row.best ? 'bg-green-500/10 border-l-2 border-l-green-500' : ''}`}>
                    <td className="py-1.5 font-semibold text-[#f1f5f9]">
                      {row.method} {row.best && <span className="ml-1 text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">SELECTED ⭐</span>}
                    </td>
                    <td className="py-1.5 text-center text-[#cbd5e1]">{row.backtracks}</td>
                    <td className="py-1.5 text-center text-[#cbd5e1]">{row.nodes}</td>
                    <td className="py-1.5 text-center text-[#cbd5e1]">{row.constraintsChecked}</td>
                    <td className="py-1.5 text-center text-[#cbd5e1]">{row.timeMs}ms {row.best && '⭐'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-[10px] text-green-400 font-semibold">
              🎯 83% fewer backtracks with MRV + Forward Checking
            </div>
          </div>

          <div className="w-[340px] shrink-0 card-glass p-3">
            <div className="text-[10px] font-semibold tracking-[0.15em] text-[#3b82f6] uppercase mb-2">Constraint Status Matrix</div>
            <table className="w-full text-[9px]">
              <thead>
                <tr className="text-[#64748b]">
                  <th className="text-left py-1 font-medium"></th>
                  {constraintHeaders.map((h) => (
                    <th key={h} className="text-center py-1 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cspConstraintMatrix.map((row, i) => (
                  <tr key={i} className="border-t border-[#1e293b]">
                    <td className="py-1 font-semibold text-blue-400 font-mono-display">C{i + 1}</td>
                    {row.map((satisfied, j) => (
                      <td key={j} className="py-1 text-center">
                        {satisfied ? <span className="text-green-400">✅</span> : <span className="text-red-400">❌</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 space-y-0.5">
              <div className="text-[10px] text-green-400 font-semibold">Solution Quality: OPTIMAL</div>
              <div className="text-[10px] text-[#94a3b8]">All hard constraints satisfied with zero violations</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
