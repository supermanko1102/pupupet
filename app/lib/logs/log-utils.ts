import { StatusColors } from '@/constants/theme';
import type { Database } from '@/types/database';

type RiskLevel = Database['public']['Tables']['poop_logs']['Row']['risk_level'];

export type LogTone = 'danger' | 'neutral' | 'success' | 'warning';

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
  const c = riskLevel === 'normal'
    ? StatusColors.normal
    : riskLevel === 'observe'
    ? StatusColors.observe
    : riskLevel === 'vet'
    ? StatusColors.vet
    : StatusColors.neutral;
  return { backgroundColor: c.bg, borderColor: c.border, textColor: c.text };
}

// ─── Log Status ───────────────────────────────────────────────────────────────

type LogLike = {
  riskLevel: RiskLevel;
  status: string;
};

export function logStatusLabel(log: LogLike): string {
  if (log.status !== 'done') return '分析中';
  if (log.riskLevel === 'normal') return '正常';
  if (log.riskLevel === 'observe') return '觀察';
  if (log.riskLevel === 'vet') return '就醫';
  return '已記錄';
}

export function logStatusTone(log: LogLike): LogTone {
  if (log.riskLevel === 'normal') return 'success';
  if (log.riskLevel === 'observe') return 'warning';
  if (log.riskLevel === 'vet') return 'danger';
  return 'neutral';
}

// ─── Tone border ──────────────────────────────────────────────────────────────

export function toneBorderColor(tone: LogTone): string {
  if (tone === 'success') return StatusColors.normal.border;
  if (tone === 'warning') return StatusColors.observe.border;
  if (tone === 'danger') return StatusColors.vet.border;
  return StatusColors.neutral.border;
}
