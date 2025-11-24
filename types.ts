export enum Tab {
  RECORD = 'RECORD',
  CHECKLIST = 'CHECKLIST',
  STATS = 'STATS',
  DUMP = 'DUMP',
}

export type ReasonCategory = 'PSYCHOLOGICAL' | 'BEHAVIORAL' | 'PHYSIOLOGICAL' | 'EXTERNAL';

export interface LateReason {
  id: string;
  label: string;
  category: ReasonCategory;
}

export interface SleepRecord {
  date: string; // YYYY-MM-DD (The "Night of")
  bedTime: string; // HH:mm
  sleepTime: string; // HH:mm (The time actually fell asleep)
  wakeTime: string; // HH:mm (Next morning)
  reasons: string[]; // Array of Reason IDs
}

export interface ChecklistItem {
  id: string;
  text: string;
  category: 'PHYSIOLOGICAL' | 'BEHAVIORAL' | 'PSYCHOLOGICAL';
}

export interface DumpEntry {
  id: string;
  text: string;
  timestamp: number;
  aiResponse?: string;
}

export interface DailyChecklistLog {
  [date: string]: string[]; // Date -> Array of completed Item IDs
}

export interface AppData {
  sleepRecords: SleepRecord[];
  checklistLogs: DailyChecklistLog;
  dumpEntries: DumpEntry[];
  lastDumpDate: string;
}