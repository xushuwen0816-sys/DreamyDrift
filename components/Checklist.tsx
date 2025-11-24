import React, { useState, useEffect } from 'react';
import { Check, Sparkles, Sun, Coffee, Moon, Brain, Activity } from 'lucide-react';
import { CHECKLIST_ITEMS } from '../constants';
import { getData, toggleChecklistItem } from '../services/storageService';

const Checklist: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    const data = getData();
    setCompletedIds(data.checklistLogs[today] || []);
  }, [today]);

  const handleToggle = (id: string) => {
    const newData = toggleChecklistItem(today, id);
    setCompletedIds(newData.checklistLogs[today] || []);
  };

  const progress = Math.round((completedIds.length / CHECKLIST_ITEMS.length) * 100);

  const getIcon = (id: string) => {
    if (id.includes('sun')) return <Sun className="w-4 h-4 text-amber-500" />;
    if (id.includes('coffee')) return <Coffee className="w-4 h-4 text-brown-500" />;
    if (id.includes('bed') || id.includes('dim')) return <Moon className="w-4 h-4 text-indigo-400" />;
    if (id.includes('mind') || id.includes('relax')) return <Brain className="w-4 h-4 text-rose-400" />;
    return <Activity className="w-4 h-4 text-emerald-500" />;
  };

  const categories = [
    { key: 'PHYSIOLOGICAL', label: '生理调适' },
    { key: 'BEHAVIORAL', label: '行为习惯' },
    { key: 'PSYCHOLOGICAL', label: '心理放松' }
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-gradient-to-br from-warm-50 to-orange-50 dark:from-stone-800 dark:to-stone-800 p-6 rounded-3xl shadow-sm border border-warm-100 dark:border-stone-700 text-center transition-colors">
        <div className="flex justify-center mb-2">
          <Sparkles className="w-8 h-8 text-warm-500 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-stone-800 dark:text-warm-100 mb-1">睡前小仪式</h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm mb-4">一小步一小步，走向好梦。</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-white/50 dark:bg-stone-700 rounded-full h-4 p-1">
          <div 
            className="bg-gradient-to-r from-warm-300 to-orange-400 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="text-right text-xs font-bold text-warm-600 dark:text-warm-400 mt-1">今日完成度 {progress}%</div>
      </div>

      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat.key} className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700 overflow-hidden transition-colors">
            <div className="bg-stone-50 dark:bg-stone-900/50 px-4 py-2 border-b border-stone-100 dark:border-stone-700">
              <h3 className="text-xs font-bold text-stone-400 dark:text-stone-500 tracking-widest">{cat.label}</h3>
            </div>
            <div className="divide-y divide-stone-50 dark:divide-stone-700">
              {CHECKLIST_ITEMS.filter(item => item.category === cat.key).map(item => {
                 const isChecked = completedIds.includes(item.id);
                 return (
                  <div 
                    key={item.id}
                    onClick={() => handleToggle(item.id)}
                    className={`p-4 flex items-center gap-4 cursor-pointer transition-colors ${
                      isChecked 
                        ? 'bg-warm-50/50 dark:bg-warm-900/10' 
                        : 'hover:bg-stone-50 dark:hover:bg-stone-700/50'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isChecked 
                        ? 'bg-warm-500 border-warm-500 scale-110' 
                        : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                    }`}>
                      {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        {getIcon(item.id)}
                        <span className={`font-medium ${isChecked ? 'text-stone-800 dark:text-stone-200' : 'text-stone-500 dark:text-stone-500'}`}>
                          {item.text}
                        </span>
                      </div>
                    </div>
                  </div>
                 );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Checklist;