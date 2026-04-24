// Re-export everything from the split hooks/logs/ modules.
// All existing imports of '@/hooks/use-poop-logs' continue to work unchanged.

export { POOP_LOGS_KEY, HISTORY_PAGE_SIZE } from './logs/shared';
export type { HistoryLog, RiskLevel, ManualStatus } from './logs/shared';

export { useRecentLogs } from './logs/use-recent-logs';
export type { RecentLog } from './logs/use-recent-logs';

export { useHistoryLogs } from './logs/use-history-logs';

export { usePoopLog } from './logs/use-poop-log';

export { useQuickLog } from './logs/use-quick-log';
export type { QuickLogInput } from './logs/use-quick-log';

export { useStats } from './logs/use-stats';
export type { StatsData } from './logs/use-stats';

export { useTrendSummary } from './logs/use-trend-summary';
export type { TrendSummary } from './logs/use-trend-summary';
