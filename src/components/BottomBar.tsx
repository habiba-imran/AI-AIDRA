import { Sparkles } from 'lucide-react';
import type { KPI, MLModel, MlEvalSnapshot, FuzzyRoutingSnapshot } from '../types';

interface BottomBarProps {
  fuzzyLogicEnabled: boolean;
  fuzzySnapshot: FuzzyRoutingSnapshot | null;
  mlModel: MLModel;
  mlEvalSnapshot: MlEvalSnapshot | null;
  kpis?: KPI[];
  layout?: 'bottom' | 'side';
}

export default function BottomBar({
  fuzzyLogicEnabled,
  fuzzySnapshot,
  mlModel,
  mlEvalSnapshot,
  kpis = [],
  layout = 'bottom',
}: BottomBarProps) {
  const knnActive = mlModel === 'kNN';
  const nbActive = mlModel === 'NaiveBayes';
  const mlpSelected = mlModel === 'MLP';

  const kNN = mlEvalSnapshot?.reports.kNN;
  const nb = mlEvalSnapshot?.reports.NaiveBayes;
  const mlp = mlEvalSnapshot?.reports.MLP;

  const fuzzyRulePreview =
    fuzzySnapshot && fuzzySnapshot.firedRules.length > 0
      ? fuzzySnapshot.firedRules[0]
      : fuzzyLogicEnabled
        ? 'IF hazard HIGH ∨ urgency HIGH → raise risk penalties on edges'
        : 'Fuzzy engine off — crisp costs';

  if (layout === 'side') {
    return (
      <div className="flex-[0.58] xl:flex-[0.68] min-w-0 h-full min-h-0 border-r border-[#1e293b] p-2 flex flex-col gap-1.5 overflow-y-auto">
        <div className="card-glass p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wide">
              {fuzzyLogicEnabled ? 'Fuzzy on' : 'Fuzzy off'}
            </span>
          </div>
          <div className="font-mono-display text-[10px] leading-snug text-[#cbd5e1] space-y-1">
            <div>
              h=<span className="text-amber-400">{fuzzySnapshot ? fuzzySnapshot.hazardCrisp.toFixed(2) : '—'}</span>{' '}
              u=<span className="text-amber-400">{fuzzySnapshot ? fuzzySnapshot.urgencyCrisp.toFixed(2) : '—'}</span>{' '}
              z=<span className="text-amber-400">{fuzzySnapshot ? fuzzySnapshot.uncertaintyCrisp.toFixed(2) : '—'}</span>
            </div>
            <div className="text-purple-300/90">{fuzzyRulePreview}</div>
            <div>
              s×<span className="text-green-400">{fuzzySnapshot ? fuzzySnapshot.riskStepMultiplier.toFixed(2) : '1.00'}</span>{' '}
              h×<span className="text-green-400">{fuzzySnapshot ? fuzzySnapshot.heuristicRiskWeight.toFixed(2) : '1.00'}</span>{' '}
              csp+<span className="text-green-400">{fuzzySnapshot ? fuzzySnapshot.cspPriorityBump.toFixed(3) : '0.000'}</span>
            </div>
          </div>
        </div>

        <div className="card-glass p-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-1 text-[10px]">
            <span className="text-[#cbd5e1] min-w-0 truncate">
              <span className="text-[#f1f5f9] font-semibold">kNN</span>{' '}
              Acc <span className="text-green-400">{kNN ? `${(kNN.accuracy * 100).toFixed(0)}%` : '—'}</span> · F1 <span className="text-green-400">{kNN ? kNN.macroF1.toFixed(2) : '—'}</span>
            </span>
            <span className={`shrink-0 ${knnActive && !mlpSelected ? 'text-green-400' : 'text-[#64748b]'}`}>{knnActive && !mlpSelected ? '●' : '○'}</span>
          </div>

          <div className="flex items-center justify-between gap-1 text-[10px]">
            <span className="text-[#cbd5e1] min-w-0 truncate">
              <span className="text-[#f1f5f9] font-semibold">NB</span>{' '}
              Acc <span className="text-amber-400">{nb ? `${(nb.accuracy * 100).toFixed(0)}%` : '—'}</span> · F1 <span className="text-amber-400">{nb ? nb.macroF1.toFixed(2) : '—'}</span>
            </span>
            <span className={`shrink-0 ${nbActive && !mlpSelected ? 'text-amber-400' : 'text-[#64748b]'}`}>{nbActive && !mlpSelected ? '●' : '○'}</span>
          </div>

          <div className="pt-1.5 border-t border-[#1e293b] space-y-1">
            <div className="flex items-center justify-between gap-1 text-[10px]">
              <span className="text-[#cbd5e1] min-w-0 truncate">
                <span className="text-[#f1f5f9] font-semibold">MLP</span>{' '}
                Acc <span className="text-green-400">{mlp ? `${(mlp.accuracy * 100).toFixed(0)}%` : '—'}</span> · F1 <span className="text-green-400">{mlp ? mlp.macroF1.toFixed(2) : '—'}</span>
              </span>
              <span className={`shrink-0 ${mlpSelected ? 'text-green-400' : 'text-[#64748b]'}`}>{mlpSelected ? '●' : '○'}</span>
            </div>
            <div className="text-[10px] text-green-400 font-medium">{mlpSelected ? 'MLP→CSP' : knnActive ? 'kNN→CSP' : 'NB→CSP'}{mlEvalSnapshot ? ' ✓' : ''}</div>
          </div>
        </div>

        <div className="card-glass p-2.5">
          <div className="text-[11px] font-semibold tracking-[0.12em] text-[#3b82f6] uppercase mb-1.5">KPIs</div>
          <div className="space-y-1.5">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="flex items-center justify-between text-[10px] border-b border-[#1e293b] pb-1 last:border-b-0 last:pb-0">
                <span className="text-[#94a3b8] truncate pr-2">{kpi.icon} {kpi.label}</span>
                <span className="text-[#f1f5f9] font-semibold shrink-0">{kpi.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[56px] shrink-0 bg-[#0a0f1e] border-t border-[#1e293b] flex items-stretch px-2 py-1 gap-2 min-h-0">
      <div className="flex-[1.1] flex flex-col justify-center min-w-0 py-0.5">
        <div className="flex items-center gap-1 mb-0.5">
          <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
          <span className="text-[8px] font-semibold text-purple-400 uppercase tracking-wide truncate">
            {fuzzyLogicEnabled ? 'Fuzzy on' : 'Fuzzy off'}
          </span>
        </div>
        <div className="font-mono-display text-[8px] leading-tight text-[#94a3b8] space-y-0.5">
          <div className="truncate">
            <span className="text-[#64748b]">in:</span> h=
            <span className="text-amber-400">{fuzzySnapshot ? fuzzySnapshot.hazardCrisp.toFixed(2) : '—'}</span>
            <span className="text-[#64748b]"> u=</span>
            <span className="text-amber-400">{fuzzySnapshot ? fuzzySnapshot.urgencyCrisp.toFixed(2) : '—'}</span>
            <span className="text-[#64748b]"> z=</span>
            <span className="text-amber-400">{fuzzySnapshot ? fuzzySnapshot.uncertaintyCrisp.toFixed(2) : '—'}</span>
          </div>
          <div className="truncate text-purple-300/90">{fuzzyRulePreview}</div>
          <div className="truncate">
            <span className="text-[#64748b]">out:</span> s×
            <span className="text-green-400">{fuzzySnapshot ? fuzzySnapshot.riskStepMultiplier.toFixed(2) : '1.00'}</span>
            <span className="text-[#64748b]"> h×</span>
            <span className="text-green-400">{fuzzySnapshot ? fuzzySnapshot.heuristicRiskWeight.toFixed(2) : '1.00'}</span>
            <span className="text-[#64748b]"> csp+</span>
            <span className="text-green-400">{fuzzySnapshot ? fuzzySnapshot.cspPriorityBump.toFixed(3) : '0.000'}</span>
          </div>
        </div>
      </div>

      <div className="w-px bg-[#1e293b] shrink-0 self-stretch my-1" />

      <div className="flex-1 flex items-stretch gap-1.5 min-w-0 py-0.5">
        <div className="card-glass p-1.5 flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[8px] font-semibold text-[#f1f5f9]">kNN</span>
            <span className={`text-[7px] font-medium shrink-0 ${knnActive && !mlpSelected ? 'text-green-400' : 'text-[#64748b]'}`}>
              {knnActive && !mlpSelected ? '●' : '○'}
            </span>
          </div>
          <div className="text-[8px] text-[#94a3b8] leading-tight">
            Acc <span className="text-green-400">{kNN ? `${(kNN.accuracy * 100).toFixed(0)}%` : '—'}</span>
            <span className="text-[#64748b]"> · </span>
            F1 <span className="text-green-400">{kNN ? kNN.macroF1.toFixed(2) : '—'}</span>
          </div>
        </div>

        <div className="card-glass p-1.5 flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[8px] font-semibold text-[#f1f5f9]">NB</span>
            <span className={`text-[7px] font-medium shrink-0 ${nbActive && !mlpSelected ? 'text-amber-400' : 'text-[#64748b]'}`}>
              {nbActive && !mlpSelected ? '●' : '○'}
            </span>
          </div>
          <div className="text-[8px] text-[#94a3b8] leading-tight">
            Acc <span className="text-amber-400">{nb ? `${(nb.accuracy * 100).toFixed(0)}%` : '—'}</span>
            <span className="text-[#64748b]"> · </span>
            F1 <span className="text-amber-400">{nb ? nb.macroF1.toFixed(2) : '—'}</span>
          </div>
        </div>

        <div className="flex flex-col items-end justify-center shrink-0 gap-0.5 pl-0.5 max-w-[100px]">
          <span className="text-[7px] text-[#64748b] font-mono-display truncate w-full text-right">
            MLP {mlp ? `${(mlp.accuracy * 100).toFixed(0)}%` : '—'}
          </span>
          <span className="text-[7px] text-green-400 font-medium bg-green-500/10 px-1.5 py-0.5 rounded leading-tight text-right">
            {mlpSelected ? 'MLP→CSP' : knnActive ? 'kNN→CSP' : 'NB→CSP'}
            {mlEvalSnapshot ? ' ✓' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
