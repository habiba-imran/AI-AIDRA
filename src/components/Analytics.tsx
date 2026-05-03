import { CheckCircle, AlertTriangle, AlertCircle, Trophy, Zap, Shield, Scale } from 'lucide-react';
import { algoComparisons, cspPerfData, modelEvals, scenarioRows, tradeoffData } from '../data/placeholder';

function SectionLabel({ children, color = 'text-[#3b82f6]' }: { children: React.ReactNode; color?: string }) {
  return <div className={`text-[10px] font-semibold tracking-[0.15em] uppercase mb-2 mt-1 ${color}`}>{children}</div>;
}

function GroupedBarChart({ groups, bars, width, height }: {
  groups: { label: string; values: number[] }[];
  bars: { label: string; color: string }[];
  width: number; height: number;
}) {
  const padX = 40; const padY = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const maxVal = Math.max(...groups.flatMap((g) => g.values)) * 1.15;
  const groupW = chartW / groups.length;
  const barW = groupW / (bars.length + 1);

  return (
    <svg width={width} height={height}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = padY + chartH * (1 - f);
        const val = Math.round(maxVal * f);
        return (
          <g key={f}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#1e293b" strokeWidth={0.5} />
            <text x={padX - 4} y={y + 3} textAnchor="end" fill="#64748b" fontSize={7} fontFamily="JetBrains Mono, monospace">{val}</text>
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
                  <rect x={bx} y={by} width={barW * 0.6} height={bh} rx={2} fill={bars[bi].color} opacity={0.8} />
                  <text x={bx + barW * 0.3} y={by - 3} textAnchor="middle" fill={bars[bi].color} fontSize={7} fontFamily="JetBrains Mono, monospace">{v}</text>
                </g>
              );
            })}
            <text x={gx} y={height - 4} textAnchor="middle" fill="#94a3b8" fontSize={8} fontFamily="JetBrains Mono, monospace">{g.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SpiderChart({ axes, series, size }: {
  axes: string[];
  series: { label: string; color: string; values: number[] }[];
  size: number;
}) {
  const cx = size / 2; const cy = size / 2;
  const r = size * 0.35;
  const n = axes.length;

  const getPoint = (idx: number, val: number) => {
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
    return { x: cx + r * val * Math.cos(angle), y: cy + r * val * Math.sin(angle) };
  };

  return (
    <svg width={size} height={size}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={Array.from({ length: n }, (_, i) => { const p = getPoint(i, f); return `${p.x},${p.y}`; }).join(' ')}
          fill="none" stroke="#1e293b" strokeWidth={0.5}
        />
      ))}
      {axes.map((axis, i) => {
        const p = getPoint(i, 1);
        return (
          <g key={axis}>
            <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#1e293b" strokeWidth={0.5} />
            <text x={p.x + (p.x - cx) * 0.15} y={p.y + (p.y - cy) * 0.15} textAnchor="middle" fill="#94a3b8" fontSize={7} fontFamily="Inter, sans-serif">{axis}</text>
          </g>
        );
      })}
      {series.map((s) => (
        <g key={s.label}>
          <polygon
            points={s.values.map((v, i) => { const p = getPoint(i, v); return `${p.x},${p.y}`; }).join(' ')}
            fill={`${s.color}15`} stroke={s.color} strokeWidth={1.5}
          />
        </g>
      ))}
    </svg>
  );
}

function DualLineChart({ data, width, height }: {
  data: { label: string; time: number; risk: number }[];
  width: number; height: number;
}) {
  const padX = 35; const padY = 20;
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
    <svg width={width} height={height}>
      {[0, 4, 8, 12].map((v) => {
        const y = padY + chartH - (v / maxTime) * chartH;
        return (
          <g key={`t${v}`}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#1e293b" strokeWidth={0.5} />
            <text x={padX - 4} y={y + 3} textAnchor="end" fill="#3b82f6" fontSize={7} fontFamily="JetBrains Mono, monospace">{v}m</text>
          </g>
        );
      })}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = padY + chartH - (v / maxRisk) * chartH;
        return (
          <text key={`r${v}`} x={width - padX + 4} y={y + 3} textAnchor="start" fill="#ef4444" fontSize={7} fontFamily="JetBrains Mono, monospace">{v}</text>
        );
      })}
      <path d={timePath} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
      <path d={riskPath} fill="none" stroke="#ef4444" strokeWidth={1.5} />
      {points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.yTime} r={2.5} fill="#3b82f6" />
          <circle cx={p.x} cy={p.yRisk} r={2.5} fill="#ef4444" />
          <text x={p.x} y={height - 4} textAnchor="middle" fill="#94a3b8" fontSize={8} fontFamily="JetBrains Mono, monospace">{p.label}</text>
        </g>
      ))}
      <circle cx={points[2].x} cy={(points[2].yTime + points[2].yRisk) / 2} r={8} fill="none" stroke="#f59e0b" strokeWidth={1} strokeDasharray="2 2" />
      <text x={points[2].x + 12} y={(points[2].yTime + points[2].yRisk) / 2 + 3} fill="#f59e0b" fontSize={7} fontFamily="Inter, sans-serif">Optimal Balance</text>
    </svg>
  );
}

