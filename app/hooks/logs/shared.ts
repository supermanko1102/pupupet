import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type RiskLevel = Database['public']['Tables']['poop_logs']['Row']['risk_level'];
export type ManualStatus = Database['public']['Tables']['poop_logs']['Row']['manual_status'];

export const POOP_LOGS_KEY = 'poop_logs';
export const HISTORY_PAGE_SIZE = 20;

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

// ─── Batch signed URL helper ──────────────────────────────────────────────────

export async function batchSignedUrls(paths: (string | null)[]): Promise<Map<string, string>> {
  const validPaths = paths.filter((p): p is string => !!p);
  if (!supabase || validPaths.length === 0) return new Map();

  const { data } = await supabase.storage
    .from('poop-photos')
    .createSignedUrls(validPaths, 60 * 60);

  const map = new Map<string, string>();
  for (const entry of data ?? []) {
    const { path, signedUrl } = entry;
    if (path && signedUrl) map.set(path, signedUrl);
  }
  return map;
}

// ─── HistoryLog type + row mapper ─────────────────────────────────────────────

export type HistoryLog = {
  capturedAt: string;
  entryMode: 'quick_log' | 'photo_ai';
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

export type HistoryRow = {
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
    capturedAt: row.captured_at,
    entryMode: (row.entry_mode ?? 'photo_ai') as 'quick_log' | 'photo_ai',
    id: row.id,
    imagePath: row.image_path ?? null,
    imageUrl: row.image_path ? (signedUrlMap.get(row.image_path) ?? null) : null,
    manualStatus: row.manual_status as ManualStatus,
    note: row.note ?? null,
    petId: row.pet_id ?? null,
    petName,
    recommendation: row.recommendation ?? null,
    riskLevel: row.risk_level,
    status: row.status,
    summary: row.summary ?? null,
  };
}
