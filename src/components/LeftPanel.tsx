import { Play, Pause, RotateCcw, Zap, Construction, UserPlus, Flame, Sparkles, Settings } from 'lucide-react';
import { ambulances, rescueTeam } from '../data/placeholder';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold tracking-[0.15em] text-[#3b82f6] uppercase mb-3 mt-1">
      {children}
    </div>
  );
}

function SimButton({ children, variant }: {
  children: React.ReactNode;
  variant: 'green' | 'amber' | 'slate' | 'red-pulse' | 'orange' | 'purple' | 'red-gradient' | 'blue-gradient';
}) {
  const base = 'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 cursor-pointer';
  const variants: Record<string, string> = {
    'green': 'bg-[#22c55e] text-[#f1f5f9] glow-green hover:bg-[#16a34a]',
    'amber': 'bg-[#f59e0b] text-[#020817] glow-amber hover:bg-[#d97706]',
    'slate': 'bg-transparent border border-[#334155] text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#f1f5f9]',
    'red-pulse': 'bg-[#7f1d1d] text-red-300 border border-red-500/50 animate-pulse-red hover:bg-[#991b1b]',
    'orange': 'bg-transparent border border-orange-500/50 text-orange-400 hover:bg-orange-500/10',
    'purple': 'bg-transparent border border-purple-500/50 text-purple-400 hover:bg-purple-500/10',
    'red-gradient': 'bg-gradient-to-r from-red-600 to-orange-600 text-[#f1f5f9] hover:from-red-500 hover:to-orange-500',
    'blue-gradient': 'bg-gradient-to-r from-[#3b82f6] to-[#6366f1] text-[#f1f5f9] glow-blue hover:from-[#2563eb] hover:to-[#4f46e5]',
  };
  return (
    <button className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  );
}

export default function LeftPanel() {
  return (
    <div className="w-[270px] shrink-0 bg-[#0f172a] border-r border-[#1e293b] overflow-y-auto p-4 space-y-4"
         style={{ boxShadow: 'inset 4px 0 12px -6px rgba(59,130,246,0.15)' }}>
      {/* Simulation Controls */}
      <div>
        <SectionLabel>Simulation Controls</SectionLabel>
        <div className="space-y-2">
          <SimButton variant="green"><Play className="w-4 h-4" /> Start Simulation</SimButton>
          <SimButton variant="amber"><Pause className="w-4 h-4" /> Pause</SimButton>
          <SimButton variant="slate"><RotateCcw className="w-4 h-4" /> Reset</SimButton>
        </div>
        <div className="border-t border-[#1e293b] my-3" />
        <div className="space-y-2">
          <SimButton variant="red-pulse"><Zap className="w-4 h-4" /> Trigger Aftershock</SimButton>
          <SimButton variant="orange"><Construction className="w-4 h-4" /> Block Random Road</SimButton>
          <SimButton variant="purple"><UserPlus className="w-4 h-4" /> Add New Victim</SimButton>
          <SimButton variant="red-gradient"><Flame className="w-4 h-4" /> Spread Fire Zone</SimButton>
        </div>
      </div>

      {/* Sim Speed */}
      <div>
        <SectionLabel>Sim Speed</SectionLabel>
        <div className="flex gap-1">
          {['Slow', 'Normal', 'Fast'].map((speed) => (
            <button
              key={speed}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                speed === 'Normal'
                  ? 'bg-[#3b82f6] text-[#f1f5f9] glow-blue'
                  : 'bg-transparent border border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]'
              }`}
            >
              {speed === 'Normal' ? `${speed} \u2713` : speed}
            </button>
          ))}
        </div>
      </div>

      {/* Algorithm Settings */}
      <div>
        <SectionLabel>AI Configuration</SectionLabel>
        <div className="space-y-3">
          {[
            { label: 'Search Algorithm', value: 'A* \u2B50', options: ['BFS', 'DFS', 'Greedy Best-First', 'A* \u2B50'] },
            { label: 'Local Search', value: 'Simulated Annealing', options: ['Hill Climbing', 'Simulated Annealing'] },
            { label: 'ML Risk Model', value: 'MLP', options: ['kNN', 'Naive Bayes', 'MLP'] },
            { label: 'Objective Priority', value: 'Minimize Risk', options: ['Minimize Time', 'Minimize Risk', 'Balanced'] },
          ].map((setting) => (
            <div key={setting.label}>
              <label className="text-[10px] text-[#94a3b8] mb-1 block">{setting.label}</label>
              <select className="w-full bg-[#020817] border border-[#1e293b] rounded-lg px-3 py-1.5 text-[11px] text-[#f1f5f9] appearance-none cursor-pointer focus:outline-none focus:border-[#3b82f6] transition-colors"
                      defaultValue={setting.value}>
                {setting.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          ))}

          {/* Fuzzy Logic Toggle */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-[11px] text-[#f1f5f9]">Fuzzy Logic</span>
            </div>
            <div className="w-10 h-5 bg-[#3b82f6] rounded-full relative cursor-pointer glow-blue">
              <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-[#f1f5f9] rounded-full transition-all" />
            </div>
          </div>

          <SimButton variant="blue-gradient"><Settings className="w-4 h-4" /> Apply & Replan</SimButton>
        </div>
      </div>

      {/* Resource Status */}
      <div>
        <SectionLabel>Resource Status</SectionLabel>
        <div className="space-y-2">
          {ambulances.map((amb) => (
            <div key={amb.id} className={`card-glass p-3 ${amb.status === 'EN ROUTE' ? 'border-glow-left-blue' : 'border-glow-left-amber'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px]">🚑</span>
                  <span className="text-[11px] font-medium text-[#f1f5f9]">{amb.label}</span>
                </div>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                  amb.status === 'EN ROUTE'
                    ? 'bg-green-500/20 text-green-400 badge-glow-green'
                    : 'bg-amber-500/20 text-amber-400 badge-glow-amber'
                }`}>
                  {amb.status}
                </span>
              </div>
              <div className="mb-1">
                <div className="flex items-center justify-between text-[10px] text-[#94a3b8] mb-1">
                  <span>Victims: {amb.victims} / {amb.capacity}</span>
                </div>
                <div className="w-full h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3b82f6] rounded-full transition-all"
                    style={{ width: `${(amb.victims / amb.capacity) * 100}%` }}
                  />
                </div>
              </div>
              <div className={`text-[10px] ${amb.status === 'EN ROUTE' ? 'text-red-400' : 'text-[#64748b]'}`}>
                → {amb.assigned}
              </div>
              {amb.status === 'EN ROUTE' && (
                <div className="text-[10px] text-green-400 mt-0.5">
                  ETA to MC1: {amb.eta}
                </div>
              )}
            </div>
          ))}

          {/* Rescue Team */}
          <div className="card-glass p-3 border-glow-left-amber">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px]">👷</span>
                <span className="text-[11px] font-medium text-[#f1f5f9]">{rescueTeam.label}</span>
              </div>
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 badge-glow-green">
                {rescueTeam.status}
              </span>
            </div>
            <div className="text-[10px] text-amber-400">
              → En route to {rescueTeam.target}
            </div>
            <div className="text-[10px] text-green-400 mt-0.5">
              ETA: {rescueTeam.eta}
            </div>
          </div>

          {/* Medical Kits */}
          <div className="card-glass p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px]">🧰</span>
                <span className="text-[11px] font-medium text-[#f1f5f9]">Medical Kits</span>
              </div>
              <span className="text-[11px] text-green-400 font-medium">7 / 10</span>
            </div>
            <div className="w-full h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
              <div className="h-full bg-[#22c55e] rounded-full" style={{ width: '70%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
