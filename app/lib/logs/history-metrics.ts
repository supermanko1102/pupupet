import { logStatusTone } from '@/lib/logs/log-utils';
import type { HistoryLog, LogSignal, RiskLevel } from '@/hooks/use-poop-logs';

export type RangeKey = '7d' | '30d';

export type Section = {
  data: HistoryLog[];
  title: string;
};

export type DayMetric = {
  count: number;
  dateKey: string;
  dayNumber: number;
  isFuture: boolean;
  isToday: boolean;
  normalCount: number;
  observeCount: number;
  riskLevel: RiskLevel;
  vetCount: number;
  weekday: string;
};

export type RangeSummary = {
  abnormalDays: number;
  normalRate: number | null;
  totalCount: number;
};

export type TrendSummaryLike = {
  hasRecentAbnormal: boolean;
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
      isFuture: false,
      isToday: dateKey === toDateKey(today),
      normalCount: metric?.normalCount ?? 0,
      observeCount: metric?.observeCount ?? 0,
      riskLevel: metric?.riskLevel ?? null,
      vetCount: metric?.vetCount ?? 0,
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
      isFuture: date > today,
      isToday: dateKey === todayKey,
      normalCount: metric?.normalCount ?? 0,
      observeCount: metric?.observeCount ?? 0,
      riskLevel: metric?.riskLevel ?? null,
      vetCount: metric?.vetCount ?? 0,
      weekday: WEEKDAY_LABELS[date.getDay()],
    });
  }

  return days;
}

export function buildRangeSummary(days: DayMetric[]): RangeSummary {
  const totalCount = days.reduce((sum, day) => sum + day.count, 0);
  const normalCount = days.reduce((sum, day) => sum + day.normalCount, 0);
  const abnormalDays = days.filter((day) => isAbnormalRisk(day.riskLevel)).length;

  return {
    abnormalDays,
    normalRate: totalCount > 0 ? Math.round((normalCount / totalCount) * 100) : null,
    totalCount,
  };
}

export function isAbnormalLog(log: HistoryLog) {
  const tone = logStatusTone(log);
  return tone === 'warning' || tone === 'danger';
}

function isAbnormalRisk(riskLevel: RiskLevel) {
  return riskLevel === 'observe' || riskLevel === 'vet';
}

function riskRank(riskLevel: RiskLevel) {
  if (riskLevel === 'vet') return 3;
  if (riskLevel === 'observe') return 2;
  if (riskLevel === 'normal') return 1;
  return 0;
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
  const map = new Map<string, {
    count: number;
    normalCount: number;
    observeCount: number;
    riskLevel: RiskLevel;
    vetCount: number;
  }>();

  for (const row of rows) {
    const dateKey = toDateKey(row.captured_at);
    const current = map.get(dateKey) ?? {
      count: 0,
      normalCount: 0,
      observeCount: 0,
      riskLevel: null,
      vetCount: 0,
    };
    const riskLevel = row.risk_level;

    current.count += 1;
    current.normalCount += riskLevel === 'normal' ? 1 : 0;
    current.observeCount += riskLevel === 'observe' ? 1 : 0;
    current.vetCount += riskLevel === 'vet' ? 1 : 0;
    current.riskLevel = riskRank(riskLevel) > riskRank(current.riskLevel)
      ? riskLevel
      : current.riskLevel;

    map.set(dateKey, current);
  }

  return map;
}
