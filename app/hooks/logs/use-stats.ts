import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { fetchDoneLogSignals, poopLogsKeys } from './shared';
import type { LogSignal } from './shared';

type StatsData = {
  rows: LogSignal[];
  total: number;
  watchItemCount: number;
};

export function useStats() {
  const { user } = useSession();

  return useQuery({
    queryKey: poopLogsKeys.stats(user?.id),
    queryFn: async () => {
      if (!supabase || !user) return null;

      const rows = await fetchDoneLogSignals();

      return {
        rows,
        total: rows.length,
        watchItemCount: rows.reduce(
          (sum, row) => sum + (Array.isArray(row.ai_watch_items) ? row.ai_watch_items.length : 0),
          0,
        ),
      } satisfies StatsData;
    },
    enabled: !!user && !!supabase,
    staleTime: 2 * 60_000,
  });
}
