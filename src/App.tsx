import { useState } from 'react';
import Navbar from './components/Navbar';
import LeftPanel from './components/LeftPanel';
import CenterPanel from './components/CenterPanel';
import RightPanel from './components/RightPanel';
import BottomBar from './components/BottomBar';
import NotificationToasts from './components/NotificationToasts';
import SearchTrace from './components/SearchTrace';
import CspSolver from './components/CspSolver';
import MlStudio from './components/MlStudio';
import Analytics from './components/Analytics';
import { type TabId } from './data/placeholder';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('live-sim');

  return (
    <div className="h-screen flex flex-col bg-[#020817] dot-pattern overflow-hidden">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden animate-fade-in flex flex-col" key={activeTab}>
          {activeTab === 'live-sim' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 flex min-h-0">
                <LeftPanel />
                <CenterPanel />
                <RightPanel />
              </div>
              <BottomBar />
            </div>
          )}
          {activeTab === 'search-trace' && <SearchTrace />}
          {activeTab === 'csp-solver' && <CspSolver />}
          {activeTab === 'ml-studio' && <MlStudio />}
          {activeTab === 'analytics' && <Analytics />}
        </div>

        {/* Footer Bar */}
        <div className="shrink-0 h-[28px] bg-[#0a0f1e] border-t border-[#1e293b] flex items-center justify-center px-4">
          <span className="text-[10px] text-[#475569] font-mono-display tracking-wide">
            AIDRA v1.0 | AI Course CCP | Semester 5-A | Dr. Arshad Farhad | Simulation Engine Ready
          </span>
        </div>
      </div>

      <NotificationToasts />
    </div>
  );
}

export default App;
