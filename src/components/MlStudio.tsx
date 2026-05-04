import { useEffect, useMemo, useState } from 'react';
import { Database, Cpu, Brain, Network, ArrowRight, Play } from 'lucide-react';
import { features } from '../data/placeholder';
import type { MLModel, MlEvalSnapshot, MlModelEvalReport, Victim, VictimMlEstimate } from '../types';

const FEATURE_DIM = 8;
const K_BUTTONS = [1, 2, 3, 5, 7, 10] as const;

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

function SimpleLineChart({
  data,
  width,
  height,
  xLabels,
  highlightIdx,
  yLabel,
  color,
}: {
  data: number[];
  width: number;
  height: number;
  xLabels?: string[];
  highlightIdx?: number;
  yLabel?: string;
  color: string;
}) {
  if (data.length === 0) return null;
  const min = Math.min(...data) * 0.9;
  const max = Math.max(...data) * 1.05;
  const range = max - min || 1;
  const padX = 30;
  const padY = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const denom = Math.max(1, data.length - 1);
  const points = data.map((v, i) => {
    const x = padX + (i / denom) * chartW;
    const y = padY + chartH - ((v - min) / range) * chartH;
    return { x, y, v };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <svg width={width} height={height} className="block">
      {yLabel && (
        <text x={4} y={padY + 4} fill="#64748b" fontSize={8} fontFamily="JetBrains Mono, monospace">
          {yLabel}
        </text>
      )}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = padY + chartH * (1 - f);
        const val = min + range * f;
        return (
          <g key={f}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#1e293b" strokeWidth={0.5} />
            <text
              x={padX - 4}
              y={y + 3}
              textAnchor="end"
              fill="#64748b"
              fontSize={7}
              fontFamily="JetBrains Mono, monospace"
            >
              {Math.round(val * 1000) / 1000}
            </text>
          </g>
        );
      })}
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === highlightIdx ? 3.5 : 1.5}
          fill={i === highlightIdx ? color : '#0f172a'}
          stroke={color}
          strokeWidth={1}
        />
      ))}
      {highlightIdx != null && points[highlightIdx] && (
        <text
          x={points[highlightIdx].x}
          y={points[highlightIdx].y - 8}
          textAnchor="middle"
          fill={color}
          fontSize={8}
          fontFamily="JetBrains Mono, monospace"
          fontWeight="bold"
        >
          {Math.round(data[highlightIdx] * 1000) / 1000}
        </text>
      )}
      {xLabels &&
        xLabels.map((lbl, i) => {
          if (data.length > 10 && i % 2 !== 0 && i !== highlightIdx) return null;
          const x = padX + (i / denom) * chartW;
          return (
            <text key={i} x={x} y={height - 4} textAnchor="middle" fill="#64748b" fontSize={7} fontFamily="JetBrains Mono, monospace">
              {lbl}
            </text>
          );
        })}
    </svg>
  );
}

