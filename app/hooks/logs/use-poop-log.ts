import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { fetchPoopLog, poopLogsKeys } from './shared';
import type { HistoryLog } from './shared';

export type { HistoryLog };

export function usePoopLog(logId?: string) {
  const { user } = useSession();

  return useQuery({
    queryKey: poopLogsKeys.detail(user?.id, logId),
    queryFn: async () => {
      if (!supabase || !user || !logId) return null;
      return fetchPoopLog(logId);
    },
    enabled: !!user && !!supabase && !!logId,
    staleTime: 30_000,
  });
}
