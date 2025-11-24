import React, { useState, useEffect } from 'react';
import { getData, saveAnalysis } from '../services/storageService';
import { generateSleepAnalysis } from '../services/geminiService';
import { SleepRecord } from '../types';
import { LATE_REASONS } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Calendar, TrendingUp, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, BatteryWarning, CheckCircle2, AlertCircle, X, Moon, Sun, Clock, Sparkles, Key, Loader2, Check } from 'lucide-react';

const HeatmapStats: React.FC = () => {
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [showStandards, setShowStandards] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); // Tracks the currently viewed month
  
  // Time Range State
  const [timeRange, setTimeRange] = useState<7 | 30>(7);

  // Modal State
  const [selectedRecord, setSelectedRecord] = useState<SleepRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // AI Analysis State
  const [analysis, setAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState('');
  
  useEffect(() => {
    const data = getData();
    setRecords(data.sleepRecords);

    // Load API Key (Shared with DumpBox)
    const savedKey = localStorage.getItem('dreamy_drift_api_key');
    if (savedKey) {
        setApiKey(savedKey);
        setTempKey(savedKey);
    }

    // Check for persisted analysis (valid for 24 hours)
    if (data.latestAnalysis) {
      const now = Date.now();
      if (now - data.latestAnalysis.timestamp < 24 * 60 * 60 * 1000) {
        setAnalysis(data.latestAnalysis.text);
      }
    }
  }, []);

  // Clear analysis when time range changes? 
  // User might prefer to keep the cached one if it's recent, but changing range strictly invalidates the context.
  // Let's clear it to avoid confusion, or we could store analysis per range. 
  // For simplicity, if the user explicitly changes range, we clear the view, but we don't delete the cached one from storage immediately.
  // However, to be "sticky" as requested, we should probably only show it if it makes sense. 
  // But the prompt asked to "keep it for 24h". Let's assume the cached analysis is generic enough or the user wants to see the last generated one.
  // Actually, re-generating is better if range changes. Let's clear `analysis` state on range change but not storage.
  useEffect(() => {
    // If we switch ranges, the previous analysis might be mismatching. 
    // But to satisfy "keep for 24h", we'll stick to the loaded one unless user regenerates.
    // If user changes range, they likely want new stats.
    // We will clear visual analysis state if the user explicitly toggles range.
    // But on initial load, we loaded the persisted one.
    // Let's leave this empty to allow "persistence" to mean "persistence".
    // Or better: store metadata about which range was used? 
    // For now, let's just let the user see the old one until they click "Regenerate".
  }, [timeRange]);

  const saveApiKey = () => {
      localStorage.setItem('dreamy_drift_api_key', tempKey.trim());
      setApiKey(tempKey.trim());
      setShowKeyModal(false);
  };

  // --- Analysis Logic ---

  const getSleepQualityColor = (record: SleepRecord) => {
    const sleepH = parseInt(record.sleepTime.split(':')[0]);
    const wakeH = parseInt(record.wakeTime.split(':')[0]);
    const sleepM = parseInt(record.sleepTime.split(':')[1]);
    const wakeM = parseInt(record.wakeTime.split(':')[1]);

    // Calculate duration roughly in hours
    let start = sleepH * 60 + sleepM;
    let end = wakeH * 60 + wakeM;
    if (start > end) start -= 1440; // Adjust for crossing midnight
    const durationHours = (end - start) / 60;

    // Is Late? (Sleep after 00:00 and before 12:00)
    const isLate = sleepH >= 0 && sleepH < 12;

    const isGoodDuration = durationHours >= 7;

    if (!isLate && isGoodDuration) return 'bg-emerald-400'; // Good
    if (!isLate && !isGoodDuration) return 'bg-yellow-400'; // Good start, bad duration
    if (isLate && isGoodDuration) return 'bg-orange-400'; // Bad start, good duration
    return 'bg-rose-400'; // Bad
  };

  // Stats Calculation based on range
  const calculateStats = (days: number) => {
    const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentRecords = sorted.slice(0, days);
    
    // 1. Late Count
    const lateCount = recentRecords.filter(r => {
      const h = parseInt(r.sleepTime.split(':')[0]);
      return h >= 0 && h < 12; 
    }).length;

    // 2. Insufficient Sleep Count (< 7 hours)
    const insufficientCount = recentRecords.filter(r => {
        const sleepH = parseInt(r.sleepTime.split(':')[0]);
        const sleepM = parseInt(r.sleepTime.split(':')[1]);
        const wakeH = parseInt(r.wakeTime.split(':')[0]);
        const wakeM = parseInt(r.wakeTime.split(':')[1]);

        let start = sleepH * 60 + sleepM;
        let end = wakeH * 60 + wakeM;
        
        let durationMins = 0;
        if (start > end) {
           durationMins = (1440 - start) + end;
        } else {
           durationMins = end - start;
        }
        return durationMins < 420; // 7 hours * 60 mins
    }).length;

    // 3. Reason Count
    const reasonCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {
      PSYCHOLOGICAL: 0, BEHAVIORAL: 0, PHYSIOLOGICAL: 0, EXTERNAL: 0
    };

    recentRecords.forEach(r => {
      r.reasons.forEach(rid => {
        reasonCounts[rid] = (reasonCounts[rid] || 0) + 1;
        const reasonDef = LATE_REASONS.find(lr => lr.id === rid);
        if (reasonDef) {
          categoryCounts[reasonDef.category]++;
        }
      });
    });

    // Limit: Weekly (7 days) -> Top 5, Monthly (30 days) -> Top 10
    const limit = days === 30 ? 10 : 5;

    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, count]) => {
        const def = LATE_REASONS.find(lr => lr.id === id);
        return { label: def?.label || id, count, category: def?.category };
      });

    const categoryMap: Record<string, string> = {
      PSYCHOLOGICAL: '心理', BEHAVIORAL: '行为', PHYSIOLOGICAL: '生理', EXTERNAL: '外部'
    };

    const pieData = Object.entries(categoryCounts)
      .filter(([, val]) => val > 0)
      .map(([name, value]) => ({ name: categoryMap[name], value }));

    return { lateCount, insufficientCount, topReasons, pieData, totalTracked: recentRecords.length };
  };

  const stats = calculateStats(timeRange);

  const handleGenerateAnalysis = async () => {
    if (!apiKey) {
        setShowKeyModal(true);
        return;
    }
    if (stats.totalTracked === 0) {
        setAnalysis("数据太少啦，多记录几天再来找我吧！");
        return;
    }

    setIsAnalyzing(true);
    try {
        const reasonsText = stats.topReasons.map(r => r.label);
        const result = await generateSleepAnalysis(stats, reasonsText, timeRange, apiKey);
        setAnalysis(result);
        saveAnalysis(result); // Persist the result
    } catch (e) {
        setAnalysis("哎呀，连接小睡神的信号断了，请检查 API Key 或稍后再试。");
    } finally {
        setIsAnalyzing(false);
    }
  };

  // Simple Markdown Renderer
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      // Split by double asterisks for bold
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={i} className={`mb-2 min-h-[1em] ${line.startsWith('-') ? 'pl-4' : ''}`}>
            {parts.map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={j} className="text-indigo-700 dark:text-indigo-300">{part.slice(2, -2)}</strong>;
                }
                return <span key={j}>{part}</span>;
            })}
        </div>
      );
    });
  };

  // --- Calendar Navigation ---
  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDayClick = (record: SleepRecord | undefined) => {
      if (record) {
          setSelectedRecord(record);
          setIsModalOpen(true);
      }
  };

  const renderCalendarGrid = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

    const slots = [];
    // Empty slots
    for (let i = 0; i < firstDayOfWeek; i++) {
      slots.push({ empty: true, key: `empty-${i}` });
    }
    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      slots.push({ empty: false, key: dateStr, dateStr, day: d });
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {['日','一','二','三','四','五','六'].map((d, i) => (
            <div key={i} className="text-center text-xs text-stone-400 dark:text-stone-500 font-bold mb-1">{d}</div>
        ))}
        {slots.map((slot) => {
          if (slot.empty) {
            return <div key={slot.key} className="aspect-square"></div>;
          }

          const record = records.find(r => r.date === slot.dateStr);
          const colorClass = record ? getSleepQualityColor(record) : 'bg-stone-100 dark:bg-stone-700/50';
          
          return (
            <div 
              key={slot.key}
              onClick={() => handleDayClick(record)}
              className={`aspect-square rounded-lg ${colorClass} flex items-center justify-center text-[10px] ${record ? 'text-white/90 font-bold' : 'text-stone-300 dark:text-stone-600'} cursor-pointer hover:scale-110 transition-transform relative group`}
            >
               {slot.day}
            </div>
          );
        })}
      </div>
    );
  };

  const COLORS = ['#fca5a5', '#fdba74', '#86efac', '#cbd5e1'];

  const RecordDetailModal = () => {
      if (!selectedRecord) return null;

      // Calculate Duration
      const sleepH = parseInt(selectedRecord.sleepTime.split(':')[0]);
      const sleepM = parseInt(selectedRecord.sleepTime.split(':')[1]);
      const wakeH = parseInt(selectedRecord.wakeTime.split(':')[0]);
      const wakeM = parseInt(selectedRecord.wakeTime.split(':')[1]);

      let start = sleepH * 60 + sleepM;
      let end = wakeH * 60 + wakeM;
      let durationMins = 0;
      if (start > end) {
          durationMins = (1440 - start) + end;
      } else {
          durationMins = end - start;
      }
      const h = Math.floor(durationMins / 60);
      const m = durationMins % 60;
      const durationStr = `${h}小时 ${m}分`;

      const reasonLabels = selectedRecord.reasons.map(id => {
          return LATE_REASONS.find(lr => lr.id === id)?.label || id;
      });

      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-stone-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-scale-up">
                  <button 
                      onClick={() => setIsModalOpen(false)}
                      className="absolute right-4 top-4 p-2 bg-stone-100 dark:bg-stone-700 rounded-full text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-600"
                  >
                      <X className="w-5 h-5" />
                  </button>

                  <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-6 flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-warm-500" />
                      {selectedRecord.date}
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-blue-50 dark:bg-slate-800/50 p-3 rounded-2xl flex flex-col items-center justify-center">
                          <Moon className="w-6 h-6 text-blue-500 mb-1" />
                          <span className="text-xs text-blue-400 font-bold mb-1">入睡</span>
                          <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{selectedRecord.sleepTime}</span>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-2xl flex flex-col items-center justify-center">
                          <Sun className="w-6 h-6 text-amber-500 mb-1" />
                          <span className="text-xs text-amber-500 font-bold mb-1">起床</span>
                          <span className="text-xl font-bold text-amber-700 dark:text-amber-300">{selectedRecord.wakeTime}</span>
                      </div>
                  </div>

                  <div className="bg-stone-50 dark:bg-stone-700/50 rounded-2xl p-4 mb-6 flex justify-between items-center">
                      <span className="text-stone-500 dark:text-stone-400 font-medium text-sm flex items-center gap-2">
                          <Clock className="w-4 h-4" /> 睡眠时长
                      </span>
                      <span className="text-lg font-bold text-stone-800 dark:text-stone-100">{durationStr}</span>
                  </div>

                  {reasonLabels.length > 0 ? (
                      <div>
                          <h4 className="text-sm font-bold text-stone-500 dark:text-stone-400 mb-3">熬夜原因</h4>
                          <div className="flex flex-wrap gap-2">
                              {reasonLabels.map((label, idx) => (
                                  <span key={idx} className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 rounded-full text-sm font-medium border border-rose-100 dark:border-rose-900/30">
                                      {label}
                                  </span>
                              ))}
                          </div>
                      </div>
                  ) : (
                      <div className="text-center py-2 text-emerald-500 font-medium text-sm bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                          👏 没有熬夜，非常棒！
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6">
       {/* Details Modal */}
       {isModalOpen && <RecordDetailModal />}

       {/* Key Configuration Modal */}
       {showKeyModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-fade-in">
               <div className="bg-white dark:bg-stone-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-scale-up">
                    <button onClick={() => setShowKeyModal(false)} className="absolute right-4 top-4 p-2 bg-stone-100 dark:bg-stone-700 rounded-full">
                       <X className="w-4 h-4 text-stone-500" />
                   </button>
                   <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
                       <Key className="w-5 h-5 text-warm-500" />
                       配置 AI 教练
                   </h3>
                   <p className="text-sm text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">
                       如果你希望得到 AI 的深度睡眠分析，请在此处填入你的 Google Gemini API Key。<br/>
                       <span className="text-xs opacity-70">如果不填，将无法生成个性化的复盘建议。</span>
                   </p>
                   <input 
                       type="password" 
                       value={tempKey}
                       onChange={(e) => setTempKey(e.target.value)}
                       placeholder="在此粘贴 API Key (以 AIza 开头)"
                       className="w-full bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl p-3 mb-4 focus:ring-2 focus:ring-warm-400 outline-none text-stone-700 dark:text-stone-200"
                   />
                   <button 
                       onClick={saveApiKey}
                       className="w-full bg-warm-500 hover:bg-warm-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                   >
                       <Check className="w-5 h-5" />
                       保存配置
                   </button>
                    <div className="mt-4 text-center">
                       <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
                           去 Google AI Studio 免费申请 &rarr;
                       </a>
                   </div>
               </div>
           </div>
       )}

       {/* Heatmap Card */}
       <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-warm-500" />
              月度睡眠热力图
            </h2>
            <button 
              onClick={() => setShowStandards(!showStandards)}
              className="text-xs text-stone-400 hover:text-warm-500 flex items-center gap-1"
            >
              评分标准 {showStandards ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
            </button>
          </div>

          {/* Standards Legend (Collapsible) */}
          {showStandards && (
            <div className="mb-4 bg-stone-50 dark:bg-stone-700/50 p-3 rounded-xl text-xs space-y-2 animate-fade-in border border-stone-100 dark:border-stone-700">
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-400 flex-shrink-0"></div>
                  <span className="text-stone-600 dark:text-stone-300">
                    <strong className="text-stone-800 dark:text-stone-200">完美：</strong>
                    早于00:00睡 且 睡够7h
                  </span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-yellow-400 flex-shrink-0"></div>
                  <span className="text-stone-600 dark:text-stone-300">
                    <strong className="text-stone-800 dark:text-stone-200">还行：</strong>
                    早于00:00睡 但 没睡够
                  </span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-orange-400 flex-shrink-0"></div>
                  <span className="text-stone-600 dark:text-stone-300">
                    <strong className="text-stone-800 dark:text-stone-200">晚睡：</strong>
                    晚于00:00睡 但 补足了时长
                  </span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-rose-400 flex-shrink-0"></div>
                  <span className="text-stone-600 dark:text-stone-300">
                    <strong className="text-stone-800 dark:text-stone-200">糟糕：</strong>
                    晚于00:00睡 且 没睡够
                  </span>
               </div>
            </div>
          )}
          
          {/* Month Navigator */}
          <div className="flex items-center justify-between mb-4 bg-stone-50 dark:bg-stone-700/30 p-1.5 rounded-xl">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-white dark:hover:bg-stone-600 rounded-lg transition-colors text-stone-500 dark:text-stone-400">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-stone-700 dark:text-stone-200">
              {viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-white dark:hover:bg-stone-600 rounded-lg transition-colors text-stone-500 dark:text-stone-400">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {renderCalendarGrid()}
          
          <div className="mt-4 flex justify-between text-xs text-stone-400 dark:text-stone-500 px-2">
             <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-400 rounded-full"></div>完美</div>
             <div className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-400 rounded-full"></div>还行</div>
             <div className="flex items-center gap-1"><div className="w-2 h-2 bg-orange-400 rounded-full"></div>晚睡</div>
             <div className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-400 rounded-full"></div>糟糕</div>
          </div>
       </div>

       {/* Weekly Analysis */}
       <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 transition-colors">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-warm-500" />
                {timeRange === 7 ? '近7天复盘' : '近30天复盘'}
             </h2>
             <div className="bg-stone-100 dark:bg-stone-700 p-1 rounded-xl flex text-xs font-bold">
                 <button 
                    onClick={() => setTimeRange(7)} 
                    className={`px-3 py-1 rounded-lg transition-all ${timeRange === 7 ? 'bg-white dark:bg-stone-600 text-warm-600 dark:text-warm-400 shadow-sm' : 'text-stone-400'}`}
                 >
                     7天
                 </button>
                 <button 
                    onClick={() => setTimeRange(30)} 
                    className={`px-3 py-1 rounded-lg transition-all ${timeRange === 30 ? 'bg-white dark:bg-stone-600 text-warm-600 dark:text-warm-400 shadow-sm' : 'text-stone-400'}`}
                 >
                     30天
                 </button>
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Late Count Card */}
              <div className="bg-warm-50 dark:bg-warm-900/20 p-4 rounded-2xl flex flex-col justify-between">
                 <div>
                    <p className="text-sm text-warm-600 dark:text-warm-300 font-medium mb-1">熬夜次数</p>
                    <p className="text-3xl font-bold text-warm-900 dark:text-warm-100">{stats.lateCount} <span className="text-sm font-normal text-warm-400">天</span></p>
                 </div>
                 <div className="self-end text-xl mt-2">
                    {stats.lateCount === 0 ? '🎉' : stats.lateCount / stats.totalTracked < 0.3 ? '👌' : '🐼'}
                 </div>
              </div>

              {/* Insufficient Sleep Card */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl flex flex-col justify-between">
                 <div>
                    <p className="text-sm text-indigo-600 dark:text-indigo-300 font-medium mb-1">睡眠不足(&lt;7h)</p>
                    <p className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">{stats.insufficientCount} <span className="text-sm font-normal text-indigo-400">天</span></p>
                 </div>
                 <div className="self-end text-xl mt-2">
                    {stats.insufficientCount === 0 ? '🔋' : '🪫'}
                 </div>
              </div>
          </div>

          {stats.topReasons.length > 0 && (
             <div className="mb-6">
                <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">熬夜主因 (TOP {timeRange === 30 ? 10 : 5})</h3>
                <div className="space-y-2">
                  {stats.topReasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-700 rounded-lg">
                       <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{reason.label}</span>
                       <span className="text-xs font-bold text-white bg-stone-400 dark:bg-stone-600 px-2 py-0.5 rounded-full">{reason.count}次</span>
                    </div>
                  ))}
                </div>
             </div>
          )}

          {stats.pieData.length > 0 && (
             <div className="h-48 w-full mb-6">
               <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 text-center">原因分布</h3>
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={stats.pieData}
                     cx="50%"
                     cy="50%"
                     innerRadius={40}
                     outerRadius={60}
                     paddingAngle={5}
                     dataKey="value"
                     stroke="none"
                   >
                     {stats.pieData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
          )}

          {/* AI Analysis Section */}
          <div className="mt-8 pt-6 border-t border-dashed border-stone-200 dark:border-stone-700">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                     <Sparkles className="w-4 h-4" /> AI 睡眠教练
                 </h3>
                 {!apiKey && (
                     <button onClick={() => setShowKeyModal(true)} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-lg">
                         配置 Key 开启
                     </button>
                 )}
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 border border-indigo-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                  {!isAnalyzing && analysis ? (
                      <div className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed animate-fade-in whitespace-pre-wrap">
                          {renderMarkdown(analysis)}
                          <div className="mt-3 flex justify-end">
                             <button onClick={handleGenerateAnalysis} className="text-xs text-indigo-400 underline hover:text-indigo-500 transition-colors">刷新建议</button>
                          </div>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center text-center py-2">
                          <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                             {stats.totalTracked > 0 ? "点击下方按钮，生成专属于你的睡眠复盘建议。" : "先记录几天睡眠，我才能分析哦。"}
                          </p>
                          <button 
                             onClick={handleGenerateAnalysis}
                             disabled={isAnalyzing || stats.totalTracked === 0}
                             className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold py-2 px-6 rounded-full shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                              {isAnalyzing ? '分析中...' : '生成分析报告'}
                          </button>
                      </div>
                  )}
                  {/* Decoration */}
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-indigo-200 dark:bg-indigo-900 rounded-full opacity-20 blur-xl pointer-events-none"></div>
              </div>
          </div>
       </div>
    </div>
  );
};

export default HeatmapStats;