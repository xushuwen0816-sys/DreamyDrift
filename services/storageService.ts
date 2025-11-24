import { AppData, SleepRecord, DailyChecklistLog, DumpEntry } from '../types';

const STORAGE_KEY = 'dreamy_drift_data_v1';

const DEFAULT_DATA: AppData = {
  sleepRecords: [],
  checklistLogs: {},
  dumpEntries: [],
  lastDumpDate: new Date().toISOString().split('T')[0],
  latestAnalysis: undefined,
};

export const getData = (): AppData => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return { ...DEFAULT_DATA, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Failed to parse local storage', e);
  }
  return DEFAULT_DATA;
};

export const saveData = (data: AppData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
};

export const addSleepRecord = (record: SleepRecord) => {
  const data = getData();
  // Remove existing record for the same date if any
  const filtered = data.sleepRecords.filter(r => r.date !== record.date);
  filtered.push(record);
  // Sort by date desc
  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const newData = { ...data, sleepRecords: filtered };
  saveData(newData);
  return newData;
};

export const toggleChecklistItem = (date: string, itemId: string) => {
  const data = getData();
  const currentList = data.checklistLogs[date] || [];
  let newList: string[];
  
  if (currentList.includes(itemId)) {
    newList = currentList.filter(id => id !== itemId);
  } else {
    newList = [...currentList, itemId];
  }
  
  const newData = {
    ...data,
    checklistLogs: {
      ...data.checklistLogs,
      [date]: newList,
    },
  };
  saveData(newData);
  return newData;
};

export const addDumpEntry = (entry: DumpEntry) => {
  const data = getData();
  const today = new Date().toISOString().split('T')[0];
  
  // Check if we need to clear old entries (if last dump date is not today)
  let currentEntries = data.dumpEntries;
  if (data.lastDumpDate !== today) {
    currentEntries = [];
  }

  const newData = {
    ...data,
    dumpEntries: [entry, ...currentEntries], // Newest first
    lastDumpDate: today,
  };
  saveData(newData);
  return newData;
};

export const clearDumpEntries = () => {
    const data = getData();
    const newData = { ...data, dumpEntries: [] };
    saveData(newData);
    return newData;
};

export const saveAnalysis = (text: string) => {
  const data = getData();
  const newData = {
    ...data,
    latestAnalysis: {
      text,
      timestamp: Date.now(),
    }
  };
  saveData(newData);
  return newData;
};