import { Sparkles } from 'lucide-react';
import type { MLModel, MlEvalSnapshot, FuzzyRoutingSnapshot } from '../types';

interface BottomBarProps {
  fuzzyLogicEnabled: boolean;
  fuzzySnapshot: FuzzyRoutingSnapshot | null;
  mlModel: MLModel;
  mlEvalSnapshot: MlEvalSnapshot | null;
}

export default function BottomBar({
  fuzzyLogicEnabled,
  fuzzySnapshot,
  mlModel,
  mlEvalSnapshot,
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
            <span className="text-[#64748b]"> ?</span>
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