function ConfusionMatrix({ matrix, labels }: { matrix: number[][]; labels: string[] }) {
  const maxVal = Math.max(1, ...matrix.flat());
  return (
    <div className="mt-2">
      <div className="grid grid-cols-4 gap-0.5 text-[8px]">
        <div />
        {labels.map((l) => (
          <div key={l} className="text-center text-[#64748b] font-mono-display py-0.5">
            {l}
          </div>
        ))}
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

function buildMasterRows(snap: MlEvalSnapshot | null): Array<{ metric: string; knn: string; nb: string; mlp: string; best: string }> {
  if (!snap) {
    return [
      { metric: 'Accuracy', knn: '—', nb: '—', mlp: '—', best: '—' },
      { metric: 'Macro F1', knn: '—', nb: '—', mlp: '—', best: '—' },
      { metric: 'Weighted F1', knn: '—', nb: '—', mlp: '—', best: '—' },
      { metric: 'Infer time (ms)', knn: '—', nb: '—', mlp: '—', best: '—' },
    ];
  }
  const { kNN, NaiveBayes, MLP } = snap.reports;
  const inferBest =
    kNN.trainTimeMs <= NaiveBayes.trainTimeMs && kNN.trainTimeMs <= MLP.trainTimeMs
      ? 'kNN'
      : NaiveBayes.trainTimeMs <= MLP.trainTimeMs
        ? 'NB'
        : 'MLP';
  return [
    {
      metric: 'Accuracy',
      knn: `${(kNN.accuracy * 100).toFixed(1)}%`,
      nb: `${(NaiveBayes.accuracy * 100).toFixed(1)}%`,
      mlp: `${(MLP.accuracy * 100).toFixed(1)}%`,
      best:
        kNN.accuracy >= NaiveBayes.accuracy && kNN.accuracy >= MLP.accuracy
          ? 'kNN'
          : NaiveBayes.accuracy >= MLP.accuracy
            ? 'NB'
            : 'MLP',
    },
    {
      metric: 'Macro F1',
      knn: kNN.macroF1.toFixed(3),
      nb: NaiveBayes.macroF1.toFixed(3),
      mlp: MLP.macroF1.toFixed(3),
      best:
        kNN.macroF1 >= NaiveBayes.macroF1 && kNN.macroF1 >= MLP.macroF1
          ? 'kNN'
          : NaiveBayes.macroF1 >= MLP.macroF1
            ? 'NB'
            : 'MLP',
    },
    {
      metric: 'Weighted F1',
      knn: kNN.weightedF1.toFixed(3),
      nb: NaiveBayes.weightedF1.toFixed(3),
      mlp: MLP.weightedF1.toFixed(3),
      best:
        kNN.weightedF1 >= NaiveBayes.weightedF1 && kNN.weightedF1 >= MLP.weightedF1
          ? 'kNN'
          : NaiveBayes.weightedF1 >= MLP.weightedF1
            ? 'NB'
            : 'MLP',
    },
    {
      metric: 'Infer time (ms)',
      knn: kNN.trainTimeMs.toFixed(2),
      nb: NaiveBayes.trainTimeMs.toFixed(2),
      mlp: MLP.trainTimeMs.toFixed(2),
      best: inferBest,
    },
  ];
}

function modelEvalCard(report: MlModelEvalReport, borderGlow: string) {
  const title =
    report.modelId === 'kNN'
      ? 'kNN Evaluation Report'
      : report.modelId === 'NaiveBayes'
        ? 'Naive Bayes Evaluation Report'
        : 'MLP Evaluation Report';
  return (
    <div key={report.modelId} className={`card-glass p-4 ${borderGlow}`}>
      <div className="text-[11px] font-bold text-[#f1f5f9] mb-2">{title}</div>
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
          {report.perClass.map((c) => (
            <tr key={c.classLabel} className="border-t border-[#1e293b]">
              <td className="py-0.5 text-[#cbd5e1]">{c.classLabel}</td>
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
          <span className="text-[#f1f5f9] font-bold">{(report.accuracy * 100).toFixed(1)}%</span>
          <MiniBar value={report.accuracy * 100} max={100} color="#22c55e" />
        </div>
        <div className="text-[#94a3b8]">
          Macro Avg F1: <span className="text-[#f1f5f9] font-mono-display">{report.macroF1.toFixed(3)}</span>
        </div>
        <div className="text-[#94a3b8]">
          Weighted Avg F1: <span className="text-[#f1f5f9] font-mono-display">{report.weightedF1.toFixed(3)}</span>
        </div>
        <div className="text-[#94a3b8]">
          Test inference: <span className="text-[#f1f5f9] font-mono-display">{report.trainTimeMs.toFixed(2)}ms</span>
        </div>
      </div>
      <div className="text-[9px] text-[#64748b] mb-1">Confusion Matrix (true → pred)</div>
      <ConfusionMatrix matrix={report.confusionMatrix} labels={['LR', 'MR', 'HR']} />
    </div>
  );
}

interface MlStudioProps {
  mlEvalSnapshot: MlEvalSnapshot | null;
  mlModel: MLModel;
  victims: Victim[];
  victimMlEstimates: Record<string, VictimMlEstimate>;
  onRunMlEvaluation: () => void;
  onSelectMlModel: (m: MLModel) => void;
}

export default function MlStudio({
  mlEvalSnapshot,
  mlModel,
  victims,
  victimMlEstimates,
  onRunMlEvaluation,
  onSelectMlModel,
}: MlStudioProps) {
  const [activeK, setActiveK] = useState(3);

  useEffect(() => {
    if (mlEvalSnapshot) setActiveK(mlEvalSnapshot.knnK);
  }, [mlEvalSnapshot]);

  const knnHighlightIdx = useMemo(() => K_BUTTONS.indexOf(activeK as (typeof K_BUTTONS)[number]), [activeK]);
  const knnAccForActiveK = useMemo(() => {
    if (!mlEvalSnapshot) return null;
    const idx = K_BUTTONS.indexOf(activeK as (typeof K_BUTTONS)[number]);
    if (idx < 0) return null;
    return mlEvalSnapshot.knnAccByK[idx] ?? null;
  }, [mlEvalSnapshot, activeK]);

  const masterRows = useMemo(() => buildMasterRows(mlEvalSnapshot), [mlEvalSnapshot]);

  const trainPct = mlEvalSnapshot
    ? Math.round((mlEvalSnapshot.trainSize / mlEvalSnapshot.totalSamples) * 100)
    : 80;
  const testPct = 100 - trainPct;

  const distTrain = mlEvalSnapshot?.classCountsTrain;
  const totalTrain = distTrain?.reduce((a, b) => a + b, 0) ?? 0;
  const barPct = (n: number) => (totalTrain > 0 ? Math.round((n / totalTrain) * 100) : 0);

  const integrationFlows = useMemo(() => {
    const flows: Array<{
      model: string;
      color: 'blue' | 'purple' | 'amber';
      title: string;
      input: string;
      output: string;
      action: string;
      target: string;
    }> = [];
    const ids = Object.keys(victimMlEstimates).sort();
    if (ids.length === 0) {
      return [
        {
          model: mlModel,
          color: mlModel === 'kNN' ? 'blue' : mlModel === 'NaiveBayes' ? 'purple' : 'amber',
          title: 'Awaiting CSP / ML run',
          input: 'victim + grid cell',
          output: '—',
          action: 'Run ML evaluation, then Start simulation or Run CSP to populate live estimates.',
          target: 'Victim Prioritization',
        },
      ];
    }
    for (const id of ids) {
      const est = victimMlEstimates[id];
      const v = victims.find((x) => x.id === id);
      const tag = ['LR', 'MR', 'HR'][est.predictedClass];
      flows.push({
        model: mlModel,
        color: mlModel === 'kNN' ? 'blue' : mlModel === 'NaiveBayes' ? 'purple' : 'amber',
        title: `Live risk — ${id}`,
        input: `cell (${v?.row ?? '?'},${v?.col ?? '?'})`,
        output: `${tag} p=(${est.probs.map((p) => p.toFixed(2)).join(',')}) · surv~${est.survivalEstimatePct}%`,
        action: `priorityScore fed into CSP MRV (${tag} raises evacuation urgency when HR).`,
        target: 'Victim Prioritization',
      });
    }
    return flows.slice(0, 5);
  }, [victimMlEstimates, victims, mlModel]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="shrink-0 bg-[#0f172a] border-b border-[#1e293b] px-4 py-3 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <Database className="w-4 h-4 text-[#3b82f6]" />
            <span className="text-[12px] font-bold text-[#f1f5f9]">
              DATASET: Synthetic Disaster Risk ({mlEvalSnapshot?.datasetVersion ?? 'not run'})
            </span>
          </div>
          <span className="text-[10px] text-[#94a3b8]">
            {mlEvalSnapshot
              ? `${mlEvalSnapshot.totalSamples} samples | ${FEATURE_DIM} features | 3 classes`
              : `${500} samples (default) | ${8} features | 3 classes — run evaluation to materialize`}
          </span>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-[9px] text-[#64748b]">Active agent model (Left panel + CSP tie-in):</span>
            {(['kNN', 'NaiveBayes', 'MLP'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onSelectMlModel(m)}
                className={`text-[9px] px-2 py-0.5 rounded-full border cursor-pointer ${
                  mlModel === m
                    ? 'bg-[#3b82f6]/30 border-[#3b82f6] text-[#f1f5f9]'
                    : 'border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]'
                }`}
              >
                {m === 'NaiveBayes' ? 'NB' : m}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onRunMlEvaluation()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#22c55e] text-[#020817] text-[10px] font-semibold hover:bg-[#16a34a] transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" /> Run Training &amp; Evaluation
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { icon: '🔢', label: 'Total', value: mlEvalSnapshot ? String(mlEvalSnapshot.totalSamples) : '500' },
            {
              icon: '🎓',
              label: 'Train',
              value: mlEvalSnapshot ? `${mlEvalSnapshot.trainSize} (${trainPct}%)` : '—',
            },
            {
              icon: '🧪',
              label: 'Test',
              value: mlEvalSnapshot ? `${mlEvalSnapshot.testSize} (${testPct}%)` : '—',
            },
            { icon: '🏷', label: 'Classes', value: '3' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1 bg-[#020817] border border-[#1e293b] rounded-lg px-2.5 py-1">
              <span className="text-[9px]">{s.icon}</span>
              <span className="text-[9px] text-[#64748b]">{s.label}:</span>
              <span className="text-[10px] text-[#f1f5f9] font-semibold">{s.value}</span>
            </div>
          ))}
        </div>
        <div className="w-[220px] min-w-[200px]">
          <div className="text-[10px] text-[#94a3b8] mb-1.5">Train class distribution</div>
          {distTrain ? (
            [
              { label: 'Low Risk', count: distTrain[0], color: '#22c55e' },
              { label: 'Medium Risk', count: distTrain[1], color: '#f59e0b' },
              { label: 'High Risk', count: distTrain[2], color: '#ef4444' },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-[9px] text-[#94a3b8] w-[70px]">{c.label}</span>
                <div className="flex-1 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${barPct(c.count)}%`, backgroundColor: c.color }} />
                </div>
                <span className="text-[9px] text-[#64748b] w-[28px] text-right">{c.count}</span>
              </div>
            ))
          ) : (
            <div className="text-[9px] text-[#64748b]">Run evaluation to populate.</div>
          )}
        </div>
      </div>

      <div className="shrink-0 px-4 py-3">
        <div className="card-glass p-4 border-glow-left-purple">
          <SectionLabel color="text-purple-400">Feature Set &amp; Importance</SectionLabel>
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
              <div className="text-[9px] text-[#64748b] mb-2">Static schema (synthetic dataset uses aligned 8-D vectors)</div>
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

      <div className="shrink-0 px-4 pb-3">
        <SectionLabel>Model Training</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          <div className="card-glass p-4 glow-blue">
            <div className="flex items-center gap-1.5 mb-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span className="text-[11px] font-bold text-[#f1f5f9]">k-Nearest Neighbors (kNN)</span>
            </div>
            <div className="mb-2">
              <div className="text-[9px] text-[#64748b] mb-1">k value:</div>
              <div className="flex gap-1 flex-wrap">
                {K_BUTTONS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setActiveK(k)}
                    className={`px-2 py-0.5 rounded text-[9px] font-medium transition-all cursor-pointer ${
                      activeK === k ? 'bg-[#3b82f6] text-[#f1f5f9] glow-blue' : 'border border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]'
                    }`}
                  >
                    {k}
                    {mlEvalSnapshot && mlEvalSnapshot.knnK === k ? ' ★' : ''}
                  </button>
                ))}
              </div>
              <div className="text-[9px] text-[#94a3b8] mt-1">Distance: Euclidean | Weighting: Uniform</div>
            </div>
            <div className="text-[10px] space-y-0.5 mb-2">
              <div className={mlEvalSnapshot ? 'text-green-400' : 'text-[#64748b]'}>
                {mlEvalSnapshot ? '✅ Evaluation snapshot loaded' : '○ Run evaluation to train'}
              </div>
              <div className="text-[#94a3b8]">
                Selected k test acc:{' '}
                <span className="text-[#f1f5f9]">
                  {knnAccForActiveK != null ? `${(knnAccForActiveK * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="text-[#94a3b8]">
                Deployed k (CSP):{' '}
                <span className="text-[#f1f5f9] font-mono-display">{mlEvalSnapshot?.knnK ?? '—'}</span>
              </div>
            </div>
            <div className="bg-[#020817] rounded-lg p-2 border border-[#1e293b]">
              <div className="text-[9px] text-[#64748b] mb-1">Accuracy vs K (hold-out test)</div>
              {mlEvalSnapshot && mlEvalSnapshot.knnAccByK.length > 0 ? (
                <SimpleLineChart
                  data={mlEvalSnapshot.knnAccByK}
                  width={260}
                  height={120}
                  xLabels={K_BUTTONS.map(String)}
                  highlightIdx={knnHighlightIdx >= 0 ? knnHighlightIdx : undefined}
                  color="#3b82f6"
                />
              ) : (
                <div className="text-[9px] text-[#64748b] h-[120px] flex items-center justify-center">No data</div>
              )}
            </div>
            <div className="mt-1.5 text-[10px] text-green-400 font-medium">
              {mlEvalSnapshot
                ? `Best k=${mlEvalSnapshot.knnK} (test acc ${(mlEvalSnapshot.reports.kNN.accuracy * 100).toFixed(1)}%)`
                : '—'}
            </div>
          </div>

          <div className="card-glass p-4 glow-purple">
            <div className="flex items-center gap-1.5 mb-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-[11px] font-bold text-[#f1f5f9]">Naive Bayes (Gaussian NB)</span>
            </div>
            <div className="text-[10px] text-[#94a3b8] space-y-0.5 mb-2">
              <div>
                Type: <span className="text-[#f1f5f9]">Gaussian NB</span>
              </div>
              <div>
                Laplace / var floor: <span className="text-[#f1f5f9] font-mono-display">α≈1e-6</span>
              </div>
            </div>
            <div className="text-[10px] space-y-0.5 mb-2">
              <div className={mlEvalSnapshot ? 'text-green-400' : 'text-[#64748b]'}>
                {mlEvalSnapshot ? '✅ Fitted on train split' : '○ Not fitted'}
              </div>
              <div className="text-[#94a3b8]">
                Test accuracy:{' '}
                <span className="text-[#f1f5f9]">
                  {mlEvalSnapshot ? `${(mlEvalSnapshot.reports.NaiveBayes.accuracy * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
            <div className="bg-[#020817] rounded-lg p-2 border border-[#1e293b]">
              <div className="text-[9px] text-[#64748b] mb-1">Class prior probabilities (train)</div>
              <div className="space-y-2 mt-3">
                {mlEvalSnapshot ? (
                  [
                    { label: 'Low Risk', value: mlEvalSnapshot.nbClassPriors[0], color: '#22c55e' },
                    { label: 'Med Risk', value: mlEvalSnapshot.nbClassPriors[1], color: '#f59e0b' },
                    { label: 'High Risk', value: mlEvalSnapshot.nbClassPriors[2], color: '#ef4444' },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center gap-2">
                      <span className="text-[9px] text-[#94a3b8] w-[60px]">{c.label}</span>
                      <div className="flex-1 h-5 bg-[#1e293b] rounded overflow-hidden relative">
                        <div className="h-full rounded" style={{ width: `${c.value * 100}%`, backgroundColor: c.color }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-[#f1f5f9] font-mono-display">
                          {c.value.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[9px] text-[#64748b] py-4 text-center">Run evaluation</div>
                )}
              </div>
            </div>
            <div className="mt-1.5 text-[10px] text-green-400 font-medium">Fast Gaussian likelihood inference</div>
          </div>

          <div className="card-glass p-4 glow-amber">
            <div className="flex items-center gap-1.5 mb-2">
              <Network className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-bold text-[#f1f5f9]">MLP (1 hidden layer)</span>
            </div>
            <div className="text-[10px] text-[#94a3b8] space-y-0.5 mb-2">
              <div>
                Architecture: <span className="text-[#f1f5f9] font-mono-display">8 → 16 → 3</span>
              </div>
              <div>
                Activation: <span className="text-[#f1f5f9]">ReLU</span> | SGD LR:{' '}
                <span className="text-[#f1f5f9] font-mono-display">0.08</span>
              </div>
              <div>
                Epochs: <span className="text-[#f1f5f9]">80</span> (batch full-gradient)
              </div>
            </div>
            <div className="text-[10px] space-y-0.5 mb-2">
              <div className={mlEvalSnapshot ? 'text-green-400' : 'text-[#64748b]'}>
                {mlEvalSnapshot ? '✅ Weights fitted on train' : '○ Not trained'}
              </div>
              <div className="text-[#94a3b8]">
                Test accuracy:{' '}
                <span className="text-[#f1f5f9]">
                  {mlEvalSnapshot ? `${(mlEvalSnapshot.reports.MLP.accuracy * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
            <div className="bg-[#020817] rounded-lg p-2 border border-[#1e293b]">
              <div className="text-[9px] text-[#64748b] mb-1">Training loss (cross-entropy)</div>
              {mlEvalSnapshot && mlEvalSnapshot.mlpLossCurve.length > 1 ? (
                <SimpleLineChart
                  data={mlEvalSnapshot.mlpLossCurve}
                  width={260}
                  height={100}
                  highlightIdx={mlEvalSnapshot.mlpLossCurve.length - 1}
                  color="#f59e0b"
                  yLabel="Loss"
                />
              ) : (
                <div className="text-[9px] text-[#64748b] h-[100px] flex items-center justify-center">No curve</div>
              )}
            </div>
            <div className="bg-[#020817] rounded-lg p-2 border border-[#1e293b] mt-2">
              <div className="text-[9px] text-[#64748b] mb-1">MLP layout</div>
              <div className="flex items-center justify-center gap-1 py-1">
                {[
                  { nodes: 8, color: '#3b82f6', label: '8' },
                  { nodes: 5, color: '#f59e0b', label: '16' },
                  { nodes: 3, color: '#22c55e', label: '3' },
                ].map((layer, li) => (
                  <div key={li} className="flex items-center gap-1">
                    <div className="flex flex-col items-center gap-0.5">
                      {Array.from({ length: layer.nodes }, (_, ni) => (
                        <div
                          key={ni}
                          className="w-2.5 h-2.5 rounded-full border"
                          style={{ borderColor: layer.color, backgroundColor: `${layer.color}30` }}
                        />
                      ))}
                      <span className="text-[7px] text-[#64748b] font-mono-display">{layer.label}</span>
                    </div>
                    {li < 2 && <span className="text-[#334155] text-[8px]">→</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-4 pb-4">
        <SectionLabel>Model Evaluation &amp; Comparison</SectionLabel>

        <div className="grid grid-cols-3 gap-3 mb-3">
          {mlEvalSnapshot ? (
            <>
              {modelEvalCard(mlEvalSnapshot.reports.kNN, 'border-glow-left-blue')}
              {modelEvalCard(mlEvalSnapshot.reports.NaiveBayes, 'border-glow-left-purple')}
              {modelEvalCard(mlEvalSnapshot.reports.MLP, 'border-glow-left-amber')}
            </>
          ) : (
            <div className="col-span-3 text-[10px] text-[#64748b] card-glass p-6 text-center border border-[#1e293b]">
              Run <span className="text-[#f1f5f9]">Training &amp; Evaluation</span> to populate kNN, Naive Bayes, and MLP metrics and
              confusion matrices.
            </div>
          )}
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
                {masterRows.map((row) => (
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
              {mlEvalSnapshot ? (
                <>
                  kNN (k={mlEvalSnapshot.knnK}) is used for smooth local decision boundaries; NB is fastest; MLP captures
                  non-linear interactions. The <span className="text-[#f1f5f9]">active model</span> in the left panel drives live CSP
                  priorityScore when a snapshot exists.
                </>
              ) : (
                <>After evaluation, pick kNN, NB, or MLP — the agent uses that model during CSP.</>
              )}
            </div>
          </div>

          <div className="w-[380px] shrink-0 card-glass p-4 border-glow-left-purple">
            <SectionLabel color="text-purple-400">ML → Agent Integration</SectionLabel>
            <div className="space-y-2">
              {integrationFlows.map((flow, idx) => {
                const badgeColor =
                  flow.color === 'blue'
                    ? 'bg-blue-500/20 text-blue-400'
                    : flow.color === 'purple'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-amber-500/20 text-amber-400';
                const targetColor =
                  flow.target === 'Route Planning'
                    ? 'bg-green-500/20 text-green-400'
                    : flow.target === 'Dynamic Replanning'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-red-500/20 text-red-400';
                return (
                  <div key={idx} className="bg-[#020817] rounded-lg p-2.5 border border-[#1e293b] border-glow-left-blue">
                    <div className="text-[10px] font-semibold text-[#f1f5f9] mb-1">
                      {flow.model} Output → {flow.title}
                    </div>
                    <div className="text-[9px] text-[#94a3b8] space-y-0.5 mb-1.5">
                      <div>
                        Input: <span className="text-[#f1f5f9]">{flow.input}</span> → Output:{' '}
                        <span className="text-[#f1f5f9] font-mono-display">{flow.output}</span>
                      </div>
                      <div>
                        Agent Action: <span className="text-[#cbd5e1]">{flow.action}</span>
                      </div>
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
