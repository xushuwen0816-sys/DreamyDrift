
import React, { useState, useEffect } from 'react';
import { SleepRecord } from '../types';
import { LATE_REASONS } from '../constants';
import { addSleepRecord, getData } from '../services/storageService';
import { Calendar, Moon, Sun, Save } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  onSave: () => void;
}

const SleepRecorder: React.FC<Props> = ({ onSave }) => {
  const { t, language } = useLanguage();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sleepTime, setSleepTime] = useState('23:30');
  const [wakeTime, setWakeTime] = useState('07:30');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  
  const [isLate, setIsLate] = useState(false);
  const [durationStr, setDurationStr] = useState('');

  // Load existing data
  useEffect(() => {
    const data = getData();
    const existingRecord = data.sleepRecords.find(r => r.date === date);
    if (existingRecord) {
      setSleepTime(existingRecord.sleepTime);
      setWakeTime(existingRecord.wakeTime);
      setSelectedReasons(existingRecord.reasons || []);
    } else {
      setSleepTime('23:30');
      setWakeTime('07:30');
      setSelectedReasons([]);
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
    setDurationStr(`${hours}h ${mins}m`);
  }, [sleepTime, wakeTime]);

  const toggleReason = (id: string) => {
    setSelectedReasons(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    const record: SleepRecord = {
      date,
      sleepTime,
      wakeTime,
      reasons: isLate ? selectedReasons : [],
    };
    addSleepRecord(record);
    onSave();
  };

  const categories = [
    { key: 'PSYCHOLOGICAL', label: t.cat_psychological },
    { key: 'BEHAVIORAL', label: t.cat_behavioral },
    { key: 'PHYSIOLOGICAL', label: t.cat_physiological },
    { key: 'EXTERNAL', label: t.cat_external }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-stone-800 p-5 sm:p-8 rounded-3xl shadow-sm border border-warm-100 dark:border-stone-700 transition-colors">
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-6 flex items-center gap-2">
          <Moon className="w-6 h-6 text-warm-500" />
          {t.recorder_title}
        </h2>

        {/* Responsive Grid for Desktop */}
        <div className="md:grid md:grid-cols-2 md:gap-8">
          {/* Left Column: Date */}
          <div className="mb-6 md:mb-0">
            <label className="block text-sm font-medium text-stone-500 dark:text-stone-400 mb-2">{t.record_date_label}</label>
            <div className="relative">
               <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-stone-50 dark:bg-stone-700 rounded-xl border-none focus:ring-2 focus:ring-warm-200 outline-none text-stone-700 dark:text-stone-200 font-bold text-lg appearance-none"
              />
              <Calendar className="absolute left-4 top-4 w-5 h-5 text-stone-400 pointer-events-none" />
            </div>
          </div>

          {/* Right Column: Times */}
          <div className="grid grid-cols-1 gap-4">
             <div className="bg-warm-50 dark:bg-warm-900/20 p-4 rounded-2xl relative overflow-hidden">
                <label className="flex items-center gap-2 text-warm-900 dark:text-warm-200 font-medium mb-2">
                  <Moon className="w-4 h-4" /> {t.sleep_time}
                </label>
                <input 
                  type="time" 
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                  className="w-full min-w-0 bg-transparent p-2 text-lg sm:text-xl text-center font-bold text-warm-600 dark:text-warm-300 focus:outline-none appearance-none"
                />
                {isLate && (
                  <div className="absolute top-2 right-2 text-[10px] font-bold text-rose-500 bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 rounded-full">
                    {t.late_alert}
                  </div>
                )}
             </div>

             <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl">
                <label className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-medium mb-2">
                  <Sun className="w-4 h-4" /> {t.wake_time}
                </label>
                <input 
                  type="time" 
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full min-w-0 bg-transparent p-2 text-lg sm:text-xl text-center font-bold text-amber-600 dark:text-amber-400 focus:outline-none appearance-none"
                />
             </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-stone-50 dark:bg-stone-700 rounded-xl flex justify-between items-center">
          <span className="text-stone-500 dark:text-stone-300 font-medium">{t.total_duration}</span>
          <span className="text-xl font-bold text-stone-800 dark:text-stone-100">{durationStr}</span>
        </div>
      </div>

      {isLate && (
        <div className="bg-white dark:bg-stone-800 p-5 sm:p-8 rounded-3xl shadow-sm border border-warm-100 dark:border-stone-700 animate-fade-in">
          <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-2">{t.why_late}</h3>
          <p className="text-stone-500 dark:text-stone-400 text-sm mb-6">{t.be_honest}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map(cat => (
              <div key={cat.key}>
                <h4 className="text-xs font-bold text-stone-400 dark:text-stone-500 mb-3 uppercase tracking-wider">{cat.label}</h4>
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
                      {/* Look up translation dynamically */}
                      {(t as any)[reason.label] || reason.label}
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
        {t.save_btn}
      </button>
    </div>
  );
};

export default SleepRecorder;
