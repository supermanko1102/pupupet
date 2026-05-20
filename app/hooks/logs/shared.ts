import { supabase } from '@/lib/supabase';

export type LogSignal = {
  ai_watch_items: string[] | null;
  captured_at: string;
};

const POOP_LOGS_KEY = 'poop_logs';
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
  'ai_escalation_signs',
  'ai_findings',
  'ai_next_step',
  'ai_observation',
  'ai_possible_reasons',
  'ai_watch_items',
  'captured_at',
  'failure_reason',
  'image_path',
  'status',
  'summary',
  'recommendation',
  'bristol_score',
  'pet_id',
  'note',
  'pets(name)',
].join(', ');

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase 尚未設定完成。');
  }

  return supabase;
}

// ─── Batch signed URL helper ──────────────────────────────────────────────────

async function batchSignedUrls(paths: (string | null)[]): Promise<Map<string, string>> {
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
  aiEscalationSigns: string[];
  aiFindings: string[];
  aiNextStep: string | null;
  aiObservation: string | null;
  aiPossibleReasons: string[];
  aiWatchItems: string[];
  bristolScore: number | null;
  capturedAt: string;
  failureReason: string | null;
  id: string;
  imagePath: string | null;
  imageUrl: string | null;
  note: string | null;
  petId: string | null;
  petName: string;
  recommendation: string | null;
  status: string;
  summary: string | null;
};

export type RecentLog = HistoryLog;

type HistoryRow = {
  ai_escalation_signs: string[] | null;
  ai_findings: string[] | null;
  ai_next_step: string | null;
  ai_observation: string | null;
  ai_possible_reasons: string[] | null;
  ai_watch_items: string[] | null;
  bristol_score: number | null;
  captured_at: string;
  failure_reason: string | null;
  id: string;
  image_path: string | null;
  note: string | null;
  pet_id: string | null;
  pets: { name: string } | null;
  recommendation: string | null;
  status: string;
  summary: string | null;
};

function mapHistoryRow(row: HistoryRow, signedUrlMap: Map<string, string>): HistoryLog {
  const petName =
    row.pets && typeof row.pets === 'object' && 'name' in row.pets
      ? row.pets.name
      : '未分類';

  return {
    aiEscalationSigns: textArray(row.ai_escalation_signs),
    aiFindings: textArray(row.ai_findings),
    aiNextStep: row.ai_next_step ?? null,
    aiObservation: row.ai_observation ?? null,
    aiPossibleReasons: textArray(row.ai_possible_reasons),
    aiWatchItems: textArray(row.ai_watch_items),
    bristolScore: row.bristol_score ?? null,
    capturedAt: row.captured_at,
    failureReason: row.failure_reason ?? null,
    id: row.id,
    imagePath: row.image_path ?? null,
    imageUrl: row.image_path ? (signedUrlMap.get(row.image_path) ?? null) : null,
    note: row.note ?? null,
    petId: row.pet_id ?? null,
    petName,
    recommendation: row.recommendation ?? null,
    status: row.status,
    summary: row.summary ?? null,
  };
}

function textArray(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : [];
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
    .select('captured_at, ai_watch_items')
    .eq('status', 'done')
    .order('captured_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as LogSignal[];
}

type FunctionErrorBody = {
  code?: string;
  error?: string;
};

async function readFunctionError(error: unknown) {
  const context = error && typeof error === 'object' && 'context' in error
    ? (error as { context?: unknown }).context
    : null;

  if (typeof Response !== 'undefined' && context instanceof Response) {
    const body = await context.clone().json().catch(() => null) as FunctionErrorBody | null;

    if (body?.code === 'log_not_deletable') {
      return new Error('分析中暫時無法刪除。');
    }

    if (body?.error) {
      return new Error(body.error);
    }
  }

  return error instanceof Error ? error : new Error('刪除紀錄失敗。');
}

export async function deletePoopLog(logId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.functions.invoke('delete-poop-log', {
    body: { logId },
  });

  if (error) {
    throw await readFunctionError(error);
  }
}
