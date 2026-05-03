import { useState } from 'react';
import { Database, Cpu, Brain, Network, ArrowRight } from 'lucide-react';
import {
  features, knnAccByK, mlpLossCurve, modelEvals, masterCompRows,
} from '../data/placeholder';

function SectionLabel({ children, color = 'text-[#3b82f6]' }: { children: React.ReactNode; color?: string }) {
  return <div className={`text-[10px] font-semibold tracking-[0.15em] uppercase mb-2 mt-1 ${color}`}>{children}</div>;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="w-full h-2 bg-[#1e293b] rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
    </div>
  );
}

function SimpleLineChart({ data, width, height, xLabels, highlightIdx, yLabel, color }: {
  data: number[]; width: number; height: number; xLabels?: string[];
  highlightIdx?: number; yLabel?: string; color: string;
}) {
  const min = Math.min(...data) * 0.9;
  const max = Math.max(...data) * 1.05;
  const range = max - min || 1;
  const padX = 30;
  const padY = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * chartW;
    const y = padY + chartH - ((v - min) / range) * chartH;
    return { x, y, v };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <svg width={width} height={height} className="block">
      {yLabel && <text x={4} y={padY + 4} fill="#64748b" fontSize={8} fontFamily="JetBrains Mono, monospace">{yLabel}</text>}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = padY + chartH * (1 - f);
        const val = min + range * f;
        return (
          <g key={f}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#1e293b" strokeWidth={0.5} />
            <text x={padX - 4} y={y + 3} textAnchor="end" fill="#64748b" fontSize={7} fontFamily="JetBrains Mono, monospace">{Math.round(val)}</text>
          </g>
        );
      })}
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === highlightIdx ? 3.5 : 1.5} fill={i === highlightIdx ? color : '#0f172a'} stroke={color} strokeWidth={1} />
      ))}
      {highlightIdx != null && points[highlightIdx] && (
        <text x={points[highlightIdx].x} y={points[highlightIdx].y - 8} textAnchor="middle" fill={color} fontSize={8} fontFamily="JetBrains Mono, monospace" fontWeight="bold">
          {data[highlightIdx]}
        </text>
      )}
      {xLabels && xLabels.map((lbl, i) => {
        if (data.length > 10 && i % 2 !== 0 && i !== highlightIdx) return null;
        const x = padX + (i / (data.length - 1)) * chartW;
        return <text key={i} x={x} y={height - 4} textAnchor="middle" fill="#64748b" fontSize={7} fontFamily="JetBrains Mono, monospace">{lbl}</text>;
      })}
    </svg>
  );
}

