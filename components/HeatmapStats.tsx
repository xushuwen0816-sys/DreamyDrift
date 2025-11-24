
import React, { useState, useEffect } from 'react';
import { getData } from '../services/storageService';
import { SleepRecord } from '../types';
import { LATE_REASONS } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Calendar, TrendingUp, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Sparkles, BatteryWarning, CheckCircle2, AlertCircle } from 'lucide-react';

const HeatmapStats: React.FC = () => {
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [showStandards, setShowStandards] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); // Tracks the currently viewed month
  
  useEffect(() => {
    const data = getData();
    setRecords(data.sleepRecords);
  }, []);

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

  // Weekly Stats (Always calculates based on the most recent 7 records found, regardless of view month)
  const calculateWeeklyStats = () => {
    // Sort records by date descending just to be safe, though storage usually does this
    const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentRecords = sorted.slice(0, 7);
    
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
        // If wake time is technically smaller (next day) but calculation logic assumes sequential
        // Logic fix: if start > end, it means we crossed midnight.
        // e.g. Sleep 23:00 (1380), Wake 07:00 (420). 
        // We need duration. (1440 - 1380) + 420 = 480.
        
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

    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
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

  const stats = calculateWeeklyStats();

  // --- Calendar Navigation ---
  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const renderCalendarGrid = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

    const slots = [];
    // Empty slots for start offset
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
              className={`aspect-square rounded-lg ${colorClass} flex items-center justify-center text-[10px] ${record ? 'text-white/90 font-bold' : 'text-stone-300 dark:text-stone-600'} cursor-pointer hover:scale-110 transition-transform relative group`}
            >
               {slot.day}
               {record && (
                 <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                    {record.sleepTime} 入睡
                 </div>
               )}
            </div>
          );
        })}
      </div>
    );
  };

  const COLORS = ['#fca5a5', '#fdba74', '#86efac', '#cbd5e1'];

  return (
    <div className="space-y-6 pb-20">
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

       {/* Weekly Analysis (Always recent) */}
       <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 transition-colors">
          <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-warm-500" />
            近7天复盘
          </h2>
          
          <div className="flex items-center justify-between mb-6 bg-warm-50 dark:bg-warm-900/20 p-4 rounded-2xl">
             <div>
                <p className="text-sm text-warm-600 dark:text-warm-300 font-medium">熬夜次数</p>
                <p className="text-3xl font-bold text-warm-900 dark:text-warm-100">{stats.lateCount} <span className="text-sm font-normal text-warm-400">/ {stats.totalTracked}天</span></p>
             </div>
             <div className="text-2xl">
                {stats.lateCount === 0 ? '🎉' : stats.lateCount < 3 ? '👌' : '🐼'}
             </div>
          </div>

          {stats.topReasons.length > 0 && (
             <div className="mb-6">
                <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">熬夜主因</h3>
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

          {/* New Section: Insufficient Sleep Analysis */}
          <div className="mb-6 pt-6 border-t border-dashed border-stone-100 dark:border-stone-700">
             <div className="flex justify-between items-center mb-3">
                 <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">睡眠余额 (<span className="text-xs">不足7h</span>)</h3>
                 <span className={`text-sm font-bold px-2 py-0.5 rounded-md ${
                     stats.insufficientCount > 3 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300' :
                     stats.insufficientCount > 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' :
                     'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                 }`}>
                     {stats.insufficientCount} 次
                 </span>
             </div>

             {stats.insufficientCount > 3 ? (
                 <div className="bg-rose-50 dark:bg-rose-900/10 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 flex gap-3 items-start">
                     <BatteryWarning className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                     <div>
                         <p className="text-xs font-bold text-rose-700 dark:text-rose-300 mb-1">睡眠债正在累积！</p>
                         <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
                             大脑好像有点“断片”了？本周缺觉较多，建议利用午休补觉15-20分钟，或者今晚提前一小时关机上床。
                         </p>
                     </div>
                 </div>
             ) : stats.insufficientCount > 0 ? (
                 <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-3 items-start">
                     <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                     <div>
                         <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">电量轻微不足</p>
                         <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                             虽然还能撑住，但要注意别让身体透支哦。周末记得稍微多睡一会儿。
                         </p>
                     </div>
                 </div>
             ) : stats.totalTracked > 0 ? (
                 <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex gap-3 items-start">
                     <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                     <div>
                         <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">元气满满！</p>
                         <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">
                             你的睡眠时长非常健康，大脑得到了充分的充电，继续保持！
                         </p>
                     </div>
                 </div>
             ) : null}
          </div>
          
          {stats.totalTracked === 0 && (
              <div className="text-center py-8 text-stone-400 text-sm">
                  暂无足够数据
              </div>
          )}
       </div>
    </div>
  );
};

export default HeatmapStats;
