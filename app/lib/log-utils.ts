import type { Database } from '@/types/database';

type RiskLevel = Database['public']['Tables']['poop_logs']['Row']['risk_level'];
type ManualStatus = Database['public']['Tables']['poop_logs']['Row']['manual_status'];

export type LogTone = 'danger' | 'neutral' | 'success' | 'warning';

// ─── Manual Status ────────────────────────────────────────────────────────────

export function manualStatusLabel(status: ManualStatus): string {
  if (status === 'normal') return '正常';
  if (status === 'soft') return '偏軟';
  if (status === 'hard') return '偏硬';
  if (status === 'abnormal') return '異常';
  return '未知';
}

export function manualStatusEmoji(status: ManualStatus): string {
  if (status === 'normal') return '✅';
  if (status === 'soft') return '🟡';
  if (status === 'hard') return '🟤';
  if (status === 'abnormal') return '🚨';
  return '❓';
}

export function manualStatusBg(status: ManualStatus): string {
  if (status === 'normal') return '#d8f3e8';
  if (status === 'soft' || status === 'hard') return '#fef3c7';
  if (status === 'abnormal') return '#fde8e8';
  return '#e9efed';
}

// ─── Risk Level ───────────────────────────────────────────────────────────────

export function riskTitle(riskLevel: RiskLevel): string {
  if (riskLevel === 'normal') return '狀況正常';
  if (riskLevel === 'observe') return '需要觀察';
  if (riskLevel === 'vet') return '建議就醫';
  return '分析完成';
}

export function riskIcon(riskLevel: RiskLevel): string {
  if (riskLevel === 'normal') return '✅';
  if (riskLevel === 'observe') return '⚠️';
  if (riskLevel === 'vet') return '🏥';
  return '📋';
}

export function riskBannerStyle(riskLevel: RiskLevel): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} {
  if (riskLevel === 'normal') return { backgroundColor: '#d8f3e8', borderColor: '#6ee7b7', textColor: '#065f46' };
  if (riskLevel === 'observe') return { backgroundColor: '#fef3c7', borderColor: '#fcd34d', textColor: '#92400e' };
  if (riskLevel === 'vet') return { backgroundColor: '#fde8e8', borderColor: '#fca5a5', textColor: '#9a3412' };
  return { backgroundColor: '#e9efed', borderColor: '#bbc9c7', textColor: '#3c4948' };
}

// ─── Log Status (unified for both entry modes) ────────────────────────────────

type LogLike = {
  entryMode: 'quick_log' | 'photo_ai';
  manualStatus: ManualStatus;
  riskLevel: RiskLevel;
  status: string;
};

export function logStatusLabel(log: LogLike): string {
  if (log.entryMode === 'quick_log') return manualStatusLabel(log.manualStatus);
  if (log.status !== 'done') return '分析中';
  if (log.riskLevel === 'normal') return '正常';
  if (log.riskLevel === 'observe') return '觀察';
  if (log.riskLevel === 'vet') return '就醫';
  return '已記錄';
}

export function logStatusTone(log: LogLike): LogTone {
  if (log.entryMode === 'quick_log') {
    if (log.manualStatus === 'normal') return 'success';
    if (log.manualStatus === 'abnormal') return 'danger';
    if (log.manualStatus === 'soft' || log.manualStatus === 'hard') return 'warning';
    return 'neutral';
  }
  if (log.riskLevel === 'normal') return 'success';
  if (log.riskLevel === 'observe') return 'warning';
  if (log.riskLevel === 'vet') return 'danger';
  return 'neutral';
}

// ─── Tone border ──────────────────────────────────────────────────────────────

export function toneBorderColor(tone: LogTone): string {
  if (tone === 'success') return '#6ee7b7';
  if (tone === 'warning') return '#fcd34d';
  if (tone === 'danger') return '#fca5a5';
  return '#bbc9c7';
}
