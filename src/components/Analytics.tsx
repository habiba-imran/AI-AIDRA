import { useMemo } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Trophy, Zap, Shield, Scale } from 'lucide-react';
import type { SimulationState } from '../types';
import {
  liveAlgoBarGroups,
  liveCspPerfGroups,
  liveMlBarGroups,
  liveScenarioRow,
  pathOptimalityScore,
} from '../utils/analyticsLive';
import { algoComparisons, cspPerfData, modelEvals, scenarioRows, tradeoffData } from '../data/placeholder';

function SectionLabel({ children, color = 'text-[#3b82f6]' }: { children: React.ReactNode; color?: string }) {
  return <div className={`text-sm font-bold tracking-widest uppercase mb-4 mt-2 ${color}`}>{children}</div>;
}

function GroupedBarChart({ groups, bars, width, height }: {
  groups: { label: string; values: number[] }[];
  bars: { label: string; color: string }[];
  width: number; height: number;
}) {
  const padX = 50; const padY = 30;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const maxVal = Math.max(...groups.flatMap((g) => g.values)) * 1.15;
  const groupW = chartW / groups.length;
  const barW = groupW / (bars.length + 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = padY + chartH * (1 - f);
        const val = Math.round(maxVal * f);
        return (
          <g key={f}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#1e293b" strokeWidth={1} />
            <text x={padX - 8} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize={12} fontFamily="JetBrains Mono, monospace">{val}</text>
          </g>
        );
      })}
      {groups.map((g, gi) => {
        const gx = padX + gi * groupW + groupW / 2;
        return (
          <g key={g.label}>
            {g.values.map((v, bi) => {
              const bx = gx - (bars.length * barW) / 2 + bi * barW + barW * 0.2;
              const bh = (v / maxVal) * chartH;
              const by = padY + chartH - bh;
              return (
                <g key={bi}>
                  <rect x={bx} y={by} width={barW * 0.6} height={bh} rx={3} fill={bars[bi].color} opacity={0.9} />
                  <text x={bx + barW * 0.3} y={by - 5} textAnchor="middle" fill={bars[bi].color} fontSize={10} fontFamily="JetBrains Mono, monospace" fontWeight="bold">{v}</text>
                </g>
              );
            })}
            <text x={gx} y={height - 8} textAnchor="middle" fill="#cbd5e1" fontSize={14} fontWeight="bold">{g.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DualLineChart({ data, width, height }: {
  data: { label: string; time: number; risk: number }[];
  width: number; height: number;
}) {
  const padX = 50; const padY = 30;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const maxTime = 12; const maxRisk = 100;

  const points = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * chartW,
    yTime: padY + chartH - (d.time / maxTime) * chartH,
    yRisk: padY + chartH - (d.risk / maxRisk) * chartH,
    ...d,
  }));

  const timePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.yTime}`).join(' ');
  const riskPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.yRisk}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {[0, 4, 8, 12].map((v) => {
        const y = padY + chartH - (v / maxTime) * chartH;
        return (
          <g key={`t${v}`}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#1e293b" strokeWidth={1} />
            <text x={padX - 8} y={y + 4} textAnchor="end" fill="#3b82f6" fontSize={12} fontFamily="JetBrains Mono, monospace">{v}m</text>
          </g>
        );
      })}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = padY + chartH - (v / maxRisk) * chartH;
        return (
          <text key={`r${v}`} x={width - padX + 8} y={y + 4} textAnchor="start" fill="#ef4444" fontSize={12} fontFamily="JetBrains Mono, monospace">{v}</text>
        );
      })}
      <path d={timePath} fill="none" stroke="#3b82f6" strokeWidth={2} />
      <path d={riskPath} fill="none" stroke="#ef4444" strokeWidth={2} />
      {points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.yTime} r={4} fill="#3b82f6" />
          <circle cx={p.x} cy={p.yRisk} r={4} fill="#ef4444" />
          <text x={p.x} y={height - 8} textAnchor="middle" fill="#cbd5e1" fontSize={12} fontWeight="bold">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

function colorForVictims(v: string) {
  if (v === '5/5') return 'text-green-400';
  if (v === '4/5') return 'text-amber-400';
  return 'text-red-400';
}

function colorForRisk(r: number) {
  if (r < 40) return 'text-green-400';
  if (r < 60) return 'text-amber-400';
  return 'text-red-400';
}

function colorForOptimality(o: number) {
  if (o > 0.9) return 'text-green-400';
  if (o > 0.7) return 'text-amber-400';
  return 'text-red-400';
}

function formatOptimalityCell(s: { id: string; optimality: number }) {
  if (s.id === 'Live' && s.optimality < 0) return '—';
  return s.optimality.toFixed(2);
}

function optimalityCellClass(s: { id: string; optimality: number }) {
  if (s.id === 'Live' && s.optimality < 0) return 'text-[#94a3b8]';
  return colorForOptimality(s.optimality);
}

const CSP_STATIC_CARDS = [
  { icon: '❌', label: 'No Heuristic', backtracks: 23, time: 89, desc: 'Brute force search. Explores invalid assignments repeatedly.', color: 'red' as const },
  { icon: '🟡', label: 'MRV Only', backtracks: 11, time: 34, desc: '52% improvement. Assigns most constrained variable first.', color: 'amber' as const },
  { icon: '✅', label: 'MRV + Forward Checking', backtracks: 4, time: 12, desc: '83% improvement ⭐. Prunes domains early, eliminates dead ends. SELECTED for AIDRA system.', color: 'green' as const },
];

interface AnalyticsProps {
  state: SimulationState;
}

export default function Analytics({ state }: AnalyticsProps) {
  const algoGroups = useMemo(
    () =>
      state.allAlgoComparisons.length > 0
        ? liveAlgoBarGroups(state.allAlgoComparisons)
        : algoComparisons.map((a) => ({ label: a.algo, values: [a.nodesExpanded, a.pathCost] })),
    [state.allAlgoComparisons]
  );

  const cspChartGroups = useMemo(
    () =>
      state.cspSolution?.perfComparison?.length
        ? liveCspPerfGroups(state.cspSolution.perfComparison)
        : cspPerfData.map((d) => ({ label: d.method, values: [d.backtracks, d.timeMs] })),
    [state.cspSolution]
  );

  const cspDetailCards = useMemo(() => {
    const p = state.cspSolution?.perfComparison;
    if (!p?.length) return CSP_STATIC_CARDS;
    const icons: string[] = ['❌', '🟡', '✅'];
    const colors: Array<'red' | 'amber' | 'green'> = ['red', 'amber', 'green'];
    const descs = [
      'Baseline CSP search without variable ordering heuristics.',
      'Most constrained variable first reduces backtracking.',
      'Forward checking + MRV — solver used for live CSP in AIDRA.',
    ];
    return p.map((row, i) => ({
      icon: icons[i] ?? '•',
      label: row.method,
      backtracks: row.backtracks,
      time: Math.round(row.timeMs * 100) / 100,
      desc: descs[i] ?? '',
      color: colors[Math.min(i, 2)] ?? 'amber',
    }));
  }, [state.cspSolution]);

  const mlBarGroups = useMemo(
    () =>
      state.mlEvalSnapshot
        ? liveMlBarGroups(state.mlEvalSnapshot)
        : modelEvals.map((m) => ({
            label: m.model,
            values: [
              m.accuracy,
              Math.round(
                (m.classes.reduce((s, c) => s + c.precision, 0) / m.classes.length) * 100
              ),
              Math.round((m.classes.reduce((s, c) => s + c.recall, 0) / m.classes.length) * 100),
              Math.round((m.classes.reduce((s, c) => s + c.f1, 0) / m.classes.length) * 100),
            ],
          })),
    [state.mlEvalSnapshot]
  );

  const scenarioTableRows = useMemo(() => {
    if (state.allAlgoComparisons.length === 0) return scenarioRows;
    return [liveScenarioRow(state), ...scenarioRows];
  }, [state]);

  const keyFindingItems = useMemo(() => {
    const base = [
      {
        icon: CheckCircle,
        color: 'text-green-400',
        text: 'A* achieved optimal path with 70% fewer node expansions than BFS',
      },
      {
        icon: CheckCircle,
        color: 'text-green-400',
        text: 'DFS fastest but produced suboptimal path — 50% higher cost than A*',
      },
      {
        icon: AlertTriangle,
        color: 'text-amber-400',
        text: 'Greedy Best-First fast but risk-unaware — routed through fire zone in most tests',
      },
      {
        icon: CheckCircle,
        color: 'text-green-400',
        text: 'A* with risk-weighted heuristic reduced risk exposure score by 80%',
      },
      {
        icon: AlertCircle,
        color: 'text-blue-400',
        text: 'Recommendation: A* for all routing tasks in AIDRA system',
      },
    ];
    if (state.allAlgoComparisons.length === 0) return base;
    const positive = state.allAlgoComparisons.filter((c) => c.pathCost > 0);
    const best = positive.length ? Math.min(...positive.map((c) => c.pathCost)) : null;
    const sel = state.allAlgoComparisons.find((c) => c.algo === state.searchAlgorithm);
    const algoLabel = state.searchAlgorithm === 'Astar' ? 'A*' : state.searchAlgorithm;
    base[0] = {
      icon: CheckCircle,
      color: 'text-green-400',
      text: `Live grid: ${algoLabel} path cost ${sel?.pathCost ?? '—'}; lowest cost among compared algorithms: ${best ?? '—'}.`,
    };
    return base;
  }, [state]);

  const recommendedBlurb = useMemo(() => {
    if (state.allAlgoComparisons.length === 0) {
      return (
        <>
          A* Search + Fuzzy Logic Uncertainty + MLP Risk Estimation<br />
          → 5/5 Victims Saved | Risk Score: 38 | Optimality: 0.94 | All constraints satisfied
        </>
      );
    }
    const algo = state.searchAlgorithm === 'Astar' ? 'A*' : state.searchAlgorithm;
    const fuzzy = state.fuzzyLogicEnabled ? 'Fuzzy' : 'Crisp costs';
    const ml = state.mlModel === 'NaiveBayes' ? 'NB' : state.mlModel;
    const saved = state.victims.filter((v) => v.status === 'rescued').length;
    const total = state.victims.length;
    const opt = pathOptimalityScore(state.allAlgoComparisons, state.searchAlgorithm);
    const optStr = opt === null ? '—' : opt.toFixed(2);
    const risk = Math.round(state.riskExposureScore);
    return (
      <>
        {algo} Search + {fuzzy} + {ml} risk model<br />
        → Victims {saved}/{total} | Risk: {risk} pts | Path optimality: {optStr} | Replans: {state.replanCount}
      </>
    );
  }, [state]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
      
      {/* Section 1: Search Algorithm Analysis */}
      <div className="card-glass p-6 glow-blue border border-blue-500/20">
        <SectionLabel>Search Algorithms: Comparative Performance</SectionLabel>
        <div className="flex flex-col xl:flex-row gap-8">
          <div className="w-full xl:w-[50%]">
            <div className="text-base text-[#f1f5f9] font-bold mb-4">Nodes Expanded vs Path Cost</div>
            <div className="bg-[#020817]/50 rounded-xl p-4 border border-[#1e293b]">
              <GroupedBarChart
                groups={algoGroups}
                bars={[{ label: 'Nodes', color: '#3b82f6' }, { label: 'Cost', color: '#22c55e' }]}
                width={500} height={250}
              />
            </div>
            <div className="flex items-center gap-4 mt-4 justify-center">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#3b82f6]" /><span className="text-sm text-[#cbd5e1] font-semibold">Nodes Expanded</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#22c55e]" /><span className="text-sm text-[#cbd5e1] font-semibold">Path Cost</span></div>
            </div>
          </div>

          <div className="w-full xl:w-[50%] flex flex-col justify-center">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 h-full">
              <div className="text-base font-bold text-blue-400 mb-4">Key Insights</div>
              <div className="space-y-4">
                {keyFindingItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg bg-white/5 ${item.color}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm text-[#cbd5e1] leading-relaxed pt-0.5">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Trade-off Analysis */}
      <div className="card-glass p-6 glow-amber border border-amber-500/20">
        <SectionLabel color="text-amber-400">Trade-off Analysis: Conflicting Objectives</SectionLabel>
        <div className="flex flex-col xl:flex-row gap-8">
          <div className="w-full xl:w-[50%]">
            <div className="text-base text-[#f1f5f9] font-bold mb-4">Pareto Frontier: Risk vs Time</div>
            <div className="bg-[#020817]/50 rounded-xl p-4 border border-[#1e293b]">
              <DualLineChart data={tradeoffData.map(d => ({ label: d.scenario, time: d.time, risk: d.risk }))} width={500} height={250} />
            </div>
            <div className="flex items-center gap-4 mt-4 justify-center">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#3b82f6]" /><span className="text-sm text-[#cbd5e1] font-semibold">Rescue Time (min)</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#ef4444]" /><span className="text-sm text-[#cbd5e1] font-semibold">Risk Score</span></div>
            </div>
          </div>
          <div className="w-full xl:w-[50%] space-y-4">
            {[
              { icon: Zap, border: 'border-l-4 border-red-500', title: 'MINIMIZE TIME STRATEGY', time: '6.2 min (BEST)', risk: '78 pts (WORST)', victims: '4 / 5', desc: 'Aggressive routing through hazard zones.' },
              { icon: Shield, border: 'border-l-4 border-green-500', title: 'MINIMIZE RISK STRATEGY', time: '10.4 min (WORST)', risk: '31 pts (BEST)', victims: '5 / 5', desc: 'Safest routing, potentially missing critical windows.' },
              { icon: Scale, border: 'border-l-4 border-blue-500 bg-blue-500/5', title: 'BALANCED STRATEGY ⭐', time: '8.1 min (OPTIMAL)', risk: '45 pts (OPTIMAL)', victims: '5 / 5 (BEST)', desc: 'Recommended config for AIDRA live missions.' },
            ].map((s) => (
              <div key={s.title} className={`bg-[#020817] rounded-xl p-4 border border-[#1e293b] shadow-lg ${s.border}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-white/5">
                    <s.icon className="w-5 h-5 text-[#f1f5f9]" />
                  </div>
                  <span className="text-sm font-bold text-[#f1f5f9] uppercase tracking-wide">{s.title}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-[#94a3b8]">Time: <span className="text-white font-mono-display font-semibold">{s.time}</span></div>
                  <div className="text-[#94a3b8]">Risk: <span className="text-white font-mono-display font-semibold">{s.risk}</span></div>
                  <div className="text-[#94a3b8]">Victims: <span className="text-white font-mono-display font-semibold">{s.victims}</span></div>
                  <div className="text-[#64748b] italic">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: ML Model Comparison */}
      <div className="card-glass p-6 glow-purple border border-purple-500/20">
        <SectionLabel color="text-purple-400">Machine Learning Models: Performance Comparison</SectionLabel>
        <div className="text-base text-[#f1f5f9] font-bold mb-4">Metrics per Model</div>
        <div className="bg-[#020817]/50 rounded-xl p-4 border border-[#1e293b] max-w-4xl mx-auto">
          <GroupedBarChart
            groups={mlBarGroups}
            bars={[
              { label: 'Accuracy', color: '#3b82f6' },
              { label: 'Precision', color: '#22c55e' },
              { label: 'Recall', color: '#f59e0b' },
              { label: 'F1 Score', color: '#a855f7' },
            ]}
            width={800} height={300}
          />
        </div>
        <div className="flex items-center gap-6 mt-4 justify-center">
          {[{ l: 'Accuracy', c: '#3b82f6' }, { l: 'Precision', c: '#22c55e' }, { l: 'Recall', c: '#f59e0b' }, { l: 'F1 Score', c: '#a855f7' }].map((b) => (
            <div key={b.l} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.c }} />
              <span className="text-sm text-[#cbd5e1] font-semibold">{b.l}</span>
            </div>
          ))}
        </div>
      </div>


    </div>
  );
}
