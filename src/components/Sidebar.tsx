import { Cross, Map, Bot, BarChart3, Download, Share2, FileText, Presentation, Github, Linkedin } from 'lucide-react';
import { TABS, type TabId } from '../data/placeholder';
import { formatElapsed } from '../utils/formatters';

const iconMap: Record<string, React.ElementType> = {
  Map, Bot, BarChart3,
};

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  elapsedSeconds: number;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  elapsedSeconds,
}: SidebarProps) {
  // Format the time as MM:SS and remove the "T+" part if present
  const timeStr = formatElapsed(elapsedSeconds).replace('T+ ', '');
  const [hh, mm, ss] = timeStr.split(':');
  const displayTime = hh !== '00' ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;

  // USER: Update your links here
  const GITHUB_LINK = "https://github.com/habiba-imran/AI-AIDRA";
  const LINKEDIN_LINK = "https://www.linkedin.com/posts/habiba-imran-118624258_ai-disasterresponse-innovation-ugcPost-7459292349840596993-i9N3?utm_source=share&utm_medium=member_desktop&rcm=ACoAAD9zxaQBvhQ8gQE3WAF83vbfdQ-jTaT7DUk";

  return (
    <aside className="w-16 flex flex-col items-center py-4 bg-[#0a0f1e] border-r border-[#1e293b] shrink-0 z-50 h-screen">
      {/* 1. App Logo */}
      <div className="w-10 h-10 rounded-xl bg-[#020817] border border-[#1e293b] flex items-center justify-center shadow-lg mb-6 shrink-0 group relative">
        <Cross className="w-5 h-5 text-red-500" />
        {/* Tooltip */}
        <div className="absolute left-full ml-4 px-2 py-1 bg-[#020817] text-[#f1f5f9] text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-[#1e293b] shadow-2xl">
          AIDRA Dashboard
        </div>
      </div>

      {/* 2. Main Nav Icons */}
      <div className="flex flex-col items-center gap-[20px] w-full px-[12px]">
        {TABS.map((tab) => {
          const Icon = iconMap[tab.icon];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative group flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 cursor-pointer
                ${isActive
                  ? 'bg-[#3b82f6] text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                  : 'text-[#64748b] hover:bg-[#1e293b] hover:text-[#93c5fd]'
                }
              `}
            >
              {Icon && <Icon className="w-[18px] h-[18px]" />}

              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-2 py-1 bg-[#020817] text-[#f1f5f9] text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-[#1e293b] shadow-2xl">
                {tab.label}
              </div>
            </button>
          );
        })}

        {/* 3. Horizontal Divider */}
        <div className="w-8 h-px bg-[#1e293b] my-1" />

        {/* 4. Download Icon + Popup */}
        <div className="relative group">
          <button className="w-9 h-9 flex items-center justify-center rounded-xl text-[#64748b] hover:bg-[#1e293b] hover:text-[#f1f5f9] transition-all cursor-pointer">
            <Download className="w-[18px] h-[18px]" />
          </button>

          {/* Tooltip */}
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2 py-1 bg-[#020817] text-[#f1f5f9] text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-[#1e293b]">
            Downloads
          </div>

          {/* Popup Menu */}
          <div className="absolute left-full top-0 ml-3 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 z-[100]">
            <div className="bg-[#020817] border border-[#1e293b] rounded-lg p-1.5 shadow-2xl min-w-[140px] flex flex-col gap-1">
              <a href="/assignment.pdf" download="AIDRA_Assignment_Report.pdf" className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-[#1e293b] text-[#94a3b8] hover:text-[#f1f5f9] transition-colors">
                <FileText className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-bold whitespace-nowrap">Download Report</span>
              </a>
              <a href="/presentation.pptx" download="AIDRA_Presentation.pptx" className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-[#1e293b] text-[#94a3b8] hover:text-[#f1f5f9] transition-colors">
                <Presentation className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-bold whitespace-nowrap">Download PPT</span>
              </a>
            </div>
          </div>
        </div>

        {/* 5. Links Icon + Popup */}
        <div className="relative group">
          <button className="w-9 h-9 flex items-center justify-center rounded-xl text-[#64748b] hover:bg-[#1e293b] hover:text-[#f1f5f9] transition-all cursor-pointer">
            <Share2 className="w-[18px] h-[18px]" />
          </button>

          {/* Tooltip */}
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2 py-1 bg-[#020817] text-[#f1f5f9] text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-[#1e293b]">
            External Links
          </div>

          {/* Popup Menu */}
          <div className="absolute left-full top-0 ml-3 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 z-[100]">
            <div className="bg-[#020817] border border-[#1e293b] rounded-lg p-1.5 shadow-2xl min-w-[140px] flex flex-col gap-1">
              <a href={GITHUB_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-[#1e293b] text-[#94a3b8] hover:text-[#f1f5f9] transition-colors">
                <Github className="w-4 h-4" />
                <span className="text-[10px] font-bold whitespace-nowrap">GitHub</span>
              </a>
              <a href={LINKEDIN_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-[#1e293b] text-[#94a3b8] hover:text-[#f1f5f9] transition-colors">
                <Linkedin className="w-4 h-4 text-[#0077b5]" />
                <span className="text-[10px] font-bold whitespace-nowrap">LinkedIn</span>
              </a>
            </div>
          </div>
        </div>

        {/* 6. Timer (Replaces Settings) */}
        <div className="flex flex-col items-center gap-0 group relative cursor-help">
          <span className="font-mono-display text-[#22c55e] text-[11px] font-bold tracking-tight">
            {displayTime}
          </span>
          <span className="text-[8px] text-[#64748b] font-bold uppercase tracking-widest mt-[-2px]">
            ELAPSED
          </span>

          {/* Tooltip */}
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2 py-1 bg-[#020817] text-[#f1f5f9] text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-[#1e293b] shadow-2xl">
            Simulation Runtime
          </div>
        </div>

        {/* 7. Horizontal Divider */}
        <div className="w-8 h-px bg-[#1e293b] my-1" />
      </div>
    </aside>
  );
}