function RocChart({ width, height }: { width: number; height: number }) {
  const padX = 30; const padY = 15;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const curves = [
    { label: 'kNN (AUC=0.91)', color: '#3b82f6', points: [[0,0],[0.05,0.45],[0.1,0.68],[0.15,0.78],[0.25,0.86],[0.4,0.92],[0.6,0.96],[0.8,0.98],[1,1]] },
    { label: 'NB (AUC=0.85)', color: '#a855f7', points: [[0,0],[0.08,0.35],[0.15,0.55],[0.25,0.68],[0.35,0.76],[0.5,0.84],[0.7,0.92],[0.85,0.96],[1,1]] },
    { label: 'MLP (AUC=0.94)', color: '#22c55e', points: [[0,0],[0.03,0.52],[0.06,0.72],[0.1,0.82],[0.18,0.90],[0.3,0.95],[0.5,0.98],[0.75,0.99],[1,1]] },
  ];

  const toSvg = (pt: number[]) => ({
    x: padX + pt[0] * chartW,
    y: padY + chartH - pt[1] * chartH,
  });

  return (
    <svg width={width} height={height}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = padY + chartH * (1 - f);
        const x = padX + chartW * f;
        return (
          <g key={f}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#1e293b" strokeWidth={0.5} />
            <line x1={x} y1={padY} x2={x} y2={height - padY} stroke="#1e293b" strokeWidth={0.5} />
            <text x={padX - 4} y={y + 3} textAnchor="end" fill="#64748b" fontSize={7} fontFamily="JetBrains Mono, monospace">{f.toFixed(1)}</text>
            <text x={x} y={height - padY + 12} textAnchor="middle" fill="#64748b" fontSize={7} fontFamily="JetBrains Mono, monospace">{f.toFixed(1)}</text>
          </g>
        );
      })}
      <line x1={padX} y1={padY + chartH} x2={padX + chartW} y2={padY} stroke="#334155" strokeWidth={0.8} strokeDasharray="4 3" />
      {curves.map((c) => {
        const svgPoints = c.points.map(toSvg);
        const d = svgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
        return <path key={c.label} d={d} fill="none" stroke={c.color} strokeWidth={1.5} />;
      })}
      <text x={width / 2} y={height - 1} textAnchor="middle" fill="#64748b" fontSize={7}>False Positive Rate</text>
      <text x={4} y={padY + 4} fill="#64748b" fontSize={7} transform={`rotate(-90,4,${padY + 4})`}>TPR</text>
      {curves.map((c, i) => (
        <g key={c.label}>
          <line x1={padX + 10} y1={padY + 8 + i * 12} x2={padX + 25} y2={padY + 8 + i * 12} stroke={c.color} strokeWidth={1.5} />
          <text x={padX + 28} y={padY + 11 + i * 12} fill={c.color} fontSize={7} fontFamily="JetBrains Mono, monospace">{c.label}</text>
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

export default function Analytics() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
      {/* Section 1: Search Algorithm Analysis */}
      <div className="card-glass p-4 glow-blue">
        <SectionLabel>Search Algorithms: Comparative Performance</SectionLabel>
        <div className="flex gap-4">
          <div className="w-[35%]">
            <div className="text-[10px] text-[#f1f5f9] font-semibold mb-1">Nodes Expanded vs Path Cost</div>
            <GroupedBarChart
              groups={algoComparisons.map((a) => ({ label: a.algo, values: [a.nodesExpanded, a.pathCost] }))}
              bars={[{ label: 'Nodes', color: '#3b82f6' }, { label: 'Cost', color: '#22c55e' }]}
              width={420} height={220}
            />
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3b82f6]" /><span className="text-[8px] text-[#94a3b8]">Nodes Expanded</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22c55e]" /><span className="text-[8px] text-[#94a3b8]">Path Cost</span></div>
            </div>
          </div>

          <div className="w-[30%] flex flex-col items-center">
            <div className="text-[10px] text-[#f1f5f9] font-semibold mb-1">Multi-Metric Algorithm Comparison</div>
            <SpiderChart
              axes={['Speed', 'Memory', 'Optimality', 'Risk Avoid.', 'Complete.']}
              series={[
                { label: 'BFS', color: '#3b82f6', values: [0.3, 0.2, 1, 0.4, 1] },
                { label: 'DFS', color: '#a855f7', values: [0.9, 0.9, 0.3, 0.2, 0.5] },
                { label: 'Greedy', color: '#f59e0b', values: [0.8, 0.7, 0.4, 0.3, 0.4] },
                { label: 'A*', color: '#22c55e', values: [0.6, 0.5, 1, 0.9, 1] },
              ]}
              size={200}
            />
            <div className="flex flex-wrap gap-2 mt-1 justify-center">
              {[{ l: 'BFS', c: '#3b82f6' }, { l: 'DFS', c: '#a855f7' }, { l: 'Greedy', c: '#f59e0b' }, { l: 'A*', c: '#22c55e' }].map((s) => (
                <div key={s.l} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.c }} />
                  <span className="text-[8px] text-[#94a3b8]">{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-[35%] card-glass p-3 border-glow-left-purple">
            <SectionLabel color="text-purple-400">Key Findings</SectionLabel>
            <div className="space-y-2 text-[10px]">
              {[
                { icon: CheckCircle, color: 'text-green-400', text: 'A* achieved optimal path with 70% fewer node expansions than BFS' },
                { icon: CheckCircle, color: 'text-green-400', text: 'DFS fastest (8ms) but produced suboptimal path — 50% higher cost than A*' },
                { icon: AlertTriangle, color: 'text-amber-400', text: 'Greedy Best-First fast but risk-unaware — routed through fire zone in 3/4 test runs' },
                { icon: CheckCircle, color: 'text-green-400', text: 'A* with risk-weighted heuristic reduced risk exposure score by 80%' },
                { icon: AlertCircle, color: 'text-blue-400', text: 'Recommendation: A* for all routing tasks in AIDRA system' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <item.icon className={`w-3.5 h-3.5 ${item.color} shrink-0 mt-0.5`} />
                  <span className="text-[#cbd5e1]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: CSP Heuristic Impact */}
      <div className="card-glass p-4 glow-green">
        <SectionLabel color="text-green-400">CSP Solver: Heuristic Impact Analysis</SectionLabel>
        <div className="flex gap-4">
          <div className="w-[50%]">
            <div className="text-[10px] text-[#f1f5f9] font-semibold mb-1">Backtracks & Time: With vs Without Heuristics</div>
            <GroupedBarChart
              groups={cspPerfData.map((d) => ({ label: d.method, values: [d.backtracks, d.timeMs] }))}
              bars={[{ label: 'Backtracks', color: '#ef4444' }, { label: 'Time (ms)', color: '#3b82f6' }]}
              width={560} height={200}
            />
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444]" /><span className="text-[8px] text-[#94a3b8]">Backtracks</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3b82f6]" /><span className="text-[8px] text-[#94a3b8]">Time (ms)</span></div>
            </div>
          </div>
          <div className="w-[50%] space-y-2">
            {[
              { icon: '❌', label: 'No Heuristic', backtracks: 23, time: 89, desc: 'Brute force search. Explores invalid assignments repeatedly.', color: 'red' },
              { icon: '🟡', label: 'MRV Only', backtracks: 11, time: 34, desc: '52% improvement. Assigns most constrained variable first.', color: 'amber' },
              { icon: '✅', label: 'MRV + Forward Checking', backtracks: 4, time: 12, desc: '83% improvement ⭐. Prunes domains early, eliminates dead ends. SELECTED for AIDRA system.', color: 'green' },
            ].map((item) => {
              const borderClass = item.color === 'red' ? 'border-glow-left-red' : item.color === 'amber' ? 'border-glow-left-amber' : 'border-glow-left-green';
              return (
                <div key={item.label} className={`bg-[#020817] rounded-lg p-2.5 border border-[#1e293b] ${borderClass}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px]">{item.icon}</span>
                    <span className="text-[10px] font-semibold text-[#f1f5f9]">{item.label}</span>
                  </div>
                  <div className="text-[9px] text-[#94a3b8]">
                    <span className="font-mono-display">{item.backtracks} backtracks</span> | <span className="font-mono-display">{item.time}ms</span>
                    {item.color !== 'red' && <span className={`ml-1 ${item.color === 'green' ? 'text-green-400' : 'text-amber-400'}`}>{item.color === 'green' ? '83% improvement ⭐' : '52% improvement'}</span>}
                  </div>
                  <div className="text-[9px] text-[#64748b] mt-0.5">{item.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 3: Conflicting Objectives */}
      <div className="card-glass p-4 glow-amber">
        <SectionLabel color="text-amber-400">Trade-off Analysis: Conflicting Objectives</SectionLabel>
        <div className="flex gap-4">
          <div className="w-[55%]">
            <div className="text-[10px] text-[#f1f5f9] font-semibold mb-1">Rescue Time vs Risk Exposure Across Strategies</div>
            <DualLineChart data={tradeoffData.map(d => ({ label: d.scenario, time: d.time, risk: d.risk }))} width={600} height={220} />
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3b82f6]" /><span className="text-[8px] text-[#94a3b8]">Rescue Time (min)</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444]" /><span className="text-[8px] text-[#94a3b8]">Risk Score</span></div>
            </div>
          </div>
          <div className="w-[45%] space-y-2">
            {[
              { icon: Zap, border: 'border-glow-left-red', title: 'MINIMIZE TIME STRATEGY', time: '6.2 min ↓ BEST', risk: '78 pts ↑ WORST', victims: '4 / 5', desc: 'Routes through hazard zones — faster but exposes ambulances to aftershock risk' },
              { icon: Shield, border: 'border-glow-left-green', title: 'MINIMIZE RISK STRATEGY', time: '10.4 min ↑ WORST', risk: '31 pts ↓ BEST', victims: '5 / 5', desc: 'Avoids all hazard zones — safest but 1 critical victim may not survive the delay' },
              { icon: Scale, border: 'border-glow-left-blue', title: 'BALANCED STRATEGY ⭐', time: '8.1 min — BALANCED', risk: '45 pts — BALANCED', victims: '5 / 5 ✅ BEST', desc: 'A* with weighted heuristic — recommended for AIDRA. All victims saved within survival threshold.' },
            ].map((s) => (
              <div key={s.title} className={`bg-[#020817] rounded-lg p-2.5 border border-[#1e293b] ${s.border}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className="w-3.5 h-3.5 text-[#f1f5f9]" />
                  <span className="text-[10px] font-semibold text-[#f1f5f9]">{s.title}</span>
                </div>
                <div className="text-[9px] text-[#94a3b8] space-y-0.5">
                  <div>Avg Rescue Time: <span className="text-[#f1f5f9]">{s.time}</span></div>
                  <div>Risk Exposure: <span className="text-[#f1f5f9]">{s.risk}</span></div>
                  <div>Victims Saved: <span className="text-[#f1f5f9]">{s.victims}</span></div>
                  <div className="text-[#64748b] italic">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 4: ML Model Comparison */}
      <div className="card-glass p-4 glow-purple">
        <SectionLabel color="text-purple-400">ML Models: Performance Comparison</SectionLabel>
        <div className="flex gap-4">
          <div className="w-[50%]">
            <div className="text-[10px] text-[#f1f5f9] font-semibold mb-1">Accuracy | Precision | Recall | F1 per Model</div>
            <GroupedBarChart
              groups={modelEvals.map((m) => ({
                label: m.model,
                values: [m.accuracy, Math.round(m.classes.reduce((s, c) => s + c.precision, 0) / m.classes.length * 100), Math.round(m.classes.reduce((s, c) => s + c.recall, 0) / m.classes.length * 100), Math.round(m.classes.reduce((s, c) => s + c.f1, 0) / m.classes.length * 100)],
              }))}
              bars={[
                { label: 'Accuracy', color: '#3b82f6' },
                { label: 'Precision', color: '#22c55e' },
                { label: 'Recall', color: '#f59e0b' },
                { label: 'F1', color: '#a855f7' },
              ]}
              width={560} height={200}
            />
            <div className="flex items-center gap-3 mt-1">
              {[{ l: 'Accuracy', c: '#3b82f6' }, { l: 'Precision', c: '#22c55e' }, { l: 'Recall', c: '#f59e0b' }, { l: 'F1', c: '#a855f7' }].map((b) => (
                <div key={b.l} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.c }} />
                  <span className="text-[8px] text-[#94a3b8]">{b.l}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-[50%]">
            <div className="text-[10px] text-[#f1f5f9] font-semibold mb-1">ROC Curves (simulated)</div>
            <RocChart width={560} height={200} />
          </div>
        </div>
      </div>

      {/* Section 5: System KPI Summary */}
      <div className="card-glass p-4" style={{ boxShadow: '0 0 12px rgba(255,255,255,0.1)' }}>
        <SectionLabel color="text-[#f1f5f9]">System Performance Across Scenarios</SectionLabel>

        <div className="overflow-x-auto mb-3">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-[#64748b] text-[9px] uppercase tracking-wider">
                <th className="text-left py-1.5 font-medium">Scenario</th>
                <th className="text-left py-1.5 font-medium">Algorithm</th>
                <th className="text-left py-1.5 font-medium">ML Model</th>
                <th className="text-center py-1.5 font-medium">Victims Saved</th>
                <th className="text-center py-1.5 font-medium">Avg Time</th>
                <th className="text-center py-1.5 font-medium">Risk Score</th>
                <th className="text-center py-1.5 font-medium">Optimality</th>
                <th className="text-center py-1.5 font-medium">Replan Events</th>
              </tr>
            </thead>
            <tbody>
              {scenarioRows.map((s) => (
                <tr key={s.id} className={`border-t border-[#1e293b] ${s.best ? 'bg-amber-500/10 border-l-2 border-l-amber-500' : ''}`}>
                  <td className="py-1.5 font-bold text-[#f1f5f9]">{s.id}</td>
                  <td className="py-1.5 text-[#cbd5e1]">{s.algorithm}</td>
                  <td className="py-1.5 text-[#cbd5e1]">{s.mlModel}</td>
                  <td className={`py-1.5 text-center font-semibold ${colorForVictims(s.victimsSaved)}`}>{s.victimsSaved}</td>
                  <td className="py-1.5 text-center text-[#f1f5f9] font-mono-display">{s.avgTime}</td>
                  <td className={`py-1.5 text-center font-semibold ${colorForRisk(s.riskScore)}`}>{s.riskScore}</td>
                  <td className={`py-1.5 text-center font-mono-display font-semibold ${colorForOptimality(s.optimality)}`}>{s.optimality.toFixed(2)}</td>
                  <td className="py-1.5 text-center text-[#cbd5e1]">{s.replanEvents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-3">
          {scenarioRows.map((s) => {
            const outcomeBg = s.outcomeColor === 'green' ? 'bg-green-500/20 text-green-400 badge-glow-green' : s.outcomeColor === 'amber' ? 'bg-amber-500/20 text-amber-400 badge-glow-amber' : 'bg-red-500/20 text-red-400 badge-glow-red';
            return (
              <div key={s.id} className="card-glass p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-[#f1f5f9]">{s.id}</span>
                  <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-[#3b82f6]/20 text-blue-400">{s.algorithm}</span>
                </div>
                <div className="text-[9px] text-[#94a3b8] space-y-0.5 mb-1.5">
                  <div>Victims: <span className={colorForVictims(s.victimsSaved)}>{s.victimsSaved}</span> | Time: <span className="text-[#f1f5f9]">{s.avgTime}</span></div>
                  <div>Risk: <span className={colorForRisk(s.riskScore)}>{s.riskScore}</span> | Opt: <span className={colorForOptimality(s.optimality)}>{s.optimality.toFixed(2)}</span></div>
                </div>
                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${outcomeBg}`}>{s.outcome}</span>
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-amber-900/40 to-amber-800/30 border border-amber-500/30 rounded-xl p-3 glow-amber">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-[12px] font-bold text-amber-300">RECOMMENDED CONFIGURATION</span>
          </div>
          <div className="text-[10px] text-amber-200/90 leading-relaxed">
            A* Search + Fuzzy Logic Uncertainty + MLP Risk Estimation<br />
            → 5/5 Victims Saved | Risk Score: 38 | Optimality: 0.94 | All constraints satisfied
          </div>
        </div>
      </div>
    </div>
  );
}
