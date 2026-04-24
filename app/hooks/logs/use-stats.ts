import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { effectiveRisk, POOP_LOGS_KEY } from './shared';
import type { ManualStatus, RiskLevel } from './shared';

export type StatsData = {
  total: number;
  normal: number;
  observe: number;
  vet: number;
  rows: { captured_at: string; risk_level: RiskLevel; entry_mode: string; manual_status: ManualStatus }[];
};

export function useStats() {
  const { user } = useSession();

  return useQuery({
    queryKey: [POOP_LOGS_KEY, user?.id, 'stats'],
    queryFn: async () => {
      if (!supabase || !user) return null;

      const { data, error } = await supabase
        .from('poop_logs')
        .select('captured_at, risk_level, entry_mode, manual_status')
        .eq('status', 'done')
        .order('captured_at', { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as { captured_at: string; risk_level: RiskLevel; entry_mode: string; manual_status: ManualStatus }[];

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
