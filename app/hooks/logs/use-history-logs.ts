import { useInfiniteQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { fetchHistoryLogs, HISTORY_PAGE_SIZE, poopLogsKeys } from './shared';
import type { HistoryLog } from './shared';

export type { HistoryLog };

export function useHistoryLogs() {
  const { user } = useSession();

  return useInfiniteQuery({
    queryKey: poopLogsKeys.history(user?.id),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!supabase || !user) return [] as HistoryLog[];
      return fetchHistoryLogs(pageParam as number);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < HISTORY_PAGE_SIZE) return undefined;
      return allPages.reduce((sum, page) => sum + page.length, 0);
    },
    enabled: !!user && !!supabase,
    staleTime: 30_000,
  });
}
