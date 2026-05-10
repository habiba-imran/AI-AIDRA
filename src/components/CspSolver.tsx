import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, RotateCcw, Sparkles, GitBranch, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import type { CspConstraint, CspSolution, CspTreeNode, Victim } from '../types';

function SectionLabel({ children, color = 'text-[#3b82f6]' }: { children: React.ReactNode; color?: string }) {
  return <div className={`text-[10px] font-semibold tracking-[0.15em] uppercase mb-2 mt-1 ${color}`}>{children}</div>;
}

type SvgTreeNodeData = {
  label: string;
  valid: boolean;
  start?: boolean;
  solution?: boolean;
  backtrack?: boolean;
  children: string[];
};

function flattenCspTree(root: CspTreeNode): Record<string, SvgTreeNodeData> {
  const out: Record<string, SvgTreeNodeData> = {};
  const walk = (n: CspTreeNode) => {
    out[n.id] = {
      label: n.label,
      valid: n.valid,
      start: n.start,
      solution: n.solution,
      backtrack: n.backtrack,
      children: n.children.map((c) => c.id),
    };
    for (const c of n.children) walk(c);
  };
  walk(root);
  return out;
}

function severityLabel(s: Victim['severity']): string {
  if (s === 'critical') return 'Critical';
  if (s === 'moderate') return 'Moderate';
  return 'Minor';
}

function severityEmoji(s: Victim['severity']): string {
  if (s === 'critical') return '🔴';
  if (s === 'moderate') return '🟡';
  return '🟢';
}

function ambVictimLines(
  ids: string[],
  victims: Victim[]
): { first: string; second: string } {
  if (ids.length === 0) {
    return { first: ' → —', second: '' };
  }
  const line = (id: string) => {
    const sev = victims.find((v) => v.id === id)?.severity ?? 'minor';
    return `${id} (${severityLabel(sev)}) ${severityEmoji(sev)}`;
  };
  return {
    first: ` → ${line(ids[0])}`,
    second: ids.length > 1 ? line(ids[1]) : '',
  };
}

