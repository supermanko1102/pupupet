import { useInfiniteQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { batchSignedUrls, HISTORY_PAGE_SIZE, mapHistoryRow, POOP_LOGS_KEY } from './shared';
import type { HistoryLog, HistoryRow } from './shared';

export type { HistoryLog };

export function useHistoryLogs() {
  const { user } = useSession();

  return useInfiniteQuery({
    queryKey: [POOP_LOGS_KEY, user?.id, 'history'],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!supabase || !user) return [] as HistoryLog[];

      const offset = pageParam as number;
      const { data: rows, error } = await supabase
        .from('poop_logs')
        .select('id, captured_at, image_path, status, summary, recommendation, risk_level, pet_id, entry_mode, manual_status, note, pets(name)')
        .order('captured_at', { ascending: false })
        .range(offset, offset + HISTORY_PAGE_SIZE - 1);

      if (error) throw error;

      const signedUrlMap = await batchSignedUrls((rows ?? []).map((r) => r.image_path));

      return (rows ?? []).map((row) => mapHistoryRow(row as HistoryRow, signedUrlMap));
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < HISTORY_PAGE_SIZE) return undefined;
      return allPages.reduce((sum, page) => sum + page.length, 0);
    },
    enabled: !!user && !!supabase,
    staleTime: 30_000,
  });
}
