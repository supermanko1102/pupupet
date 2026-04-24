import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { effectiveRisk, fetchDoneLogSignals, poopLogsKeys } from './shared';

export type TrendSummary = {
  message: string;
  recentCount: number;
  hasRecentAbnormal: boolean;
  lastAbnormalDaysAgo: number | null;
};

export function useTrendSummary() {
  const { user } = useSession();

  return useQuery({
    queryKey: poopLogsKeys.trend(user?.id),
    queryFn: async () => {
      if (!supabase || !user) return null;

      const rows = await fetchDoneLogSignals(10);
      if (rows.length === 0) {
        return { message: '還沒有記錄，開始第一筆吧', recentCount: 0, hasRecentAbnormal: false, lastAbnormalDaysAgo: null } satisfies TrendSummary;
      }

      const now = Date.now();
      const abnormalIdx = rows.findIndex((r) => {
        const risk = effectiveRisk(r);
        return risk === 'vet' || risk === 'observe';
      });

      let lastAbnormalDaysAgo: number | null = null;
      if (abnormalIdx !== -1) {
        const ms = now - new Date(rows[abnormalIdx].captured_at).getTime();
        lastAbnormalDaysAgo = Math.floor(ms / (1000 * 60 * 60 * 24));
      }

      const recentNormal = rows.slice(0, 5).every((r) => effectiveRisk(r) === 'normal');
      const hasRecentAbnormal = abnormalIdx !== -1 && abnormalIdx < 3;

      let message: string;
      if (recentNormal && rows.length >= 5) {
        message = `最近 5 次都正常`;
      } else if (hasRecentAbnormal && lastAbnormalDaysAgo === 0) {
        message = `今天有一次異常，留意後續狀況`;
      } else if (hasRecentAbnormal && lastAbnormalDaysAgo === 1) {
        message = `昨天有一次異常，今天記得觀察`;
      } else if (lastAbnormalDaysAgo !== null && lastAbnormalDaysAgo <= 7 && effectiveRisk(rows[0]) === 'normal') {
        message = `${lastAbnormalDaysAgo} 天前有異常，目前恢復正常`;
      } else if (rows.length < 3) {
        message = `已記錄 ${rows.length} 次，繼續累積`;
      } else {
        message = `最近 ${rows.length} 筆紀錄都在追蹤中`;
      }

      return {
        message,
        recentCount: rows.length,
        hasRecentAbnormal,
        lastAbnormalDaysAgo,
      } satisfies TrendSummary;
    },
    enabled: !!user && !!supabase,
    staleTime: 60_000,
  });
}
