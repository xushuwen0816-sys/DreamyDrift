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

  useEffect(() => {
    // Range changed, user likely wants new context, but we don't auto-clear persisted data 
    // until they manually regenerate to keep "24h persistence" rule valid unless overwritten.
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
    // The slice method handles cases where there are fewer items than the limit automatically.
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

    // Explicitly clear previous analysis to force UI to "Loading" state immediately
    setAnalysis('');
    setIsAnalyzing(true);
    
    try {
        const reasonsText = stats.topReasons.map(r => r.label);
        const result = await generateSleepAnalysis(stats, reasonsText, timeRange, apiKey);
        setAnalysis(result);
        saveAnalysis(result); // Persist the result
    } catch (e) {
        