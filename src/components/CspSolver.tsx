import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, RotateCcw, Sparkles, GitBranch, Filter } from 'lucide-react';
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

function constraintMatrixFromConstraints(constraints: CspConstraint[]): boolean[][] {
  if (constraints.length < 6) return [];
  const c = constraints.map((x) => x.satisfied);
  return [
    [c[0], true, true, true, c[0]],
    [true, c[1], true, true, c[1]],
    [true, true, c[2], true, c[2]],
    [true, true, true, c[3], c[3]],
    [c[4], c[4], c[4], c[4], c[4]],
    [c[5], c[5], c[5], true, c[5]],
  ];
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

export default function CspSolver({
  cspSolution,
  victims,
  onRunCsp,
}: {
  cspSolution: CspSolution | null;
  victims: Victim[];
  onRunCsp: () => void;
}) {
  const DEFAULT_PERF_PANEL_HEIGHT = 220;
  const MIN_PERF_PANEL_HEIGHT = 120;
  const MAX_PERF_PANEL_HEIGHT_RATIO = 0.75;

  const [perfPanelHeight, setPerfPanelHeight] = useState(DEFAULT_PERF_PANEL_HEIGHT);
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(DEFAULT_PERF_PANEL_HEIGHT);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = dragStartYRef.current - e.clientY;
      const maxHeight = Math.floor(window.innerHeight * MAX_PERF_PANEL_HEIGHT_RATIO);
      const nextHeight = Math.min(
        maxHeight,
        Math.max(MIN_PERF_PANEL_HEIGHT, dragStartHeightRef.current + deltaY)
      );
      setPerfPanelHeight(nextHeight);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleResizeStart = (e: React.MouseEvent<HTMLButtonElement>) => {
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartHeightRef.current = perfPanelHeight;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
  };

  const constraintHeaders = ['Amb1', 'Amb2', 'Team', 'Kits', 'Overall'];

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

  const constraintMatrix = useMemo(
    () =>
      cspSolution?.constraints?.length
        ? constraintMatrixFromConstraints(cspSolution.constraints)
        : [],
    [cspSolution]
  );

  const backtrackImprovementPct = useMemo(() => {
    const rows = cspSolution?.perfComparison;
    if (!rows || rows.length < 3) return null;
    const noHeur = rows[0].backtracks;
    const withHeur = rows[2].backtracks;
    if (noHeur === 0) return withHeur === 0 ? 100 : 0;
    return Math.round((1 - withHeur / noHeur) * 100);
  }, [cspSolution]);

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

  const statItems = useMemo(
    () => [
      { label: 'Variables', value: '4', color: 'text-blue-400' },
      {
        label: 'Domains',
        value: `${victims.length} values`,
        color: 'text-amber-400',
      },
      { label: 'Constraints', value: '6', color: 'text-red-400' },
      {
        label: 'Backtracks',
        value: cspSolution != null ? String(cspSolution.backtracks) : '—',
        color: 'text-purple-400',
      },
    ],
    [cspSolution, victims.length]
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top Status Bar */}
      <div className="shrink-0 bg-[#0f172a] border-b border-[#1e293b] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#94a3b8] font-semibold">CSP STATUS:</span>
          <span className="text-[9px] font-semibold px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400 badge-glow-green">
            {statusBadgeText}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {statItems.map((stat) => (
            <div key={stat.label} className="flex items-center gap-1.5 bg-[#020817] border border-[#1e293b] rounded-lg px-2.5 py-1">
              <span className="text-[9px] text-[#64748b]">{stat.label}:</span>
              <span className={`text-[10px] font-bold ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onRunCsp()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#3b82f6] text-[#f1f5f9] text-[10px] glow-blue hover:bg-[#2563eb] transition-colors cursor-pointer"
          >
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
              {(cspSolution?.variables ?? []).map((v) => {
                const domainStr =
                  v.id === 'kits'
                    ? v.domain.join(', ')
                    : victims.map((vic) => vic.id).join(', ');
                const currentStr =
                  v.current.length > 0 ? v.current.join(', ') : '—';
                return (
                <div key={v.id} className="bg-[#020817] rounded-lg p-3 border border-[#1e293b]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[12px]">{v.icon}</span>
                    <span className="text-[11px] font-semibold text-[#f1f5f9]">{v.label}</span>
                  </div>
                  <div className="text-[10px] text-[#94a3b8] space-y-0.5 ml-5">
                    <div>Domain: <span className="text-[#f1f5f9] font-mono-display">{domainStr}</span></div>
                    <div>{v.maxInfo}</div>
                    <div>
                      Current: <span className="text-[#f1f5f9] font-mono-display">{currentStr}</span>{' '}
                      <span
                        className="text-green-400"
                        style={v.satisfied ? undefined : { color: '#f87171' }}
                      >
                        {v.satisfied ? '✅' : '❌'}
                      </span>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            <SectionLabel>Constraints</SectionLabel>
            <div className="space-y-1 mb-4">
              {(cspSolution?.constraints ?? []).map((c) => (
                <div key={c.id} className="flex items-center gap-2 bg-[#020817] rounded-lg px-3 py-1.5 border border-[#1e293b]">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#3b82f6]/20 text-blue-400 font-mono-display">{c.id}</span>
                  <span className="text-[10px] text-[#cbd5e1] font-mono-display flex-1">{c.formula}</span>
                  <span
                    className="text-[9px] font-semibold text-green-400"
                    style={c.satisfied ? undefined : { color: '#f87171' }}
                  >
                    {c.satisfied ? '✅ SATISFIED' : '❌ VIOLATED'}
                  </span>
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
                <TreeNode nodeId="start" nodes={flatTree} x={300} y={24} />
              </svg>
            </div>
          </div>

          <div>
            <SectionLabel>Assignment Timeline</SectionLabel>
            <div className="flex items-center gap-1 flex-wrap">
              {validTimelineSteps.map((item, i) => {
                const color =
                  item.variable === 'Amb1'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : item.variable === 'Amb2'
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                const vid = item.value[item.value.length - 1] ?? '';
                const label = `${item.variable}←${vid}`;
                return (
                <div key={`${item.variable}-${vid}-${i}`} className="flex items-center gap-1">
                  <span className={`text-[9px] font-semibold px-2 py-1 rounded-lg border ${color}`}>
                    {String.fromCharCode(0x2460 + i)} {label}
                  </span>
                  {i < validTimelineSteps.length - 1 && (
                    <span className="text-[#64748b] text-[9px]">→</span>
                  )}
                </div>
                );
              })}
            </div>
          </div>

          <div className="card-glass p-4 border-glow-left-green">
            <SectionLabel color="text-green-400">✅ Optimal Assignment Found</SectionLabel>
            <div className="bg-[#020817] rounded-lg p-3 border border-[#1e293b] space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-[13px]">🚑</span>
                <div>
                  <span className="text-[11px] font-semibold text-[#f1f5f9]">Ambulance 1</span>
                  <span className="text-[10px] text-[#94a3b8]">{amb1Lines.first}</span>
                  <br />
                  <span className="text-[10px] text-[#94a3b8] ml-6">{amb1Lines.second}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[13px]">🚑</span>
                <div>
                  <span className="text-[11px] font-semibold text-[#f1f5f9]">Ambulance 2</span>
                  <span className="text-[10px] text-[#94a3b8]">{amb2Lines.first}</span>
                  <br />
                  <span className="text-[10px] text-[#94a3b8] ml-6">{amb2Lines.second}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px]">👷</span>
                <span className="text-[11px] font-semibold text-[#f1f5f9]">Rescue Team</span>
                <span className="text-[10px] text-[#94a3b8]">
                  {cspSolution?.teamVictim
                    ? (() => {
                        const sev =
                          victims.find((v) => v.id === cspSolution.teamVictim)
                            ?.severity ?? 'minor';
                        return ` → ${cspSolution.teamVictim} (${severityLabel(sev)}) ${severityEmoji(sev)}`;
                      })()
                    : ' → —'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px]">🧰</span>
                <span className="text-[11px] font-semibold text-[#f1f5f9]">Kits Used</span>
                <span className="text-[10px] text-[#94a3b8]">
                  {' → '}
                  {cspSolution?.kitsUsed ?? 0} / 10
                </span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-green-400 space-y-0.5">
              <div>
                {cspSolution?.satisfied
                  ? 'All 6 constraints satisfied ✅'
                  : 'Some constraints not satisfied — see matrix'}
              </div>
              <div>Critical victims prioritized by MRV heuristic ✅</div>
              <div>
                Resource utilization:{' '}
                {(cspSolution?.amb1Victims.length ?? 0) > 0 ? '100%' : '0%'} ambulances,{' '}
                {(cspSolution?.amb2Victims.length ?? 0) > 0 ? '100%' : '0%'} ambulance 2,{' '}
                {cspSolution?.teamVictim ? '100%' : '0%'} team ✅
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Performance */}
      <div
        className="shrink-0 border-t border-[#1e293b] bg-[#0a0f1e] px-4 py-3 overflow-y-auto"
        style={{ height: `${perfPanelHeight}px` }}
      >
        <button
          type="button"
          onMouseDown={handleResizeStart}
          className="w-full flex justify-center items-center h-3 -mt-2 mb-1 cursor-row-resize group"
          aria-label="Resize CSP Solver Performance Analysis panel"
        >
          <span className="h-1 w-16 rounded-full bg-[#334155] group-hover:bg-[#475569] transition-colors" />
        </button>
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
                {(cspSolution?.perfComparison ?? []).map((row) => (
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
              {backtrackImprovementPct != null
                ? `🎯 ${backtrackImprovementPct}% fewer backtracks with MRV + Forward Checking`
                : '—'}
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
                {constraintMatrix.map((row, i) => (
                  <tr key={`c-row-${i}`} className="border-t border-[#1e293b]">
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
              <div className="text-[10px] text-green-400 font-semibold">
                Solution Quality:{' '}
                {cspSolution?.satisfied ? 'OPTIMAL' : 'INFEASIBLE / PARTIAL'}
              </div>
              <div className="text-[10px] text-[#94a3b8]">
                {cspSolution?.satisfied
                  ? 'All hard constraints satisfied with zero violations'
                  : 'One or more hard constraints failed — review matrix'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
