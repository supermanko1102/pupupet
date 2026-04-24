import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { batchSignedUrls, mapHistoryRow, POOP_LOGS_KEY } from './shared';
import type { HistoryLog, HistoryRow } from './shared';

export type { HistoryLog };

export function usePoopLog(logId?: string) {
  const { user } = useSession();

  return useQuery({
    queryKey: [POOP_LOGS_KEY, user?.id, 'detail', logId],
    queryFn: async () => {
      if (!supabase || !user || !logId) return null;

      const { data: row, error } = await supabase
        .from('poop_logs')
        .select('id, captured_at, image_path, status, summary, recommendation, risk_level, pet_id, entry_mode, manual_status, note, pets(name)')
        .eq('id', logId)
        .single();

      if (error) throw error;
      if (!row) return null;

      const signedUrlMap = await batchSignedUrls([row.image_path]);
      return mapHistoryRow(row as HistoryRow, signedUrlMap);
    },
    enabled: !!user && !!supabase && !!logId,
    staleTime: 30_000,
  });
}
