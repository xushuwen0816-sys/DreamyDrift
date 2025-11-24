import React, { useState, useEffect } from 'react';
import { Tab } from './types';
import SleepRecorder from './components/SleepRecorder';
import Checklist from './components/Checklist';
import HeatmapStats from './components/HeatmapStats';
import DumpBox from './components/DumpBox';
import { BarChart2, CheckSquare, Moon, Trash2, Sun } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.RECORD);
  // Initialize from localStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('dreamy_drift_theme');
      return savedTheme === 'dark';
    }
    return false;
  });

  // Toggle Dark Mode Class & Persist
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('dreamy_drift_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('dreamy_drift_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.RECORD:
        return <SleepRecorder onSave={() => setActiveTab(Tab.STATS)} />;
      case Tab.CHECKLIST:
        return <Checklist />;
      case Tab.STATS:
        return <HeatmapStats />;
      case Tab.DUMP:
        return <DumpBox />;
      default:
        return <SleepRecorder onSave={() => {}} />;
    }
  };

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 font-sans transition-colors duration-300 flex justify-center">
      {/* 
        Layout Change: 
        Use h-[100dvh] to fix the app height to the viewport.
        flex-col ensures Header (top) and Nav (bottom) stay put.
        The middle <main> takes remaining space and handles scrolling.
      */}
      <div className="w-full max-w-md h-[100dvh] flex flex-col bg-white dark:bg-stone-900 shadow-2xl overflow-hidden relative transition-colors duration-300">
        
        {/* Header - Fixed at top (flex-none) */}
        <header className="pt-8 pb-4 px-6 bg-white dark:bg-stone-900 z-20 flex justify-between items-center transition-colors flex-shrink-0">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-warm-100 dark:bg-stone-800 flex items-center justify-center">
                 <Moon className="w-5 h-5 text-warm-600 dark:text-warm-400 fill-warm-600 dark:fill-warm-400" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-stone-800 dark:text-stone-100">DreamyDrift</h1>
           </div>
           
           {/* Dark Mode Toggle */}
           <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
           >
             {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
           </button>
        </header>

        {/* 
          Main Content - Takes remaining space (flex-1).
          For most tabs, this container handles scrolling (overflow-y-auto).
          For DumpBox, we disable scroll here (overflow-hidden) so DumpBox can manage its own chat scroll view.
        */}
        <main className={`flex-1 px-4 py-4 ${activeTab === Tab.DUMP ? 'overflow-hidden' : 'overflow-y-auto scrollbar-hide'}`}>
           {renderContent()}
        </main>

        {/* Bottom Navigation - Fixed at bottom (flex-none) */}
        <nav className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-t border-stone-100 dark:border-stone-800 p-2 pb-6 z-30 transition-colors flex-shrink-0">
          <ul className="flex justify-around items-center">
            <NavItem 
               active={activeTab === Tab.RECORD} 
               onClick={() => setActiveTab(Tab.RECORD)} 
               icon={<Moon className="w-6 h-6" />}
               label="睡眠"
            />
            <NavItem 
               active={activeTab === Tab.CHECKLIST} 
               onClick={() => setActiveTab(Tab.CHECKLIST)} 
               icon={<CheckSquare className="w-6 h-6" />}
               label="习惯"
            />
             <NavItem 
               active={activeTab === Tab.STATS} 
               onClick={() => setActiveTab(Tab.STATS)} 
               icon={<BarChart2 className="w-6 h-6" />}
               label="统计"
            />
             <NavItem 
               active={activeTab === Tab.DUMP} 
               onClick={() => setActiveTab(Tab.DUMP)} 
               icon={<Trash2 className="w-6 h-6" />}
               label="树洞"
            />
          </ul>
        </nav>
      </div>
    </div>
  );
};

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavItem: React.FC<NavItemProps> = ({ active, onClick, icon, label }) => (
  <li>
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300 ${
        active ? 'text-warm-600 dark:text-warm-400 -translate-y-1' : 'text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { 
         className: `w-6 h-6 ${active ? 'fill-warm-100 dark:fill-warm-900/30' : ''} transition-all` 
      })}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  </li>
);

export default App;