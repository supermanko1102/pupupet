import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type RiskLevel = Database['public']['Tables']['poop_logs']['Row']['risk_level'];
export type ManualStatus = Database['public']['Tables']['poop_logs']['Row']['manual_status'];
export type EntryMode = 'quick_log' | 'photo_ai';

export type LogSignal = {
  captured_at: string;
  entry_mode: string;
  manual_status: ManualStatus;
  risk_level: RiskLevel;
};

export const POOP_LOGS_KEY = 'poop_logs';
export const HISTORY_PAGE_SIZE = 20;

export const poopLogsKeys = {
  all: (userId?: string) => [POOP_LOGS_KEY, userId] as const,
  detail: (userId?: string, logId?: string) => [POOP_LOGS_KEY, userId, 'detail', logId] as const,
  day: (userId?: string, dateKey?: string) => [POOP_LOGS_KEY, userId, 'day', dateKey] as const,
  history: (userId?: string) => [POOP_LOGS_KEY, userId, 'history'] as const,
  recent: (userId?: string) => [POOP_LOGS_KEY, userId, 'recent'] as const,
  stats: (userId?: string) => [POOP_LOGS_KEY, userId, 'stats'] as const,
  trend: (userId?: string) => [POOP_LOGS_KEY, userId, 'trend'] as const,
};

const LOG_WITH_PET_SELECT = [
  'id',
  'captured_at',
  'image_path',
  'status',
  'summary',
  'recommendation',
  'risk_level',
  'bristol_score',
  'pet_id',
  'entry_mode',
  'manual_status',
  'note',
  'pets(name)',
].join(', ');

// ─── Shared helper ────────────────────────────────────────────────────────────

export function effectiveRisk(row: { entry_mode: string; risk_level: RiskLevel; manual_status: ManualStatus }): RiskLevel {
  if (row.entry_mode === 'photo_ai') return row.risk_level;
  switch (row.manual_status) {
    case 'normal': return 'normal';
    case 'soft':
    case 'hard': return 'observe';
    case 'abnormal': return 'vet';
    default: return null;
  }
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase 尚未設定完成。');
  }

  return supabase;
}

// ─── Batch signed URL helper ──────────────────────────────────────────────────

export async function batchSignedUrls(paths: (string | null)[]): Promise<Map<string, string>> {
  const validPaths = [...new Set(paths.filter((p): p is string => !!p))];
  if (!supabase || validPaths.length === 0) return new Map();

  try {
    const { data, error } = await supabase.storage
      .from('poop-photos')
      .createSignedUrls(validPaths, 60 * 60);

    if (error) return new Map();

    const map = new Map<string, string>();
    for (const entry of data ?? []) {
      const { path, signedUrl } = entry;
      if (path && signedUrl) map.set(path, signedUrl);
    }
    return map;
  } catch {
    return new Map();
  }
}

// ─── Log type + row mapper ────────────────────────────────────────────────────

export type HistoryLog = {
  bristolScore: number | null;
  capturedAt: string;
  entryMode: EntryMode;
  id: string;
  imagePath: string | null;
  imageUrl: string | null;
  manualStatus: ManualStatus;
  note: string | null;
  petId: string | null;
  petName: string;
  recommendation: string | null;
  riskLevel: RiskLevel;
  status: string;
  summary: string | null;
};

export type RecentLog = HistoryLog;

export type HistoryRow = {
  bristol_score: number | null;
  captured_at: string;
  entry_mode: string | null;
  id: string;
  image_path: string | null;
  manual_status: ManualStatus;
  note: string | null;
  pet_id: string | null;
  pets: { name: string } | null;
  recommendation: string | null;
  risk_level: RiskLevel;
  status: string;
  summary: string | null;
};

export function mapHistoryRow(row: HistoryRow, signedUrlMap: Map<string, string>): HistoryLog {
  const petName =
    row.pets && typeof row.pets === 'object' && 'name' in row.pets
      ? row.pets.name
      : '未分類';

  return {
    bristolScore: row.bristol_score ?? null,
    capturedAt: row.captured_at,
    entryMode: (row.entry_mode ?? 'photo_ai') as EntryMode,
    id: row.id,
    imagePath: row.image_path ?? null,
    imageUrl: row.image_path ? (signedUrlMap.get(row.image_path) ?? null) : null,
    manualStatus: row.manual_status,
    note: row.note ?? null,
    petId: row.pet_id ?? null,
    petName,
    recommendation: row.recommendation ?? null,
    riskLevel: row.risk_level,
    status: row.status,
    summary: row.summary ?? null,
  };
}

async function mapRowsWithSignedUrls(rows: HistoryRow[]): Promise<HistoryLog[]> {
  const signedUrlMap = await batchSignedUrls(rows.map((row) => row.image_path));
  return rows.map((row) => mapHistoryRow(row, signedUrlMap));
}

// ─── Repository functions ─────────────────────────────────────────────────────

export async function fetchRecentLogs(): Promise<RecentLog[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('poop_logs')
    .select(LOG_WITH_PET_SELECT)
    .order('captured_at', { ascending: false })
    .limit(8);

  if (error) throw error;
  return mapRowsWithSignedUrls((data ?? []) as unknown as HistoryRow[]);
}

export async function fetchHistoryLogs(offset: number): Promise<HistoryLog[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('poop_logs')
    .select(LOG_WITH_PET_SELECT)
    .order('captured_at', { ascending: false })
    .range(offset, offset + HISTORY_PAGE_SIZE - 1);

  if (error) throw error;
  return mapRowsWithSignedUrls((data ?? []) as unknown as HistoryRow[]);
}

export async function fetchHistoryLogsForDate(dateKey: string): Promise<HistoryLog[]> {
  const client = requireSupabase();
  const [year, month, day] = dateKey.split('-').map(Number);

  if (!year || !month || !day) {
    throw new Error('日期格式不正確。');
  }

  const start = new Date(year, month - 1, day);
  const end = new Date(year, month - 1, day + 1);

  const { data, error } = await client
    .from('poop_logs')
    .select(LOG_WITH_PET_SELECT)
    .gte('captured_at', start.toISOString())
    .lt('captured_at', end.toISOString())
    .order('captured_at', { ascending: false });

  if (error) throw error;
  return mapRowsWithSignedUrls((data ?? []) as unknown as HistoryRow[]);
}

export async function fetchPoopLog(logId: string): Promise<HistoryLog | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('poop_logs')
    .select(LOG_WITH_PET_SELECT)
    .eq('id', logId)
    .single();

  if (error) throw error;
  if (!data) return null;

  const [log] = await mapRowsWithSignedUrls([data as unknown as HistoryRow]);
  return log ?? null;
}

export async function fetchDoneLogSignals(limit?: number): Promise<LogSignal[]> {
  const client = requireSupabase();
  let query = client
    .from('poop_logs')
    .select('captured_at, risk_level, entry_mode, manual_status')
    .eq('status', 'done')
    .order('captured_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as LogSignal[];
}
