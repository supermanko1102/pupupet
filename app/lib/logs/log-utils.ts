import { Brand, StatusColors } from '@/constants/theme';

export type LogTone = 'neutral' | 'success' | 'warning';

type LogLike = {
  failureReason?: string | null;
  status: string;
};

export function logStatusLabel(log: LogLike): string {
  if (log.status === 'failed') return '無法分析';
  if (log.status !== 'done') return '分析中';
  return '已分析';
}

export function logStatusTone(log: LogLike): LogTone {
  if (log.status === 'done') return 'success';
  if (log.status === 'failed' && log.failureReason === 'system_error') return 'warning';
  return 'neutral';
}

export function toneBorderColor(tone: LogTone): string {
  if (tone === 'success') return Brand.primary;
  if (tone === 'warning') return StatusColors.observe.border;
  return StatusColors.neutral.border;
}
