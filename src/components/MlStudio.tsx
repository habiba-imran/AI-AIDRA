import { useEffect, useMemo, useState } from 'react';
import { Database, Cpu, Brain, Network, ArrowRight, Play, Download } from 'lucide-react';
import { features } from '../data/placeholder';
import type { MLModel, MlEvalSnapshot, MlModelEvalReport, Victim, VictimMlEstimate } from '../types';
import { generateSyntheticDataset } from '../engine/mlRiskPipeline';

const FEATURE_DIM = 8;
const K_BUTTONS = [1, 2, 3, 5, 7, 10] as const;

function SectionLabel({ children, color = 'text-[#3b82f6]' }: { children: React.ReactNode; color?: string }) {
  return <div className={`text-sm font-bold tracking-widest uppercase mb-4 mt-2 ${color}`}>{children}</div>;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="w-full h-3 bg-[#1e293b] rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
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

function ConfusionMatrixHeatmap({ matrix, labels }: { matrix: number[][]; labels: string[] }) {
  const maxVal = Math.max(1, ...matrix.flat());
  return (
    <div className="mt-4">
      <div className="text-xs font-bold text-[#94a3b8] mb-2 uppercase tracking-wider">Confusion Matrix</div>
      <div className="bg-[#020817] rounded-lg p-3 border border-[#1e293b]">
        <div className="text-[8px] text-[#64748b] text-center font-bold uppercase tracking-widest mb-1">Predicted →</div>
        <div className="flex">
          <div className="flex flex-col justify-center mr-1.5 gap-0">
            <div className="text-[7px] text-[#64748b] font-bold uppercase tracking-widest -rotate-90 whitespace-nowrap origin-center" style={{ height: 0, position: 'relative', top: '50%', left: '-8px' }}>
              Actual
            </div>
          </div>
          <div className="flex-1">
            {/* Column headers */}
            <div className="flex ml-[52px] mb-1">
              {labels.map((l) => (
                <div key={`h-${l}`} className="flex-1 text-center text-[8px] text-[#94a3b8] font-bold truncate px-0.5">{l}</div>
              ))}
            </div>
            {/* Rows */}
            {matrix.map((row, ri) => (
              <div key={ri} className="flex items-center gap-0 mb-0.5">
                <div className="w-[52px] shrink-0 text-right text-[8px] text-[#94a3b8] font-bold pr-2 truncate">{labels[ri]}</div>
                {row.map((val, ci) => {
                  const intensity = val / maxVal;
                  const isDiagonal = ri === ci;
                  const bgColor = isDiagonal
                    ? `rgba(34, 197, 94, ${0.15 + intensity * 0.65})`
                    : `rgba(239, 68, 68, ${0.05 + intensity * 0.45})`;
                  const textColor = isDiagonal ? '#4ade80' : intensity > 0.3 ? '#fca5a5' : '#94a3b8';
                  return (
                    <div
                      key={ci}
                      className="flex-1 aspect-square flex items-center justify-center rounded-md mx-0.5 border border-[#1e293b]/50 transition-all"
                      style={{ backgroundColor: bgColor, minHeight: '28px' }}
                    >
                      <span className="text-xs font-mono-display font-bold" style={{ color: textColor }}>
                        {val}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-[#1e293b]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(34,197,94,0.5)' }} />
            <span className="text-[8px] text-[#94a3b8]">Correct (diagonal)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.3)' }} />
            <span className="text-[8px] text-[#94a3b8]">Misclassified</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const CM_LABELS = ['Low Risk', 'Med Risk', 'High Risk'];

function modelEvalCard(report: MlModelEvalReport, borderGlow: string) {
  const title =
    report.modelId === 'kNN'
      ? 'kNN Evaluation Report'
      : report.modelId === 'NaiveBayes'
        ? 'Naive Bayes Evaluation Report'
        : 'MLP Evaluation Report';
  return (
    <div key={report.modelId} className={`card-glass p-5 ${borderGlow}`}>
      <div className="text-base font-bold text-[#f1f5f9] mb-4">{title}</div>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="text-[#64748b] border-b border-[#1e293b]">
            <th className="text-left py-2 font-medium">Class</th>
            <th className="text-center py-2 font-medium">Precision</th>
            <th className="text-center py-2 font-medium">Recall</th>
            <th className="text-center py-2 font-medium">F1 Score</th>
            <th className="text-center py-2 font-medium">Support</th>
          </tr>
        </thead>
        <tbody>
          {report.perClass.map((c) => (
            <tr key={c.classLabel} className="border-b border-[#1e293b]/50">
              <td className="py-2 text-[#cbd5e1] font-semibold">{c.classLabel}</td>
              <td className="py-2 text-center font-mono-display text-[#f1f5f9]">{c.precision.toFixed(2)}</td>
              <td className="py-2 text-center font-mono-display text-[#f1f5f9]">{c.recall.toFixed(2)}</td>
              <td className="py-2 text-center font-mono-display text-[#f1f5f9]">{c.f1.toFixed(2)}</td>
              <td className="py-2 text-center font-mono-display text-[#94a3b8]">{c.support}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Confusion Matrix Heatmap */}
      {report.confusionMatrix && report.confusionMatrix.length === 3 && (
        <ConfusionMatrixHeatmap matrix={report.confusionMatrix} labels={CM_LABELS} />
      )}
      <div className="text-sm space-y-2 bg-[#020817]/50 rounded-lg p-3 border border-[#1e293b] mt-4">
        <div className="flex items-center gap-3">
          <span className="text-[#94a3b8] w-32">Accuracy:</span>
          <span className="text-[#f1f5f9] font-bold">{(report.accuracy * 100).toFixed(1)}%</span>
          <div className="flex-1"><MiniBar value={report.accuracy * 100} max={100} color="#22c55e" /></div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#94a3b8] w-32">Macro Avg F1:</span>
          <span className="text-[#f1f5f9] font-mono-display font-bold">{report.macroF1.toFixed(3)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#94a3b8] w-32">Weighted Avg F1:</span>
          <span className="text-[#f1f5f9] font-mono-display font-bold">{report.weightedF1.toFixed(3)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#94a3b8] w-32">Test inference:</span>
          <span className="text-[#f1f5f9] font-mono-display font-bold">{report.trainTimeMs.toFixed(2)}ms</span>
        </div>
      </div>
    </div>
  );
}

function formatRunTime(ms: number | undefined): string {
  if (!ms) return '—';
  const date = new Date(ms);
  const time = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
  return `${time}.${String(date.getMilliseconds()).padStart(3, '0')}`;
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

  const knnAccForActiveK = useMemo(() => {
    if (!mlEvalSnapshot) return null;
    const idx = K_BUTTONS.indexOf(activeK as (typeof K_BUTTONS)[number]);
    if (idx < 0) return null;
    return mlEvalSnapshot.knnAccByK[idx] ?? null;
  }, [mlEvalSnapshot, activeK]);

  const masterRows = useMemo(() => buildMasterRows(mlEvalSnapshot), [mlEvalSnapshot]);

  const handleDownloadCSV = () => {
    const { x, y } = generateSyntheticDataset(9001);
    let csvContent = "row,col,distBase,risk,fireHint,collapseHint,sev,surv,Label\n";
    for (let i = 0; i < x.length; i++) {
       csvContent += x[i].map((v) => v.toFixed(4)).join(",") + "," + y[i] + "\n";
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'synthetic_disaster_risk.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-[#020817]">
      {/* Row 1: Dataset & Controls */}
      <div className="shrink-0 bg-[#0f172a] border-b border-[#1e293b] px-6 py-3 flex items-center justify-between gap-6 shadow-md z-10">
        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Database className="w-4 h-4 text-[#3b82f6]" />
              <span className="text-sm font-bold text-[#f1f5f9] whitespace-nowrap">
                DATASET: Synthetic Disaster Risk
              </span>
            </div>
            <span className="text-xs text-[#94a3b8] whitespace-nowrap">
              {mlEvalSnapshot
                ? `${mlEvalSnapshot.totalSamples} samples | ${FEATURE_DIM} features | 3 classes`
                : `${500} samples (default) | ${8} features | 3 classes`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#1e293b]/50 p-1 rounded-xl border border-[#334155]/50">
          <span className="text-xs text-[#cbd5e1] font-semibold px-2 border-r border-[#334155] mr-1">Active Model</span>
          <div className="flex gap-1">
            {(['kNN', 'NaiveBayes', 'MLP'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onSelectMlModel(m)}
                className={`text-xs px-3 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                  mlModel === m
                    ? 'bg-[#3b82f6] border-[#3b82f6] text-[#f1f5f9] shadow-lg'
                    : 'border-transparent text-[#94a3b8] hover:bg-[#334155]'
                }`}
              >
                {m === 'NaiveBayes' ? 'NB' : m}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-[#334155] mx-1"></div>
          <button
            type="button"
            onClick={() => onRunMlEvaluation()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#22c55e] text-[#020817] text-xs font-bold hover:bg-[#16a34a] transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> Re-run Evaluation
          </button>
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#3b82f6] text-[#020817] text-xs font-bold hover:bg-[#2563eb] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Row 2: Stats & Distribution */}
      <div className="shrink-0 bg-[#020817] border-b border-[#1e293b] px-6 py-2 flex items-center justify-between gap-6 shadow-sm z-10">
        <div className="flex items-center gap-8">
          {[
            { icon: '🔢', label: 'Total Samples', value: mlEvalSnapshot ? String(mlEvalSnapshot.totalSamples) : '500' },
            { icon: '🎓', label: 'Training Set', value: mlEvalSnapshot ? `${mlEvalSnapshot.trainSize}` : '399' },
            { icon: '🧪', label: 'Testing Set', value: mlEvalSnapshot ? `${mlEvalSnapshot.testSize}` : '101' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-lg">{s.icon}</span>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-widest">{s.label}</span>
                <span className="text-sm text-[#f1f5f9] font-mono-display font-bold">{s.value}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-8 pr-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-widest">Training Class Distribution</span>
            <span className="text-[9px] text-[#475569]">Samples per target class</span>
          </div>
          <div className="flex items-center gap-6">
            {[
              { label: 'Low Risk', count: distTrain ? distTrain[0] : 174, color: '#22c55e' },
              { label: 'Med Risk', count: distTrain ? distTrain[1] : 183, color: '#f59e0b' },
              { label: 'High Risk', count: distTrain ? distTrain[2] : 42, color: '#ef4444' },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-3 w-32">
                <div className="flex flex-col flex-1 gap-1">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-[#94a3b8]">{c.label}</span>
                    <span className="text-[10px] font-mono-display text-[#f1f5f9] font-bold">{c.count}</span>
                  </div>
                  <div className="h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${barPct(c.count)}%`, backgroundColor: c.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 px-6 py-5">
        <div className="card-glass p-6 border-glow-left-purple bg-[#0f172a]/50">
          <SectionLabel color="text-purple-400">Feature Set &amp; Importance</SectionLabel>
          <div className="flex gap-8">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#94a3b8] border-b border-[#1e293b]">
                    <th className="text-left py-2 px-2 font-medium w-8">#</th>
                    <th className="text-left py-2 px-2 font-medium">Feature Name</th>
                    <th className="text-left py-2 px-2 font-medium">Type</th>
                    <th className="text-left py-2 px-2 font-medium">Range</th>
                    <th className="text-left py-2 px-2 font-medium">Importance</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((f) => (
                    <tr key={f.id} className={`border-b border-[#1e293b]/50 ${f.id <= 3 ? 'bg-[#3b82f6]/5' : ''}`}>
                      <td className="py-2 px-2 text-[#64748b] font-mono-display">{f.id}</td>
                      <td className="py-2 px-2 font-mono-display font-bold text-[#f1f5f9]">{f.name}</td>
                      <td className="py-2 px-2 text-[#cbd5e1]">{f.type}</td>
                      <td className="py-2 px-2 text-[#94a3b8] font-mono-display">{f.range}</td>
                      <td className="py-2 px-2 w-48">
                        <div className="flex items-center gap-3">
                          <div className="flex-1"><MiniBar value={f.importance} max={1} color="#3b82f6" /></div>
                          <span className="text-sm text-[#94a3b8] w-10 font-mono-display">{f.importance.toFixed(2)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="w-[350px] shrink-0 bg-[#020817] p-4 rounded-xl border border-[#1e293b]">
              <div className="text-base text-[#f1f5f9] font-bold mb-2">Feature Importance Scores</div>
              <div className="text-sm text-[#94a3b8] mb-4">Static schema (synthetic dataset uses aligned 8-D vectors)</div>
              <div className="space-y-3">
                {features.map((f) => (
                  <div key={f.id} className="flex items-center gap-3">
                    <span className="text-sm text-[#cbd5e1] w-28 truncate font-mono-display text-right font-semibold">{f.name}</span>
                    <div className="flex-1 h-3 bg-[#1e293b] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#3b82f6] to-[#6366f1]" style={{ width: `${f.importance * 100}%` }} />
                    </div>
                    <span className="text-sm text-[#94a3b8] w-10 font-mono-display">{f.importance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-6 pb-5">
        <SectionLabel>Model Training Configuration</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* kNN Card */}
          <div className="card-glass p-6 glow-blue border border-[#1e293b]">
            <div className="flex items-center gap-3 mb-4">
              <Cpu className="w-6 h-6 text-blue-400" />
              <span className="text-lg font-bold text-[#f1f5f9]">k-Nearest Neighbors (kNN)</span>
            </div>
            <div className="mb-4 bg-[#020817]/50 p-3 rounded-lg border border-[#1e293b]">
              <div className="text-sm text-[#cbd5e1] font-semibold mb-2">Neighborhood size (k):</div>
              <div className="flex gap-2 flex-wrap mb-2">
                {K_BUTTONS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setActiveK(k)}
                    className={`px-3 py-1 rounded-md text-sm font-bold transition-all cursor-pointer ${
                      activeK === k ? 'bg-[#3b82f6] text-[#f1f5f9] shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'border border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]'
                    }`}
                  >
                    {k}
                    {mlEvalSnapshot && mlEvalSnapshot.knnK === k ? ' ★' : ''}
                  </button>
                ))}
              </div>
              <div className="text-sm text-[#94a3b8]">Distance: <span className="text-white">Euclidean</span> | Weighting: <span className="text-white">Uniform</span></div>
            </div>
            <div className="text-sm space-y-2 mb-4">
              <div className={`font-semibold flex items-center gap-2 ${mlEvalSnapshot ? 'text-green-400' : 'text-[#64748b]'}`}>
                {mlEvalSnapshot ? '✅ Evaluation snapshot loaded' : '○ Run evaluation to train'}
              </div>
              <div className="flex justify-between text-[#94a3b8]">
                <span>Selected k test acc:</span>
                <span className="text-[#f1f5f9] font-bold">
                  {knnAccForActiveK != null ? `${(knnAccForActiveK * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-[#94a3b8]">
                <span>Deployed k (CSP):</span>
                <span className="text-[#f1f5f9] font-mono-display font-bold">{mlEvalSnapshot?.knnK ?? '—'}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#1e293b] text-sm text-green-400 font-bold text-center">
              {mlEvalSnapshot
                ? `Best k=${mlEvalSnapshot.knnK} (test acc ${(mlEvalSnapshot.reports.kNN.accuracy * 100).toFixed(1)}%)`
                : '—'}
            </div>
          </div>

          {/* Naive Bayes Card */}
          <div className="card-glass p-6 glow-purple border border-[#1e293b]">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-6 h-6 text-purple-400" />
              <span className="text-lg font-bold text-[#f1f5f9]">Naive Bayes</span>
            </div>
            <div className="bg-[#020817]/50 p-3 rounded-lg border border-[#1e293b] text-sm text-[#94a3b8] space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Distribution Type:</span> <span className="text-[#f1f5f9] font-bold">Gaussian NB</span>
              </div>
              <div className="flex justify-between">
                <span>Laplace / var floor:</span> <span className="text-[#f1f5f9] font-mono-display font-bold">α≈1e-6</span>
              </div>
            </div>
            <div className="text-sm space-y-2 mb-4">
              <div className={`font-semibold flex items-center gap-2 ${mlEvalSnapshot ? 'text-green-400' : 'text-[#64748b]'}`}>
                {mlEvalSnapshot ? '✅ Fitted on train split' : '○ Not fitted'}
              </div>
              <div className="flex justify-between text-[#94a3b8]">
                <span>Test accuracy:</span>
                <span className="text-[#f1f5f9] font-bold">
                  {mlEvalSnapshot ? `${(mlEvalSnapshot.reports.NaiveBayes.accuracy * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
            <div className="bg-[#020817] rounded-xl p-3 border border-[#1e293b]">
              <div className="text-sm font-bold text-[#cbd5e1] mb-2">Class Prior Probabilities</div>
              <div className="space-y-2">
                {mlEvalSnapshot ? (
                  [
                    { label: 'Low Risk', value: mlEvalSnapshot.nbClassPriors[0], color: '#22c55e' },
                    { label: 'Med Risk', value: mlEvalSnapshot.nbClassPriors[1], color: '#f59e0b' },
                    { label: 'High Risk', value: mlEvalSnapshot.nbClassPriors[2], color: '#ef4444' },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center gap-3">
                      <span className="text-sm text-[#94a3b8] w-20 font-semibold">{c.label}</span>
                      <div className="flex-1 h-6 bg-[#1e293b] rounded-lg overflow-hidden relative border border-[#334155]/30">
                        <div className="h-full rounded-lg" style={{ width: `${c.value * 100}%`, backgroundColor: c.color }} />
                        <span className="absolute inset-0 flex items-center justify-center text-sm text-[#f1f5f9] font-mono-display font-bold drop-shadow-md">
                          {c.value.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-[#64748b] py-4 text-center">Run evaluation</div>
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#1e293b] text-sm text-green-400 font-bold text-center">
              Provides the fastest inference time
            </div>
          </div>

          {/* MLP Card */}
          <div className="card-glass p-6 glow-amber border border-[#1e293b]">
            <div className="flex items-center gap-3 mb-4">
              <Network className="w-6 h-6 text-amber-400" />
              <span className="text-lg font-bold text-[#f1f5f9]">Multilayer Perceptron</span>
            </div>
            <div className="bg-[#020817]/50 p-3 rounded-lg border border-[#1e293b] text-sm text-[#94a3b8] space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Architecture:</span> <span className="text-[#f1f5f9] font-mono-display font-bold">8 → 16 → 3</span>
              </div>
              <div className="flex justify-between">
                <span>Activation:</span> <span className="text-[#f1f5f9] font-bold">ReLU</span>
              </div>
              <div className="flex justify-between">
                <span>SGD Learning Rate:</span> <span className="text-[#f1f5f9] font-mono-display font-bold">0.035</span>
              </div>
              <div className="flex justify-between">
                <span>Epochs:</span> <span className="text-[#f1f5f9] font-bold">100</span>
              </div>
            </div>
            <div className="text-sm space-y-2 mb-4">
              <div className={`font-semibold flex items-center gap-2 ${mlEvalSnapshot ? 'text-green-400' : 'text-[#64748b]'}`}>
                {mlEvalSnapshot ? '✅ Weights fitted on train' : '○ Not trained'}
              </div>
              <div className="flex justify-between text-[#94a3b8]">
                <span>Test accuracy:</span>
                <span className="text-[#f1f5f9] font-bold">
                  {mlEvalSnapshot ? `${(mlEvalSnapshot.reports.MLP.accuracy * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
            
            <div className="bg-[#020817] rounded-xl p-4 border border-[#1e293b] flex flex-col items-center justify-center">
              <div className="text-sm font-bold text-[#cbd5e1] mb-4">Neural Network Layout</div>
              <div className="flex items-center justify-center gap-4">
                {[
                  { nodes: 8, color: '#3b82f6', label: '8 Inputs' },
                  { nodes: 5, color: '#f59e0b', label: '16 Hidden' },
                  { nodes: 3, color: '#22c55e', label: '3 Outputs' },
                ].map((layer, li) => (
                  <div key={li} className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-1.5">
                      {Array.from({ length: layer.nodes }, (_, ni) => (
                        <div
                          key={ni}
                          className="w-4 h-4 rounded-full border-2"
                          style={{ borderColor: layer.color, backgroundColor: `${layer.color}30` }}
                        />
                      ))}
                      <span className="text-xs text-[#94a3b8] font-semibold mt-1">{layer.label}</span>
                    </div>
                    {li < 2 && <ArrowRight className="w-5 h-5 text-[#334155]" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#1e293b] text-sm text-green-400 font-bold text-center">
              Captures complex non-linear risk factors
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-6 pb-6">
        <SectionLabel>Model Evaluation &amp; Comparison Report</SectionLabel>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {mlEvalSnapshot ? (
            <>
              {modelEvalCard(mlEvalSnapshot.reports.kNN, 'border-glow-left-blue')}
              {modelEvalCard(mlEvalSnapshot.reports.NaiveBayes, 'border-glow-left-purple')}
              {modelEvalCard(mlEvalSnapshot.reports.MLP, 'border-glow-left-amber')}
            </>
          ) : (
            <div className="col-span-3 text-base text-[#94a3b8] card-glass p-12 text-center border border-[#1e293b] border-dashed">
              Run <span className="text-[#f1f5f9] font-bold bg-[#1e293b] px-2 py-1 rounded">Training &amp; Evaluation</span> to populate comprehensive performance reports for kNN, Naive Bayes, and MLP.
            </div>
          )}
        </div>

        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 card-glass p-6 overflow-x-auto shadow-lg">
            <SectionLabel>Side-by-Side Model Comparison</SectionLabel>
            <table className="w-full text-base">
              <thead>
                <tr className="text-[#94a3b8] uppercase tracking-wider border-b border-[#1e293b]">
                  <th className="text-left py-3 px-2 font-semibold">Metric</th>
                  <th className="text-center py-3 px-2 font-semibold">kNN</th>
                  <th className="text-center py-3 px-2 font-semibold">Naive Bayes</th>
                  <th className="text-center py-3 px-2 font-semibold">MLP</th>
                  <th className="text-center py-3 px-2 font-bold text-green-400">Best Performer</th>
                </tr>
              </thead>
              <tbody>
                {masterRows.map((row) => (
                  <tr key={row.metric} className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30">
                    <td className="py-3 px-2 font-bold text-[#f1f5f9]">{row.metric}</td>
                    <td className="py-3 px-2 text-center text-[#cbd5e1] font-mono-display font-semibold">{row.knn}</td>
                    <td className="py-3 px-2 text-center text-[#cbd5e1] font-mono-display font-semibold">{row.nb}</td>
                    <td className="py-3 px-2 text-center text-[#cbd5e1] font-mono-display font-semibold">{row.mlp}</td>
                    <td className="py-3 px-2 text-center text-green-400 font-bold bg-green-500/5">{row.best}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-sm text-[#cbd5e1] leading-relaxed bg-[#020817] rounded-xl p-4 border border-[#334155] shadow-inner">
              {mlEvalSnapshot ? (
                <>
                  <strong className="text-blue-400">kNN</strong> (k={mlEvalSnapshot.knnK}) is used for smooth local decision boundaries. <strong className="text-purple-400">Naive Bayes</strong> is extremely fast and robust for independent features. <strong className="text-amber-400">MLP</strong> captures non-linear feature interactions for highest theoretical accuracy. The <span className="text-[#f1f5f9] font-bold underline decoration-[#3b82f6]">Active Model</span> selected in the top panel determines which model will be used by the live simulation to predict risk and adjust CSP priorities.
                </>
              ) : (
                <>After evaluation completes, select kNN, Naive Bayes, or MLP to be the active inference model used by the live simulation engine to evaluate victim risk profiles on the fly.</>
              )}
            </div>
          </div>

          <div className="w-full xl:w-[450px] shrink-0 card-glass p-6 border-glow-left-blue shadow-lg">
            <SectionLabel color="text-blue-400">Live Agent Integration Pipeline</SectionLabel>
            <div className="space-y-4">
              {integrationFlows.map((flow, idx) => {
                const badgeColor =
                  flow.color === 'blue'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : flow.color === 'purple'
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                return (
                  <div key={idx} className="bg-[#020817]/80 rounded-xl p-4 border border-[#1e293b] shadow-md relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: flow.color === 'blue' ? '#3b82f6' : flow.color === 'purple' ? '#a855f7' : '#f59e0b' }}></div>
                    <div className="text-base font-bold text-[#f1f5f9] mb-2 pl-2">
                      {flow.model} Output → <span className="text-[#cbd5e1] font-medium">{flow.title}</span>
                    </div>
                    <div className="text-sm text-[#94a3b8] space-y-2 mb-3 pl-2">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-[#cbd5e1] w-14 shrink-0">Input:</span>
                        <span className="text-[#f1f5f9] bg-[#1e293b] px-2 py-0.5 rounded font-mono-display">{flow.input}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-[#cbd5e1] w-14 shrink-0">Output:</span>
                        <span className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded font-mono-display font-bold">{flow.output}</span>
                      </div>
                      <div className="flex items-start gap-2 pt-1 border-t border-[#1e293b]/50">
                        <span className="font-semibold text-[#cbd5e1] w-14 shrink-0 mt-1">Impact:</span>
                        <span className="text-[#cbd5e1] leading-snug">{flow.action}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-2 mt-3 pt-2 bg-[#0f172a] -mx-4 -mb-4 p-4 border-t border-[#1e293b]">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${badgeColor}`}>{flow.model} Prediction</span>
                      <ArrowRight className="w-4 h-4 text-[#64748b]" />
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-green-500/20 text-green-400 border border-green-500/30">{flow.target}</span>
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
