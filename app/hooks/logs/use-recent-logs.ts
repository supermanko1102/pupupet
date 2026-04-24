import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import type { ManualStatus, RiskLevel } from './shared';
import { batchSignedUrls, POOP_LOGS_KEY } from './shared';

export type RecentLog = {
  bristolScore: number | null;
  capturedAt: string;
  entryMode: 'quick_log' | 'photo_ai';
  id: string;
  imageUrl: string | null;
  manualStatus: ManualStatus;
  note: string | null;
  petName: string;
  riskLevel: RiskLevel;
  status: string;
  summary: string | null;
};

export function useRecentLogs() {
  const { user } = useSession();

  return useQuery({
    queryKey: [POOP_LOGS_KEY, user?.id, 'recent'],
    queryFn: async () => {
      if (!supabase || !user) return [];

      const { data: rows, error } = await supabase
        .from('poop_logs')
        .select('id, captured_at, image_path, status, summary, risk_level, bristol_score, entry_mode, manual_status, note, pets(name)')
        .order('captured_at', { ascending: false })
        .limit(8);

      if (error) throw error;

      const signedUrlMap = await batchSignedUrls((rows ?? []).map((r) => r.image_path));

      return (rows ?? []).map((row): RecentLog => {
        const petName =
          row.pets && typeof row.pets === 'object' && 'name' in row.pets
            ? row.pets.name
            : '未分類';

        return {
          bristolScore: row.bristol_score,
          capturedAt: row.captured_at,
          entryMode: row.entry_mode as 'quick_log' | 'photo_ai',
          id: row.id,
          imageUrl: row.image_path ? (signedUrlMap.get(row.image_path) ?? null) : null,
          manualStatus: row.manual_status as ManualStatus,
          note: row.note,
          petName,
          riskLevel: row.risk_level,
          status: row.status,
          summary: row.summary,
        };
      });
    },
    enabled: !!user && !!supabase,
    staleTime: 30_000,
  });
}
