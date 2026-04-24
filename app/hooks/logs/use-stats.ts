import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { effectiveRisk, fetchDoneLogSignals, poopLogsKeys } from './shared';
import type { LogSignal } from './shared';

export type StatsData = {
  total: number;
  normal: number;
  observe: number;
  vet: number;
  rows: LogSignal[];
};

export function useStats() {
  const { user } = useSession();

  return useQuery({
    queryKey: poopLogsKeys.stats(user?.id),
    queryFn: async () => {
      if (!supabase || !user) return null;

      const rows = await fetchDoneLogSignals();

      return {
        total: rows.length,
        normal: rows.filter((r) => effectiveRisk(r) === 'normal').length,
        observe: rows.filter((r) => effectiveRisk(r) === 'observe').length,
        vet: rows.filter((r) => effectiveRisk(r) === 'vet').length,
        rows,
      } satisfies StatsData;
    },
    enabled: !!user && !!supabase,
    staleTime: 2 * 60_000,
  });
}
