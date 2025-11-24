import { ChecklistItem, LateReason } from './types';

export const LATE_REASONS: LateReason[] = [
  // Psychological
  { id: 'psy_revenge', label: '报复性熬夜', category: 'PSYCHOLOGICAL' },
  { id: 'psy_mood', label: '心情emo', category: 'PSYCHOLOGICAL' },
  { id: 'psy_escape', label: '逃避明天', category: 'PSYCHOLOGICAL' },
  { id: 'psy_stress', label: '压力山大', category: 'PSYCHOLOGICAL' },
  // Behavioral
  { id: 'beh_shower', label: '洗澡拖延', category: 'BEHAVIORAL' },
  { id: 'beh_phone', label: '刷手机/短视频', category: 'BEHAVIORAL' },
  { id: 'beh_binge', label: '追剧/看番', category: 'BEHAVIORAL' },
  { id: 'beh_game', label: '打游戏', category: 'BEHAVIORAL' },
  { id: 'beh_chat', label: '聊天/吃瓜', category: 'BEHAVIORAL' },
  { id: 'beh_work', label: '加班/补作业', category: 'BEHAVIORAL' },
  { id: 'beh_zone', label: '单纯发呆', category: 'BEHAVIORAL' },
  // Physiological
  { id: 'phy_self', label: '手冲/施法', category: 'PHYSIOLOGICAL' },
  { id: 'phy_caffeine', label: '咖啡/茶喝晚了', category: 'PHYSIOLOGICAL' },
  { id: 'phy_hunger', label: '太饿/太撑', category: 'PHYSIOLOGICAL' },
  { id: 'phy_excited', label: '大脑太兴奋', category: 'PHYSIOLOGICAL' },
  // External
  { id: 'ext_social', label: '社交局/应酬', category: 'EXTERNAL' },
  { id: 'ext_other', label: '被别人耽误', category: 'EXTERNAL' },
];

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'sun', text: '今天晒了太阳', category: 'PHYSIOLOGICAL' },
  { id: 'no_caffeine', text: '下午3点后未摄入咖啡因', category: 'PHYSIOLOGICAL' },
  { id: 'dim_lights', text: '提前调暗了灯光', category: 'PHYSIOLOGICAL' },
  { id: 'shower', text: '22:00 前洗完澡', category: 'BEHAVIORAL' },
  { id: 'bed_early', text: '23:00 前躺在床上', category: 'BEHAVIORAL' },
  { id: 'no_stim', text: '睡前未看刺激性内容', category: 'BEHAVIORAL' },
  { id: 'calm_mind', text: '没有带情绪上床', category: 'PSYCHOLOGICAL' },
  { id: 'relax', text: '进行了简单的放松/冥想', category: 'PSYCHOLOGICAL' },
];

export const REASON_COLORS = {
  PSYCHOLOGICAL: '#fca5a5', // red-300
  BEHAVIORAL: '#fdba74', // orange-300 (Warm change)
  PHYSIOLOGICAL: '#86efac', // green-300
  EXTERNAL: '#cbd5e1', // slate-300 (Neutral)
};