function TreeNode({ nodeId, nodes, x, y }: { nodeId: string; nodes: Record<string, SvgTreeNodeData>; x: number; y: number }) {
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

  const nodeWidth = 90;
  const nodeHeight = 26;

  return (
    <g>
      {node.children.map((childId, i) => {
        const child = nodes[childId];
        if (!child) return null;
        const childX = x + (i - (node.children.length - 1) / 2) * 110;
        const childY = y + 50;
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
        fill={textColor} fontSize={isBacktrack ? 8 : 9}
        fontFamily="JetBrains Mono, monospace"
        fontWeight={isSolution || isStart ? 'bold' : 'normal'}
        textDecoration={isBacktrack ? 'line-through' : 'none'}
      >
        {node.label}
      </text>
      {extraLabel && (
        <text x={x} y={y + nodeHeight / 2 + 8} textAnchor="middle" fill="#ef4444" fontSize={6} fontFamily="Inter, sans-serif">
          {extraLabel}
        </text>
      )}
    </g>
  );
}

export default function CspSolver({
  cspSolution,
  victims,
  kitsRemaining,
  kitsBudget,
  onRunCsp,
}: {
  cspSolution: CspSolution | null;
  victims: Victim[];
  kitsRemaining: number;
  kitsBudget: number;
  onRunCsp: () => void;
}) {
  const flatTree = useMemo(() => {
    if (!cspSolution?.tree) {
      return {
        start: {
          label: 'START',
          valid: true,
          children: [] as string[],
          start: true,
        },
      } as Record<string, SvgTreeNodeData>;
    }
    return flattenCspTree(cspSolution.tree);
  }, [cspSolution]);

  const validTimelineSteps = useMemo(
    () => (cspSolution?.assignmentSteps ?? []).filter((s) => s.valid),
    [cspSolution]
  );

  const amb1Lines = useMemo(
    () => ambVictimLines(cspSolution?.amb1Victims ?? [], victims),
    [cspSolution, victims]
  );
  const amb2Lines = useMemo(
    () => ambVictimLines(cspSolution?.amb2Victims ?? [], victims),
    [cspSolution, victims]
  );

  const statusBadgeText =
    cspSolution == null
      ? '— Run simulation or solver'
      : cspSolution.satisfied
        ? '✅ FEASIBLE SOLUTION FOUND'
        : '⚠ NO SOLUTION';

  const activeVictimsCount = useMemo(
    () => victims.filter((v) => v.status !== 'rescued' && v.status !== 'lost').length,
    [victims]
  );

  const statItems = useMemo(
    () => [
      { label: 'Variables', value: '5', color: 'text-blue-400' },
      { label: 'Domains', value: `${activeVictimsCount} values`, color: 'text-amber-400' },
      { label: 'Constraints', value: '6', color: 'text-red-400' },
      { label: 'Backtracks', value: cspSolution != null ? String(cspSolution.backtracks) : '—', color: 'text-purple-400' },
    ],
    [cspSolution, activeVictimsCount]
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#020817]">
      {/* 1. Two-Row Top Bar */}
      <div className="shrink-0 bg-[#0f172a] border-b border-[#1e293b] flex flex-col">
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#1e293b]/50">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#64748b] font-bold tracking-widest">CSP ENGINE</span>
            <span className={`text-[9px] font-bold px-3 py-0.5 rounded-full ${cspSolution?.satisfied ? 'bg-green-500/20 text-green-400 badge-glow-green' : 'bg-amber-500/20 text-amber-400 badge-glow-amber'}`}>
              {statusBadgeText}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRunCsp()}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#3b82f6] text-[#f1f5f9] text-[10px] font-bold glow-blue hover:bg-[#2563eb] transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> RUN SOLVER
            </button>
            <button className="p-1.5 rounded-lg border border-[#334155] text-[#64748b] hover:text-[#f1f5f9] hover:bg-[#1e293b] transition-all cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="px-4 py-2 flex items-center justify-between bg-[#0a0f1e]/40">
          <div className="flex items-center gap-4">
            {statItems.map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-1.5">
                <span className="text-[9px] text-[#64748b] font-bold uppercase tracking-tighter">{stat.label}</span>
                <span className={`text-[10px] font-mono-display font-bold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-[#64748b] font-bold uppercase tracking-tighter">Active Heuristics:</span>
            <div className="flex gap-1.5">
              {['MRV', 'LCV', 'FC'].map((h) => (
                <span key={h} className="text-[8px] font-bold px-2 py-0.5 rounded bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6]">{h} ✓</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Left Column: CSP Formulation */}
        <div className="w-full lg:w-[30%] flex flex-col border-r border-[#1e293b] bg-[#0c1222]/30 overflow-hidden">
          <div className="p-4 flex flex-col h-full">
            <SectionLabel color="text-purple-400">Assignment Variables</SectionLabel>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
              <section>
                <div className="space-y-2">
                  {(cspSolution?.variables ?? []).map((v) => {
                    const domainStr = v.domain.join(', ');
                    const currentStr = v.current.length > 0 ? v.current.join(', ') : '—';
                    return (
                      <div key={v.id} className="bg-[#020817] rounded-lg p-3 border border-[#1e293b] hover:border-[#3b82f6]/30 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{v.icon}</span>
                            <span className="text-[11px] font-bold text-[#f1f5f9] tracking-tight">{v.label}</span>
                          </div>
                          <span className={v.satisfied ? "text-green-500" : "text-red-400"}>{v.satisfied ? '✅' : '❌'}</span>
                        </div>
                        <div className="text-[9px] ml-6 space-y-0.5">
                          <div className="text-[#64748b]">Domain: <span className="text-[#cbd5e1] font-mono-display">{domainStr}</span></div>
                          <div className="text-[#64748b]">Value: <span className="text-[#cbd5e1] font-mono-display">{currentStr}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest mb-2 flex items-center gap-2">
                  <div className="w-1 h-3 bg-[#3b82f6] rounded-full" />
                  Solver Heuristics
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { icon: Sparkles, title: 'MRV (Minimum Remaining Values)', desc: 'Prioritize variables with fewest legal values' },
                    { icon: GitBranch, title: 'LCV (Least Constraining Value)', desc: 'Choose value that leaves most options for neighbors' },
                    { icon: Filter, title: 'FC (Forward Checking)', desc: 'Early pruning of inconsistent domains' },
                  ].map((h) => (
                    <div key={h.title} className="bg-[#020817] p-2.5 rounded-lg border border-[#1e293b] flex items-start gap-3">
                      <h.icon className="w-4 h-4 text-[#3b82f6] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[9px] font-bold text-[#f1f5f9]">{h.title}</div>
                        <div className="text-[8px] text-[#64748b] leading-relaxed">{h.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Right Column: Search Tree */}
        <div className="flex-1 flex flex-col bg-[#020817] overflow-hidden">
          <div className="p-4 flex flex-col h-full">
            <SectionLabel>Backtracking Search Tree</SectionLabel>
            
            <div className="flex-1 bg-[#050a18] rounded-xl border border-[#1e293b] relative overflow-hidden group">
               <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
               
               <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
                 <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest bg-[#020817]/80 px-2.5 py-1.5 rounded-lg border border-[#1e293b] shadow-xl backdrop-blur-sm">
                   <div className="w-2 h-2 rounded-full bg-green-500" />
                   <span>Valid Branch</span>
                   <div className="w-2 h-2 rounded-full bg-red-500 ml-2" />
                   <span>Backtrack</span>
                 </div>
                 <div className="text-[8px] text-[#64748b] bg-[#020817]/80 px-2.5 py-1 rounded-lg border border-[#1e293b] text-center">
                   Kits: {cspSolution?.kitsUsed ?? 0}/{kitsBudget}
                 </div>
               </div>

               <div className="w-full h-full overflow-auto custom-scrollbar flex items-start justify-center p-4">
                <svg 
                  viewBox="0 0 600 420" 
                  className="w-full max-w-[700px]"
                  style={{ minWidth: '450px', height: 'auto' }}
                >
                  <TreeNode nodeId="start" nodes={flatTree} x={300} y={40} />
                </svg>
              </div>
            </div>

            <div className="mt-4">
              <SectionLabel>Assignment Timeline</SectionLabel>
              <div className="flex items-center gap-1.5 flex-wrap">
                {validTimelineSteps.map((item, i) => {
                  const color = item.variable === 'Amb1' ? 'text-blue-400' : item.variable === 'Amb2' ? 'text-cyan-400' : 'text-amber-400';
                  const vid = item.value[item.value.length - 1] ?? '';
                  return (
                    <div key={`${item.variable}-${vid}-${i}`} className="flex items-center gap-2">
                      <div className="flex flex-col items-center bg-[#0a0f1e] border border-[#1e293b] px-3 py-1 rounded-lg min-w-[80px]">
                        <span className="text-[7px] font-bold text-[#64748b] uppercase tracking-tighter">{item.variable}</span>
                        <span className={`text-[11px] font-bold font-mono-display ${color}`}>{vid}</span>
                      </div>
                      {i < validTimelineSteps.length - 1 && <span className="text-[#334155]">→</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
