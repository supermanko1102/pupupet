import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { fetchRecentLogs, poopLogsKeys } from './shared';
import type { RecentLog } from './shared';

export type { RecentLog };

export function useRecentLogs() {
  const { user } = useSession();

  return useQuery({
    queryKey: poopLogsKeys.recent(user?.id),
    queryFn: async () => {
      if (!supabase || !user) return [];
      return fetchRecentLogs();
    },
    enabled: !!user && !!supabase,
    staleTime: 30_000,
  });
}
