import React, { useState, useEffect } from 'react';
import { SleepRecord } from '../types';
import { LATE_REASONS } from '../constants';
import { addSleepRecord, getData } from '../services/storageService';
import { Calendar, Moon, Sun, Clock, Save } from 'lucide-react';

interface Props {
  onSave: () => void;
}

const SleepRecorder: React.FC<Props> = ({ onSave }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bedTime, setBedTime] = useState('23:00');
  const [sleepTime, setSleepTime] = useState('23:30');
  const [wakeTime, setWakeTime] = useState('07:30');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  
  const [isLate, setIsLate] = useState(false);
  const [durationStr, setDurationStr] = useState('');

  // Load existing data for the selected date to prevent resetting to defaults
  useEffect(() => {
    const data = getData();
    const existingRecord = data.sleepRecords.find(r => r.date === date);
    if (existingRecord) {
      setBedTime(existingRecord.bedTime);
      setSleepTime(existingRecord.sleepTime);
      setWakeTime(existingRecord.wakeTime);
      if (existingRecord.reasons) {
        setSelectedReasons(existingRecord.reasons);
      }
    }
  }, [date]);

  useEffect(() => {
    const getMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const sleepMins = getMinutes(sleepTime);
    const wakeMins = getMinutes(wakeTime);

    const sleepH = parseInt(sleepTime.split(':')[0]);
    // Consider 00:00 to 12:00 as "Late" (Crossed midnight, essentially "next day")
    const isTechnicallyLate = sleepH >= 0 && sleepH < 12;
    setIsLate(isTechnicallyLate);

    let start = sleepMins;
    let end = wakeMins;

    let durationMins = 0;
    if (start > end) {
       durationMins = (1440 - start) + end;
    } else {
       durationMins = end - start;
    }
    
    const hours = Math.floor(durationMins / 60);
    const mins = durationMins % 60;
    setDurationStr(`${hours}小时 ${mins}分`);

  }, [sleepTime, wakeTime]);

  const toggleReason = (id: string) => {
    setSelectedReasons(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    const record: SleepRecord = {
      date,
      bedTime,
      sleepTime,
      wakeTime,
      reasons: isLate ? selectedReasons : [],
    };
    addSleepRecord(record);
    onSave();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-stone-800 p-5 sm:p-6 rounded-3xl shadow-sm border border-warm-100 dark:border-stone-700 transition-colors">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
          <Moon className="w-6 h-6 text-warm-500" />
          睡眠日记
        </h2>

        {/* Date Picker */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-stone-500 dark:text-stone-400 mb-1">记录哪一晚？</label>
          <div className="relative">
             <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              // Modified: pl-12 for icon space, pr-4 to avoid native indicator overlap issues if any
              className="w-full pl-12 pr-4 py-3 bg-stone-50 dark:bg-stone-700 rounded-xl border-none focus:ring-2 focus:ring-warm-200 outline-none text-stone-700 dark:text-stone-200 font-semibold appearance-none"
            />
            {/* Modified: Moved icon to left (left-4) */}
            <Calendar className="absolute left-4 top-3.5 w-5 h-5 text-stone-400 pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
           {/* Bed Time */}
           <div className="bg-blue-50 dark:bg-slate-800/50 p-4 rounded-2xl">
              <label className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-medium mb-2">
                <Moon className="w-4 h-4" /> 上床躺平
              </label>
              <input 
                type="time" 
                value={bedTime}
                onChange={(e) => setBedTime(e.target.value)}
                // Modified: min-w-0, max-w-full, text-lg
                className="w-full min-w-0 max-w-full bg-white dark:bg-slate-700 p-2 rounded-lg text-lg sm:text-xl text-center font-bold text-blue-600 dark:text-blue-300 focus:outline-none appearance-none"
              />
           </div>

           {/* Sleep Time */}
           <div className="bg-warm-50 dark:bg-stone-700/50 p-4 rounded-2xl relative overflow-hidden">
              <label className="flex items-center gap-2 text-warm-900 dark:text-warm-100 font-medium mb-2">
                <Clock className="w-4 h-4" /> 真正睡着
              </label>
              <input 
                type="time" 
                value={sleepTime}
                onChange={(e) => setSleepTime(e.target.value)}
                // Modified: min-w-0, max-w-full, text-lg
                className="w-full min-w-0 max-w-full bg-white dark:bg-stone-700 p-2 rounded-lg text-lg sm:text-xl text-center font-bold text-warm-600 dark:text-warm-300 focus:outline-none appearance-none"
              />
              {isLate && (
                <div className="mt-2 text-center text-xs font-bold text-rose-500 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300 py-1 px-2 rounded-full inline-block">
                  熬夜啦🌙
                </div>
              )}
           </div>

           {/* Wake Time */}
           <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl">
              <label className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-medium mb-2">
                <Sun className="w-4 h-4" /> 起床时间
              </label>
              <input 
                type="time" 
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                // Modified: min-w-0, max-w-full, text-lg
                className="w-full min-w-0 max-w-full bg-white dark:bg-amber-900/40 p-2 rounded-lg text-lg sm:text-xl text-center font-bold text-amber-600 dark:text-amber-400 focus:outline-none appearance-none"
              />
           </div>
        </div>

        {/* Result Preview */}
        <div className="mt-6 p-4 bg-stone-50 dark:bg-stone-700 rounded-xl flex justify-between items-center">
          <span className="text-stone-500 dark:text-stone-300 font-medium">总睡眠时长</span>
          <span className="text-2xl font-bold text-stone-800 dark:text-stone-100">{durationStr}</span>
        </div>
      </div>

      {/* Late Reasons Section */}
      {isLate && (
        <div className="bg-white dark:bg-stone-800 p-5 sm:p-6 rounded-3xl shadow-sm border border-warm-100 dark:border-stone-700 animate-fade-in">
          <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-2">为什么这么晚？🥺</h3>
          <p className="text-stone-500 dark:text-stone-400 text-sm mb-4">诚实记录，才能更好地调整哦。</p>
          
          <div className="space-y-4">
            {[
              { key: 'PSYCHOLOGICAL', label: '心理因素' },
              { key: 'BEHAVIORAL', label: '行为习惯' },
              { key: 'PHYSIOLOGICAL', label: '生理原因' },
              { key: 'EXTERNAL', label: '外部干扰' }
            ].map(cat => (
              <div key={cat.key}>
                <h4 className="text-xs font-bold text-stone-400 dark:text-stone-500 mb-2">{cat.label}</h4>
                <div className="flex flex-wrap gap-2">
                  {LATE_REASONS.filter(r => r.category === cat.key).map(reason => (
                    <button
                      key={reason.id}
                      onClick={() => toggleReason(reason.id)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all border ${
                        selectedReasons.includes(reason.id)
                          ? 'bg-warm-500 text-white border-warm-500 shadow-md scale-105'
                          : 'bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-600 hover:border-warm-300'
                      }`}
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={handleSave}
        className="w-full bg-warm-500 hover:bg-warm-600 dark:bg-warm-600 dark:hover:bg-warm-500 text-white font-bold py-4 rounded-2xl shadow-md active:scale-95 transition-all flex justify-center items-center gap-2 text-lg"
      >
        <Save className="w-5 h-5" />
        保存记录
      </button>
    </div>
  );
};

export default SleepRecorder;