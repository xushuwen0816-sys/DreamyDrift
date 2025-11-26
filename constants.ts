
import { ChecklistItem, LateReason } from './types';

// Labels correspond to keys in translations.ts
export const LATE_REASONS: LateReason[] = [
  // Psychological
  { id: 'psy_revenge', label: 'reason_psy_revenge', category: 'PSYCHOLOGICAL' },
  { id: 'psy_mood', label: 'reason_psy_mood', category: 'PSYCHOLOGICAL' },
  { id: 'psy_escape', label: 'reason_psy_escape', category: 'PSYCHOLOGICAL' },
  { id: 'psy_stress', label: 'reason_psy_stress', category: 'PSYCHOLOGICAL' },
  // Behavioral
  { id: 'beh_shower', label: 'reason_beh_shower', category: 'BEHAVIORAL' },
  { id: 'beh_phone', label: 'reason_beh_phone', category: 'BEHAVIORAL' },
  { id: 'beh_binge', label: 'reason_beh_binge', category: 'BEHAVIORAL' },
  { id: 'beh_game', label: 'reason_beh_game', category: 'BEHAVIORAL' },
  { id: 'beh_chat', label: 'reason_beh_chat', category: 'BEHAVIORAL' },
  { id: 'beh_work', label: 'reason_beh_work', category: 'BEHAVIORAL' },
  { id: 'beh_learn', label: 'reason_beh_learn', category: 'BEHAVIORAL' },
  { id: 'beh_explore', label: 'reason_beh_explore', category: 'BEHAVIORAL' },
  { id: 'beh_zone', label: 'reason_beh_zone', category: 'BEHAVIORAL' },
  // Physiological
  { id: 'phy_self', label: 'reason_phy_self', category: 'PHYSIOLOGICAL' },
  { id: 'phy_caffeine', label: 'reason_phy_caffeine', category: 'PHYSIOLOGICAL' },
  { id: 'phy_hunger', label: 'reason_phy_hunger', category: 'PHYSIOLOGICAL' },
  { id: 'phy_excited', label: 'reason_phy_excited', category: 'PHYSIOLOGICAL' },
  // External
  { id: 'ext_social', label: 'reason_ext_social', category: 'EXTERNAL' },
  { id: 'ext_other', label: 'reason_ext_other', category: 'EXTERNAL' },
];

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'sun', text: 'check_sun', category: 'PHYSIOLOGICAL' },
  { id: 'no_caffeine', text: 'check_no_caffeine', category: 'PHYSIOLOGICAL' },
  { id: 'dim_lights', text: 'check_dim_lights', category: 'PHYSIOLOGICAL' },
  { id: 'shower', text: 'check_shower', category: 'BEHAVIORAL' },
  { id: 'bed_early', text: 'check_bed_early', category: 'BEHAVIORAL' },
  { id: 'no_stim', text: 'check_no_stim', category: 'BEHAVIORAL' },
  { id: 'calm_mind', text: 'check_calm_mind', category: 'PSYCHOLOGICAL' },
  { id: 'relax', text: 'check_relax', category: 'PSYCHOLOGICAL' },
];

export const REASON_COLORS = {
  PSYCHOLOGICAL: '#fca5a5', // red-300
  BEHAVIORAL: '#fdba74', // orange-300 (Warm change)
  PHYSIOLOGICAL: '#86efac', // green-300
  EXTERNAL: '#cbd5e1', // slate-300 (Neutral)
};
