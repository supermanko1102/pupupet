import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { fetchHistoryLogs, fetchHistoryLogsForDate, HISTORY_PAGE_SIZE, poopLogsKeys } from './shared';
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

export function useHistoryLogsForDate(dateKey?: string | null) {
  const { user } = useSession();

  return useQuery({
    queryKey: poopLogsKeys.day(user?.id, dateKey ?? undefined),
    queryFn: async () => {
      if (!supabase || !user || !dateKey) return [] as HistoryLog[];
      return fetchHistoryLogsForDate(dateKey);
    },
    enabled: !!user && !!supabase && !!dateKey,
    staleTime: 30_000,
  });
}