function ConfusionMatrix({ matrix }: { matrix: number[][] }) {
  const labels = ['LR', 'MR', 'HR'];
  const maxVal = Math.max(...matrix.flat());
  return (
    <div className="mt-2">
      <div className="grid grid-cols-4 gap-0.5 text-[8px]">
        <div />
        {labels.map((l) => <div key={l} className="text-center text-[#64748b] font-mono-display py-0.5">{l}</div>)}
        {matrix.map((row, i) => (
          <div key={i} className="contents">
            <div className="text-right text-[#64748b] font-mono-display pr-1 py-0.5">{labels[i]}</div>
            {row.map((val, j) => {
              const isDiag = i === j;
              const intensity = val / maxVal;
              return (
                <div
                  key={j}
                  className="text-center font-mono-display font-bold py-1 rounded-sm"
                  style={{
                    backgroundColor: isDiag
                      ? `rgba(34,197,94,${0.15 + intensity * 0.35})`
                      : `rgba(239,68,68,${0.05 + (val / maxVal) * 0.2})`,
                    color: isDiag ? '#4ade80' : '#f87171',
                  }}
                >
                  {val}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MlStudio() {
  const [activeK, setActiveK] = useState(3);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      {/* Top Dataset Bar */}
      <div className="shrink-0 bg-[#0f172a] border-b border-[#1e293b] px-4 py-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Database className="w-4 h-4 text-[#3b82f6]" />
            <span className="text-[12px] font-bold text-[#f1f5f9]">DATASET: Synthetic Disaster Risk Dataset</span>
          </div>
          <span className="text-[10px] text-[#94a3b8]">500 samples | 8 features | 3 classes</span>
        </div>
        <div className="flex items-center gap-2">
          {[
            { icon: '🔢', label: 'Total', value: '500' },
            { icon: '🎓', label: 'Train', value: '400 (80%)' },
            { icon: '🧪', label: 'Test', value: '100 (20%)' },
            { icon: '🏷', label: 'Classes', value: '3' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1 bg-[#020817] border border-[#1e293b] rounded-lg px-2.5 py-1">
              <span className="text-[9px]">{s.icon}</span>
              <span className="text-[9px] text-[#64748b]">{s.label}:</span>
              <span className="text-[10px] text-[#f1f5f9] font-semibold">{s.value}</span>
            </div>
          ))}
        </div>
        <div className="w-[220px]">
          <div className="text-[10px] text-[#94a3b8] mb-1.5">Class Distribution</div>
          {[
            { label: 'Low Risk', count: 167, pct: 33, color: '#22c55e' },
            { label: 'Medium Risk', count: 183, pct: 37, color: '#f59e0b' },
            { label: 'High Risk', count: 150, pct: 30, color: '#ef4444' },
          ].map((c) => (
            <div key={c.label} className="flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-[9px] text-[#94a3b8] w-[70px]">{c.label}</span>
              <div className="flex-1 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
              </div>
              <span className="text-[9px] text-[#64748b] w-[24px] text-right">{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 1: Feature Engineering */}
      <div className="shrink-0 px-4 py-3">
        <div className="card-glass p-4 border-glow-left-purple">
          <SectionLabel color="text-purple-400">Feature Set & Importance</SectionLabel>
          <div className="flex gap-4">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-[#64748b] text-[9px] uppercase tracking-wider">
                    <th className="text-left py-1.5 font-medium w-6">#</th>
                    <th className="text-left py-1.5 font-medium">Feature Name</th>
                    <th className="text-left py-1.5 font-medium">Type</th>
                    <th className="text-left py-1.5 font-medium">Range</th>
                    <th className="text-left py-1.5 font-medium">Importance</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((f) => (
                    <tr key={f.id} className={`border-t border-[#1e293b] ${f.id <= 3 ? 'bg-[#3b82f6]/5' : ''}`}>
                      <td className="py-1.5 text-[#64748b]">{f.id}</td>
                      <td className="py-1.5 font-mono-display text-[#f1f5f9]">{f.name}</td>
                      <td className="py-1.5 text-[#94a3b8]">{f.type}</td>
                      <td className="py-1.5 text-[#94a3b8] font-mono-display">{f.range}</td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-2">
                          <MiniBar value={f.importance} max={1} color="#3b82f6" />
                          <span className="text-[9px] text-[#94a3b8] w-8">{f.importance.toFixed(2)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="w-[280px] shrink-0">
              <div className="text-[10px] text-[#f1f5f9] font-semibold mb-1">Feature Importance Scores</div>
              <div className="text-[9px] text-[#64748b] mb-2">Ranked by model contribution</div>
              <div className="space-y-1.5">
                {features.map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <span className="text-[9px] text-[#94a3b8] w-[100px] truncate font-mono-display text-right">{f.name}</span>
                    <div className="flex-1 h-3 bg-[#1e293b] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#3b82f6] to-[#6366f1]" style={{ width: `${f.importance * 100}%` }} />
                    </div>
                    <span className="text-[9px] text-[#94a3b8] w-8">{f.importance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Model Training */}
      <div className="shrink-0 px-4 pb-3">
        <SectionLabel>Model Training</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          {/* kNN */}
          <div className="card-glass p-4 glow-blue">
            <div className="flex items-center gap-1.5 mb-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span className="text-[11px] font-bold text-[#f1f5f9]">k-Nearest Neighbors (kNN)</span>
            </div>
            <div className="mb-2">
              <div className="text-[9px] text-[#64748b] mb-1">k value:</div>
              <div className="flex gap-1">
                {[1, 2, 3, 5, 7, 10].map((k) => (
                  <button
                    key={k}
                    onClick={() => setActiveK(k)}
                    className={`px-2 py-0.5 rounded text-[9px] font-medium transition-all cursor-pointer ${
                      activeK === k ? 'bg-[#3b82f6] text-[#f1f5f9] glow-blue' : 'border border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]'
                    }`}
                  >
                    {k}{k === 3 ? ' ✓' : ''}
                  </button>
                ))}
              </div>
              <div className="text-[9px] text-[#94a3b8] mt-1">Distance: Euclidean | Weighting: Uniform</div>
            </div>
            <div className="text-[10px] space-y-0.5 mb-2">
              <div className="text-green-400">✅ Training Complete</div>
              <div className="text-[#94a3b8]">Train Time: <span className="text-[#f1f5f9]">0.8ms</span></div>
              <div className="text-[#94a3b8]">Train Accuracy: <span className="text-[#f1f5f9]">87%</span></div>
            </div>
            <div className="bg-[#020817] rounded-lg p-2 border border-[#1e293b]">
              <div className="text-[9px] text-[#64748b] mb-1">Accuracy vs K</div>
              <SimpleLineChart data={knnAccByK} width={260} height={120} xLabels={Array.from({ length: 10 }, (_, i) => String(i + 1))} highlightIdx={2} color="#3b82f6" />
            </div>
            <div className="mt-1.5 text-[10px] text-green-400 font-medium">Best k=3: Accuracy 84%</div>
          </div>

          {/* Naive Bayes */}
          <div className="card-glass p-4 glow-purple">
            <div className="flex items-center gap-1.5 mb-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-[11px] font-bold text-[#f1f5f9]">Naive Bayes (Gaussian NB)</span>
            </div>
            <div className="text-[10px] text-[#94a3b8] space-y-0.5 mb-2">
              <div>Type: <span className="text-[#f1f5f9]">Gaussian NB</span></div>
              <div>Laplace Smoothing: <span className="text-[#f1f5f9] font-mono-display">α = 1.0</span></div>
              <div>Var Smoothing: <span className="text-[#f1f5f9] font-mono-display">1e-9</span></div>
            </div>
            <div className="text-[10px] space-y-0.5 mb-2">
              <div className="text-green-400">✅ Training Complete</div>
              <div className="text-[#94a3b8]">Train Time: <span className="text-[#f1f5f9]">0.3ms</span></div>
              <div className="text-[#94a3b8]">Train Accuracy: <span className="text-[#f1f5f9]">81%</span></div>
            </div>
            <div className="bg-[#020817] rounded-lg p-2 border border-[#1e293b]">
              <div className="text-[9px] text-[#64748b] mb-1">Class Prior Probabilities</div>
              <div className="space-y-2 mt-3">
                {[
                  { label: 'Low Risk', value: 0.33, color: '#22c55e' },
                  { label: 'Med Risk', value: 0.37, color: '#f59e0b' },
                  { label: 'High Risk', value: 0.30, color: '#ef4444' },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-2">
                    <span className="text-[9px] text-[#94a3b8] w-[60px]">{c.label}</span>
                    <div className="flex-1 h-5 bg-[#1e293b] rounded overflow-hidden relative">
                      <div className="h-full rounded" style={{ width: `${c.value * 100}%`, backgroundColor: c.color }} />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] text-[#f1f5f9] font-mono-display">{c.value.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-1.5 text-[10px] text-green-400 font-medium">Fast inference: 0.3ms</div>
          </div>

          {/* MLP */}
          <div className="card-glass p-4 glow-amber">
            <div className="flex items-center gap-1.5 mb-2">
              <Network className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-bold text-[#f1f5f9]">MLP / Perceptron</span>
            </div>
            <div className="text-[10px] text-[#94a3b8] space-y-0.5 mb-2">
              <div>Architecture: <span className="text-[#f1f5f9] font-mono-display">8 → 16 → 8 → 3</span></div>
              <div>Activation: <span className="text-[#f1f5f9]">ReLU</span> | Optimizer: <span className="text-[#f1f5f9]">Adam</span> | LR: <span className="text-[#f1f5f9] font-mono-display">0.01</span></div>
              <div>Epochs: <span className="text-[#f1f5f9]">50</span> | Batch: <span className="text-[#f1f5f9]">32</span></div>
            </div>
            <div className="text-[10px] space-y-0.5 mb-2">
              <div className="text-green-400">✅ Training Complete</div>
              <div className="text-[#94a3b8]">Train Time: <span className="text-[#f1f5f9]">124ms</span></div>
              <div className="text-[#94a3b8]">Train Accuracy: <span className="text-[#f1f5f9]">89%</span></div>
            </div>
            <div className="bg-[#020817] rounded-lg p-2 border border-[#1e293b]">
              <div className="text-[9px] text-[#64748b] mb-1">Training Loss Curve</div>
              <SimpleLineChart data={mlpLossCurve} width={260} height={100} highlightIdx={49} color="#f59e0b" yLabel="Loss" />
            </div>
            <div className="bg-[#020817] rounded-lg p-2 border border-[#1e293b] mt-2">
              <div className="text-[9px] text-[#64748b] mb-1">MLP Architecture</div>
              <div className="flex items-center justify-center gap-1 py-1">
                {[
                  { nodes: 8, color: '#3b82f6', label: '8' },
                  { nodes: 5, color: '#f59e0b', label: '16' },
                  { nodes: 5, color: '#f59e0b', label: '8' },
                  { nodes: 3, color: '#22c55e', label: '3' },
                ].map((layer, li) => (
                  <div key={li} className="flex items-center gap-1">
                    <div className="flex flex-col items-center gap-0.5">
                      {Array.from({ length: layer.nodes }, (_, ni) => (
                        <div key={ni} className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: layer.color, backgroundColor: `${layer.color}30` }} />
                      ))}
                      <span className="text-[7px] text-[#64748b] font-mono-display">{layer.label}</span>
                    </div>
                    {li < 3 && <span className="text-[#334155] text-[8px]">→</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Model Evaluation */}
      <div className="shrink-0 px-4 pb-4">
        <SectionLabel>Model Evaluation & Comparison</SectionLabel>

        <div className="grid grid-cols-3 gap-3 mb-3">
          {modelEvals.map((evalModel) => (
            <div key={evalModel.model} className={`card-glass p-4 ${evalModel.borderColor} ${evalModel.borderGlow}`}>
              <div className="text-[11px] font-bold text-[#f1f5f9] mb-2">{evalModel.model} Evaluation Report</div>
              <table className="w-full text-[9px] mb-2">
                <thead>
                  <tr className="text-[#64748b]">
                    <th className="text-left py-0.5 font-medium">Class</th>
                    <th className="text-center py-0.5 font-medium">Prec</th>
                    <th className="text-center py-0.5 font-medium">Rec</th>
                    <th className="text-center py-0.5 font-medium">F1</th>
                    <th className="text-center py-0.5 font-medium">Supp</th>
                  </tr>
                </thead>
                <tbody>
                  {evalModel.classes.map((c) => (
                    <tr key={c.cls} className="border-t border-[#1e293b]">
                      <td className="py-0.5 text-[#cbd5e1]">{c.cls}</td>
                      <td className="py-0.5 text-center font-mono-display text-[#f1f5f9]">{c.precision.toFixed(2)}</td>
                      <td className="py-0.5 text-center font-mono-display text-[#f1f5f9]">{c.recall.toFixed(2)}</td>
                      <td className="py-0.5 text-center font-mono-display text-[#f1f5f9]">{c.f1.toFixed(2)}</td>
                      <td className="py-0.5 text-center font-mono-display text-[#94a3b8]">{c.support}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[10px] space-y-0.5 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#94a3b8]">Accuracy:</span>
                  <span className="text-[#f1f5f9] font-bold">{evalModel.accuracy}%</span>
                  <MiniBar value={evalModel.accuracy} max={100} color="#22c55e" />
                </div>
                <div className="text-[#94a3b8]">Macro Avg F1: <span className="text-[#f1f5f9] font-mono-display">{evalModel.macroF1.toFixed(2)}</span></div>
                <div className="text-[#94a3b8]">Weighted Avg F1: <span className="text-[#f1f5f9] font-mono-display">{evalModel.weightedF1.toFixed(2)}</span></div>
              </div>
              <div className="text-[9px] text-[#64748b] mb-1">Confusion Matrix</div>
              <ConfusionMatrix matrix={evalModel.confusionMatrix} />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="flex-1 card-glass p-4 overflow-x-auto">
            <SectionLabel>Side-by-Side Model Comparison</SectionLabel>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-[#64748b] text-[9px] uppercase tracking-wider">
                  <th className="text-left py-1.5 font-medium">Metric</th>
                  <th className="text-center py-1.5 font-medium">kNN</th>
                  <th className="text-center py-1.5 font-medium">Naive Bayes</th>
                  <th className="text-center py-1.5 font-medium">MLP</th>
                  <th className="text-center py-1.5 font-medium">Best</th>
                </tr>
              </thead>
              <tbody>
                {masterCompRows.map((row) => (
                  <tr key={row.metric} className="border-t border-[#1e293b]">
                    <td className="py-1.5 font-semibold text-[#cbd5e1]">{row.metric}</td>
                    <td className="py-1.5 text-center text-[#f1f5f9] font-mono-display">{row.knn}</td>
                    <td className="py-1.5 text-center text-[#f1f5f9] font-mono-display">{row.nb}</td>
                    <td className="py-1.5 text-center text-[#f1f5f9] font-mono-display">{row.mlp}</td>
                    <td className="py-1.5 text-center text-green-400 font-semibold">{row.best}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-[10px] text-[#94a3b8] leading-relaxed bg-[#020817] rounded-lg p-2.5 border border-[#1e293b]">
              🎯 kNN recommended for risk routing — best balance of accuracy and inference speed.<br />
              NB used for real-time uncertainty updates.<br />
              MLP used for offline survival probability estimation.
            </div>
          </div>

          <div className="w-[380px] shrink-0 card-glass p-4 border-glow-left-purple">
            <SectionLabel color="text-purple-400">ML → Agent Integration</SectionLabel>
            <div className="space-y-2">
              {[
                {
                  model: 'kNN', color: 'blue', title: 'Risk Zone Classification',
                  input: 'cell features', output: 'HIGH RISK',
                  action: 'Reroute ambulance via safe corridor (+28% time, -80% risk)',
                  target: 'Route Planning',
                },
                {
                  model: 'NB', color: 'purple', title: 'Blockage Probability',
                  input: 'road features', output: 'P(blocked) = 0.73',
                  action: 'Preemptive reroute triggered',
                  target: 'Dynamic Replanning',
                },
                {
                  model: 'MLP', color: 'amber', title: 'Victim Survival Estimation',
                  input: 'victim + env features', output: 'V1=89%, V2=58%, V3=84%',
                  action: 'V2 reprioritized (critical)',
                  target: 'Victim Prioritization',
                },
              ].map((flow) => {
                const badgeColor = flow.color === 'blue' ? 'bg-blue-500/20 text-blue-400' : flow.color === 'purple' ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400';
                const targetColor = flow.target === 'Route Planning' ? 'bg-green-500/20 text-green-400' : flow.target === 'Dynamic Replanning' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400';
                return (
                  <div key={flow.model} className="bg-[#020817] rounded-lg p-2.5 border border-[#1e293b] border-glow-left-blue">
                    <div className="text-[10px] font-semibold text-[#f1f5f9] mb-1">{flow.model} Output → {flow.title}</div>
                    <div className="text-[9px] text-[#94a3b8] space-y-0.5 mb-1.5">
                      <div>Input: <span className="text-[#f1f5f9]">{flow.input}</span> → Output: <span className="text-[#f1f5f9] font-mono-display">{flow.output}</span></div>
                      <div>Agent Action: <span className="text-[#cbd5e1]">{flow.action}</span></div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${badgeColor}`}>{flow.model}</span>
                      <ArrowRight className="w-3 h-3 text-[#64748b]" />
                      <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${targetColor}`}>{flow.target}</span>
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
