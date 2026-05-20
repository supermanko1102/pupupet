import type { HistoryLog, LogSignal } from '@/hooks/use-poop-logs';

export type RangeKey = '7d' | '30d';

type Section = {
  data: HistoryLog[];
  title: string;
};

export type DayMetric = {
  count: number;
  dateKey: string;
  dayNumber: number;
  hasWatchItems: boolean;
  isFuture: boolean;
  isToday: boolean;
  watchItemCount: number;
  weekday: string;
};

export type RangeSummary = {
  streakDays: number;
  totalCount: number;
  watchItemCount: number;
};

export type TrendSummaryLike = {
  hasWatchItems: boolean;
  message: string;
  recentCount: number;
} | null | undefined;

export const RANGE_OPTIONS: { key: RangeKey; label: string; days: number }[] = [
  { key: '7d', label: '7 天', days: 7 },
  { key: '30d', label: '30 天', days: 30 },
];

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export function buildSections(logs: HistoryLog[], selectedDate?: string | null): Section[] {
  if (selectedDate) {
    return logs.length > 0
      ? [{ title: `${formatDateKeyLabel(selectedDate)} ・ ${logs.length} 筆`, data: logs }]
      : [];
  }

  const now = new Date();
  const todayStart = dateKeyToLocalDate(toDateKey(now));
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const today: HistoryLog[] = [];
  const thisWeek: HistoryLog[] = [];
  const earlier: HistoryLog[] = [];

  for (const log of logs) {
    const d = new Date(log.capturedAt);
    if (d >= todayStart) today.push(log);
    else if (d >= weekStart) thisWeek.push(log);
    else earlier.push(log);
  }

  const sections: Section[] = [];
  if (today.length > 0) sections.push({ title: '今天', data: today });
  if (thisWeek.length > 0) sections.push({ title: '本週', data: thisWeek });
  if (earlier.length > 0) sections.push({ title: '更早', data: earlier });
  return sections;
}

export function buildRecentDays(rows: LogSignal[], dayCount: number): DayMetric[] {
  const metrics = buildDailyMetricMap(rows);
  const days: DayMetric[] = [];
  const today = new Date();

  for (let index = dayCount - 1; index >= 0; index--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - index);
    const dateKey = toDateKey(date);
    const metric = metrics.get(dateKey);

    days.push({
      count: metric?.count ?? 0,
      dateKey,
      dayNumber: date.getDate(),
      hasWatchItems: (metric?.watchItemCount ?? 0) > 0,
      isFuture: false,
      isToday: dateKey === toDateKey(today),
      watchItemCount: metric?.watchItemCount ?? 0,
      weekday: WEEKDAY_LABELS[date.getDay()],
    });
  }

  return days;
}

export function buildCurrentMonthDays(rows: LogSignal[]): DayMetric[] {
  const metrics = buildDailyMetricMap(rows);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  const todayKey = toDateKey(today);
  const days: DayMetric[] = [];

  for (let dayNumber = 1; dayNumber <= lastDay.getDate(); dayNumber++) {
    const date = new Date(year, month, dayNumber);
    const dateKey = toDateKey(date);
    const metric = metrics.get(dateKey);

    days.push({
      count: metric?.count ?? 0,
      dateKey,
      dayNumber,
      hasWatchItems: (metric?.watchItemCount ?? 0) > 0,
      isFuture: date > today,
      isToday: dateKey === todayKey,
      watchItemCount: metric?.watchItemCount ?? 0,
      weekday: WEEKDAY_LABELS[date.getDay()],
    });
  }

  return days;
}

export function buildRangeSummary(days: DayMetric[]): RangeSummary {
  return {
    streakDays: countTrailingRecordDays(days),
    totalCount: days.reduce((sum, day) => sum + day.count, 0),
    watchItemCount: days.reduce((sum, day) => sum + day.watchItemCount, 0),
  };
}

export function hasWatchItems(log: HistoryLog) {
  return log.aiWatchItems.length > 0;
}

function countTrailingRecordDays(days: DayMetric[]) {
  let streak = 0;

  for (let index = days.length - 1; index >= 0; index--) {
    if (days[index].count === 0) break;
    streak += 1;
  }

  return streak;
}

function toDateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateKeyToLocalDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateKeyLabel(dateKey: string) {
  const date = dateKeyToLocalDate(dateKey);
  return `${date.getMonth() + 1}/${date.getDate()}（週${WEEKDAY_LABELS[date.getDay()]}）`;
}

export function formatShortDate(dateKey: string) {
  const date = dateKeyToLocalDate(dateKey);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatLogDate(dateValue: string) {
  return new Date(dateValue).toLocaleString('zh-TW', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'numeric',
  });
}

function buildDailyMetricMap(rows: LogSignal[]) {
  const map = new Map<string, { count: number; watchItemCount: number }>();

  for (const row of rows) {
    const dateKey = toDateKey(row.captured_at);
    const current = map.get(dateKey) ?? { count: 0, watchItemCount: 0 };

    current.count += 1;
    current.watchItemCount += Array.isArray(row.ai_watch_items) ? row.ai_watch_items.length : 0;

    map.set(dateKey, current);
  }

  return map;
}
