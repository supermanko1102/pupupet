// Re-export everything from the split hooks/logs/ modules.
// All existing imports of '@/hooks/use-poop-logs' continue to work unchanged.

export type { HistoryLog, LogSignal, RiskLevel } from './logs/shared';

export { useRecentLogs } from './logs/use-recent-logs';
export type { RecentLog } from './logs/use-recent-logs';

export { useHistoryLogs, useHistoryLogsForDate } from './logs/use-history-logs';

export { usePoopLog } from './logs/use-poop-log';

export { useStats } from './logs/use-stats';

export { useTrendSummary } from './logs/use-trend-summary';
