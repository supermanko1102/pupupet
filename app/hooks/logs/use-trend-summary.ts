import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { fetchDoneLogSignals, poopLogsKeys } from './shared';

type TrendSummary = {
  hasWatchItems: boolean;
  message: string;
  recentCount: number;
};

export function useTrendSummary() {
  const { user } = useSession();

  return useQuery({
    queryKey: poopLogsKeys.trend(user?.id),
    queryFn: async () => {
      if (!supabase || !user) return null;

      const rows = await fetchDoneLogSignals(10);
      if (rows.length === 0) {
        return {
          hasWatchItems: false,
          message: '還沒有記錄，開始第一筆吧',
          recentCount: 0,
        } satisfies TrendSummary;
      }

      const recentWatchCount = rows
        .slice(0, 3)
        .reduce(
          (sum, row) => sum + (Array.isArray(row.ai_watch_items) ? row.ai_watch_items.length : 0),
          0,
        );
      const totalWatchCount = rows.reduce(
        (sum, row) => sum + (Array.isArray(row.ai_watch_items) ? row.ai_watch_items.length : 0),
        0,
      );

      let message: string;
      if (recentWatchCount > 0) {
        message = `最近有 ${recentWatchCount} 個留意點`;
      } else if (rows.length < 3) {
        message = `已記錄 ${rows.length} 次，繼續累積`;
      } else {
        message = `最近 ${rows.length} 筆都有留下觀察`;
      }

      return {
        hasWatchItems: totalWatchCount > 0,
        message,
        recentCount: rows.length,
      } satisfies TrendSummary;
    },
    enabled: !!user && !!supabase,
    staleTime: 60_000,
  });
}
