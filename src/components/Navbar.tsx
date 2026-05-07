import { Cross, Bell, Settings, Map, Search, Puzzle, Bot, BarChart3 } from 'lucide-react';
import { TABS, type TabId } from '../data/placeholder';
import { formatElapsed } from '../utils/formatters';

const iconMap: Record<string, React.ElementType> = {
  Map, Search, Puzzle, Bot, BarChart3,
};

interface NavbarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  elapsedSeconds: number;
  running: boolean;
  toastCount: number;
}

export default function Navbar({
  activeTab,
  onTabChange,
  elapsedSeconds,
  running,
  toastCount,
}: NavbarProps) {
  return (
    <nav className="h-[60px] flex items-center justify-between px-5 bg-[#0a0f1e] border-b border-[#1e293b] shrink-0 z-50">
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center glow-red">
          <Cross className="w-5 h-5 text-red-500" />
        </div>
        <div className="leading-tight">
          <div className="text-[22px] font-bold tracking-wide text-[#f1f5f9] leading-none">AIDRA</div>
          <div className="text-[10px] text-[#94a3b8] leading-tight mt-0.5">
            Adaptive Intelligent Disaster Response Agent
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {TABS.map((tab) => {
          const Icon = iconMap[tab.icon];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 cursor-pointer
                ${isActive
                  ? 'bg-[#3b82f6] text-[#f1f5f9] glow-blue'
                  : 'bg-transparent text-[#94a3b8] hover:bg-[#3b82f6]/10 hover:text-[#93c5fd]'
                }
              `}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {running ? (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-dot" />
            <span className="text-red-500 text-[11px] font-semibold">LIVE</span>
          </div>
        ) : null}
        <span className="font-mono-display text-[#22c55e] text-[13px] font-medium">{formatElapsed(elapsedSeconds)}</span>
        <div className="relative cursor-pointer">
          <Bell className="w-5 h-5 text-[#94a3b8] hover:text-[#f1f5f9] transition-colors" />
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-[9px] text-[#f1f5f9] flex items-center justify-center font-bold badge-glow-red">{toastCount}</span>
        </div>
        <Settings className="w-5 h-5 text-[#94a3b8] cursor-pointer hover:text-[#f1f5f9] transition-colors" />
      </div>
    </nav>
  );
}
