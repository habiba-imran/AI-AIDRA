import { Sparkles } from 'lucide-react';

export default function BottomBar() {
  return (
    <div className="h-[80px] shrink-0 bg-[#0a0f1e] border-t border-[#1e293b] flex items-stretch px-4 py-2 gap-4">
      {/* Left: Fuzzy Logic */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Fuzzy Engine Active</span>
        </div>
        <div className="font-mono-display text-[9px] space-y-0.5 text-[#94a3b8]">
          <div>
            <span className="text-[#64748b]">Input:</span> Road Risk=<span className="text-amber-400">0.72</span> | Hazard=<span className="text-amber-400">0.55</span>
          </div>
          <div>
            <span className="text-[#64748b]">→ Rule:</span> <span className="text-purple-300">IF risk HIGH AND hazard MEDIUM → REROUTE</span>
          </div>
          <div>
            <span className="text-[#64748b]">→ Output:</span> Confidence = <span className="text-green-400">HIGH (0.81)</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-[#1e293b]" />

      {/* Right: ML Stats */}
      <div className="flex-1 flex items-center gap-3">
        {/* kNN Card */}
        <div className="card-glass p-2.5 flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-[#f1f5f9]">kNN</span>
            <span className="text-[8px] text-green-400 font-medium">Active</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[9px] text-[#94a3b8] space-y-0.5">
              <div>Acc: <span className="text-green-400">84%</span></div>
              <div>F1: <span className="text-green-400">0.80</span></div>
            </div>
            <div className="grid grid-cols-2 gap-0.5">
              <div className="w-4 h-4 rounded-sm bg-green-500/40 flex items-center justify-center text-[7px] text-green-300">42</div>
              <div className="w-4 h-4 rounded-sm bg-red-500/30 flex items-center justify-center text-[7px] text-red-300">8</div>
              <div className="w-4 h-4 rounded-sm bg-red-500/30 flex items-center justify-center text-[7px] text-red-300">6</div>
              <div className="w-4 h-4 rounded-sm bg-green-500/40 flex items-center justify-center text-[7px] text-green-300">44</div>
            </div>
          </div>
        </div>

        {/* Naive Bayes Card */}
        <div className="card-glass p-2.5 flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-[#f1f5f9]">Naive Bayes</span>
            <span className="text-[8px] text-[#64748b] font-medium">Standby</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[9px] text-[#94a3b8] space-y-0.5">
              <div>Acc: <span className="text-amber-400">78%</span></div>
              <div>F1: <span className="text-amber-400">0.77</span></div>
            </div>
            <div className="grid grid-cols-2 gap-0.5">
              <div className="w-4 h-4 rounded-sm bg-green-500/30 flex items-center justify-center text-[7px] text-green-300/70">38</div>
              <div className="w-4 h-4 rounded-sm bg-red-500/30 flex items-center justify-center text-[7px] text-red-300/70">12</div>
              <div className="w-4 h-4 rounded-sm bg-red-500/30 flex items-center justify-center text-[7px] text-red-300/70">10</div>
              <div className="w-4 h-4 rounded-sm bg-green-500/30 flex items-center justify-center text-[7px] text-green-300/70">40</div>
            </div>
          </div>
        </div>

        {/* Active tag */}
        <div className="flex items-end pb-1">
          <span className="text-[8px] text-green-400 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">
            kNN active for routing decisions
          </span>
        </div>
      </div>
    </div>
  );
}
