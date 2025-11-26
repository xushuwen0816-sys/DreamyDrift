
import React, { useState, useEffect } from 'react';
import { getData, saveAnalysis } from '../services/storageService';
import { generateSleepAnalysis } from '../services/geminiService';
import { SleepRecord } from '../types';
import { LATE_REASONS } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Calendar, TrendingUp, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, BatteryWarning, CheckCircle2, AlertCircle, X, Moon, Sun, Clock, Sparkles, Key, Loader2, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const HeatmapStats: React.FC = () => {
  const { t, language } = useLanguage();
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [showStandards, setShowStandards] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); 
  const [timeRange, setTimeRange] = useState<7 | 30>(7);

  const [selectedRecord, setSelectedRecord] = useState<SleepRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [analysis, setAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState('');
  
  useEffect(() => {
    const data = getData();
    setRecords(data.sleepRecords);
    const savedKey = localStorage.getItem('dreamy_drift_api_key');
    if (savedKey) {
        setApiKey(savedKey);
        setTempKey(savedKey);
    }
    if (data.latestAnalysis) {
      const now = Date.now();
      if (now - data.latestAnalysis.timestamp < 24 * 60 * 60 * 1000) {
        setAnalysis(data.latestAnalysis.text);
      }
    }
  }, []);

  const saveApiKey = () => {
      localStorage.setItem('dreamy_drift_api_key', tempKey.trim());
      setApiKey(tempKey.trim());
      setShowKeyModal(false);
  };

  const getSleepQualityColor = (record: SleepRecord) => {
    const sleepH = parseInt(record.sleepTime.split(':')[0]);
    const wakeH = parseInt(record.wakeTime.split(':')[0]);
    const sleepM = parseInt(record.sleepTime.split(':')[1]);
    const wakeM = parseInt(record.wakeTime.split(':')[1]);

    let start = sleepH * 60 + sleepM;
    let end = wakeH * 60 + wakeM;
    if (start > end) start -= 1440;
    const durationHours = (end - start) / 60;
    const isLate = sleepH >= 0 && sleepH < 12;
    const isGoodDuration = durationHours >= 7;

    if (!isLate && isGoodDuration) return 'bg-emerald-400';
    if (!isLate && !isGoodDuration) return 'bg-yellow-400'; 
    if (isLate && isGoodDuration) return 'bg-orange-400'; 
    return 'bg-rose-400'; 
  };

  const calculateStats = (days: number) => {
    const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentRecords = sorted.slice(0, days);
    
    const lateCount = recentRecords.filter(r => {
      const h = parseInt(r.sleepTime.split(':')[0]);
      return h >= 0 && h < 12; 
    }).length;

    const insufficientCount = recentRecords.filter(r => {
        const sleepH = parseInt(r.sleepTime.split(':')[0]);
        const sleepM = parseInt(r.sleepTime.split(':')[1]);
        const wakeH = parseInt(r.wakeTime.split(':')[0]);
        const wakeM = parseInt(r.wakeTime.split(':')[1]);
        let start = sleepH * 60 + sleepM;
        let end = wakeH * 60 + wakeM;
        let durationMins = 0;
        if (start > end) durationMins = (1440 - start) + end;
        else durationMins = end - start;
        return durationMins < 420;
    }).length;

    const reasonCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {
      PSYCHOLOGICAL: 0, BEHAVIORAL: 0, PHYSIOLOGICAL: 0, EXTERNAL: 0
    };

    recentRecords.forEach(r => {
      r.reasons.forEach(rid => {
        reasonCounts[rid] = (reasonCounts[rid] || 0) + 1;
        const reasonDef = LATE_REASONS.find(lr => lr.id === rid);
        if (reasonDef) categoryCounts[reasonDef.category]++;
      });
    });

    const limit = days === 30 ? 10 : 5;
    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, count]) => {
        const def = LATE_REASONS.find(lr => lr.id === id);
        return { label: def?.label || id, count, category: def?.category };
      });

    const categoryMap: Record<string, string> = {
      PSYCHOLOGICAL: t.cat_psychological,
      BEHAVIORAL: t.cat_behavioral,
      PHYSIOLOGICAL: t.cat_physiological,
      EXTERNAL: t.cat_external
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
        setAnalysis(t.ai_not_enough_data);
        return;
    }
    setAnalysis('');
    setIsAnalyzing(true);
    try {
        // Translate reasons back to prompt understandable format? 
        // Actually the prompt needs raw reasons or translated? 
        // Let's pass the localized labels so the AI knows what's up in the current language context
        const reasonsText = stats.topReasons.map(r => (t as any)[r.label] || r.label);
        const result = await generateSleepAnalysis(stats, reasonsText, timeRange, apiKey, language);
        setAnalysis(result);
        saveAnalysis(result);
    } catch (e) {
        setAnalysis(t.ai_error);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
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

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const handleDayClick = (record: SleepRecord | undefined) => {
      if (record) { setSelectedRecord(record); setIsModalOpen(true); }
  };

  const renderCalendarGrid = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); 
    const slots = [];
    for (let i = 0; i < firstDayOfWeek; i++) slots.push({ empty: true, key: `empty-${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      slots.push({ empty: false, key: dateStr, dateStr, day: d });
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center text-xs text-stone-400 dark:text-stone-500 font-bold mb-1">{d}</div>
        ))}
        {slots.map((slot) => {
          if (slot.empty) return <div key={slot.key} className="aspect-square"></div>;
          const record = records.find(r => r.date === slot.dateStr);
          const colorClass = record ? getSleepQualityColor(record) : 'bg-stone-100 dark:bg-stone-700/50';
          return (
            <div key={slot.key} onClick={() => handleDayClick(record)}
              className={`aspect-square rounded-lg ${colorClass} flex items-center justify-center text-[10px] ${record ? 'text-white/90 font-bold' : 'text-stone-300 dark:text-stone-600'} cursor-pointer hover:scale-110 transition-transform relative group`}>
               {slot.day}
            </div>
          );
        })}
      </div>
    );
  };

  const COLORS = ['#fca5a5', '#fdba74', '#86efac', '#cbd5e1'];

  return (
    <div className="space-y-6 md:grid md:grid-cols-2 md:gap-6 md:space-y-0 items-start">
       {/* Details Modal */}
       {isModalOpen && selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-stone-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-scale-up">
                  <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 p-2 bg-stone-100 dark:bg-stone-700 rounded-full text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-600">
                      <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-6 flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-warm-500" /> {selectedRecord.date}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-blue-50 dark:bg-slate-800/50 p-3 rounded-2xl flex flex-col items-center justify-center">
                          <Moon className="w-6 h-6 text-blue-500 mb-1" />
                          <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{selectedRecord.sleepTime}</span>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-2xl flex flex-col items-center justify-center">
                          <Sun className="w-6 h-6 text-amber-500 mb-1" />
                          <span className="text-xl font-bold text-amber-700 dark:text-amber-300">{selectedRecord.wakeTime}</span>
                      </div>
                  </div>
                  {selectedRecord.reasons.length > 0 ? (
                      <div>
                          <h4 className="text-sm font-bold text-stone-500 dark:text-stone-400 mb-3">{t.top_reasons}</h4>
                          <div className="flex flex-wrap gap-2">
                              {selectedRecord.reasons.map((id, idx) => {
                                  const labelKey = LATE_REASONS.find(lr => lr.id === id)?.label;
                                  return (
                                  <span key={idx} className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 rounded-full text-sm font-medium border border-rose-100 dark:border-rose-900/30">
                                      {labelKey ? (t as any)[labelKey] : id}
                                  </span>
                              )})}
                          </div>
                      </div>
                  ) : <div className="text-center py-2 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">👏 {t.legend_perfect}</div>}
              </div>
          </div>
       )}

       {/* Key Configuration Modal */}
       {showKeyModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-fade-in">
               <div className="bg-white dark:bg-stone-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-scale-up">
                   <button onClick={() => setShowKeyModal(false)} className="absolute right-4 top-4 p-2 bg-stone-100 dark:bg-stone-700 rounded-full"><X className="w-4 h-4 text-stone-500" /></button>
                   <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-warm-500" /> {t.config_title_coach}</h3>
                   <p className="text-sm text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">{t.config_desc_coach}<br/><span className="text-xs opacity-70">{t.config_no_key_hint}</span></p>
                   <input type="password" value={tempKey} onChange={(e) => setTempKey(e.target.value)} placeholder={t.config_placeholder} className="w-full bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl p-3 mb-4 outline-none text-stone-700 dark:text-stone-200" />
                   <button onClick={saveApiKey} className="w-full bg-warm-500 hover:bg-warm-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">{t.config_save}</button>
                   <div className="mt-4 text-center"><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">{t.config_get_key}</a></div>
               </div>
           </div>
       )}

       {/* Heatmap Card (Left Column Desktop) */}
       <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 transition-colors h-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-warm-500" /> {t.stats_heatmap_title}
            </h2>
            <button onClick={() => setShowStandards(!showStandards)} className="text-xs text-stone-400 hover:text-warm-500 flex items-center gap-1">{t.stats_legend} {showStandards ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}</button>
          </div>
          {showStandards && (
            <div className="mb-4 bg-stone-50 dark:bg-stone-700/50 p-3 rounded-xl text-xs space-y-2 animate-fade-in border border-stone-100 dark:border-stone-700">
               {[
                   { color: 'bg-emerald-400', label: t.legend_perfect, desc: t.legend_perfect_desc },
                   { color: 'bg-yellow-400', label: t.legend_good, desc: t.legend_good_desc },
                   { color: 'bg-orange-400', label: t.legend_late, desc: t.legend_late_desc },
                   { color: 'bg-rose-400', label: t.legend_bad, desc: t.legend_bad_desc },
               ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${item.color} flex-shrink-0`}></div>
                    <span className="text-stone-600 dark:text-stone-300"><strong className="text-stone-800 dark:text-stone-200">{item.label}:</strong> {item.desc}</span>
                </div>
               ))}
            </div>
          )}
          <div className="flex items-center justify-between mb-4 bg-stone-50 dark:bg-stone-700/30 p-1.5 rounded-xl">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-white dark:hover:bg-stone-600 rounded-lg text-stone-500 dark:text-stone-400"><ChevronLeft className="w-5 h-5" /></button>
            <span className="text-sm font-bold text-stone-700 dark:text-stone-200">{viewDate.getFullYear()} - {viewDate.getMonth() + 1}</span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-white dark:hover:bg-stone-600 rounded-lg text-stone-500 dark:text-stone-400"><ChevronRight className="w-5 h-5" /></button>
          </div>
          {renderCalendarGrid()}
       </div>

       {/* Weekly Analysis (Right Column Desktop) */}
       <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 transition-colors h-full">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-warm-500" /> {timeRange === 7 ? t.stats_weekly : t.stats_monthly}</h2>
             <div className="bg-stone-100 dark:bg-stone-700 p-1 rounded-xl flex text-xs font-bold">
                 <button onClick={() => setTimeRange(7)} className={`px-3 py-1 rounded-lg transition-all ${timeRange === 7 ? 'bg-white dark:bg-stone-600 text-warm-600 dark:text-warm-400 shadow-sm' : 'text-stone-400'}`}>{t.label_days}</button>
                 <button onClick={() => setTimeRange(30)} className={`px-3 py-1 rounded-lg transition-all ${timeRange === 30 ? 'bg-white dark:bg-stone-600 text-warm-600 dark:text-warm-400 shadow-sm' : 'text-stone-400'}`}>{t.label_month}</button>
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-warm-50 dark:bg-warm-900/20 p-4 rounded-2xl flex flex-col justify-between">
                 <div><p className="text-sm text-warm-600 dark:text-warm-300 font-medium mb-1">{t.card_late_count}</p><p className="text-3xl font-bold text-warm-900 dark:text-warm-100">{stats.lateCount} <span className="text-sm font-normal text-warm-400">{t.unit_day}</span></p></div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl flex flex-col justify-between">
                 <div><p className="text-sm text-indigo-600 dark:text-indigo-300 font-medium mb-1">{t.card_sleep_debt}</p><p className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">{stats.insufficientCount} <span className="text-sm font-normal text-indigo-400">{t.unit_day}</span></p></div>
              </div>
          </div>

          {stats.topReasons.length > 0 && (
             <div className="mb-6">
                <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">{t.top_reasons} (TOP {timeRange === 30 ? 10 : 5})</h3>
                <div className="space-y-2">
                  {stats.topReasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-700 rounded-lg">
                       <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{(t as any)[reason.label] || reason.label}</span>
                       <span className="text-xs font-bold text-white bg-stone-400 dark:bg-stone-600 px-2 py-0.5 rounded-full">{reason.count}</span>
                    </div>
                  ))}
                </div>
             </div>
          )}

          {/* AI Analysis */}
          <div className="mt-8 pt-6 border-t border-dashed border-stone-200 dark:border-stone-700">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2"><Sparkles className="w-4 h-4" /> {t.ai_coach_title}</h3>
                 {!apiKey && <button onClick={() => setShowKeyModal(true)} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-lg">{t.ai_coach_config_btn}</button>}
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 border border-indigo-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                  {!isAnalyzing && analysis ? (
                      <div className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed animate-fade-in whitespace-pre-wrap">
                          {renderMarkdown(analysis)}
                          <div className="mt-3 flex justify-end"><button onClick={handleGenerateAnalysis} className="text-xs text-indigo-400 underline hover:text-indigo-500 transition-colors">{t.ai_refresh}</button></div>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center text-center py-2">
                          <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">{stats.totalTracked > 0 ? t.ai_placeholder : t.ai_not_enough_data}</p>
                          <button onClick={handleGenerateAnalysis} disabled={isAnalyzing || stats.totalTracked === 0} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold py-2 px-6 rounded-full shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {isAnalyzing ? t.ai_btn_generating : t.ai_btn_generate}
                          </button>
                      </div>
                  )}
              </div>
          </div>
       </div>
    </div>
  );
};

export default HeatmapStats;
