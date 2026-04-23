import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import type { Database } from '@/types/database';

type RiskLevel = Database['public']['Tables']['poop_logs']['Row']['risk_level'];

export const POOP_LOGS_KEY = 'poop_logs';

// ─── 首頁最近紀錄（8 筆，含 signed URL）────────────────────────────────────────

export type RecentLog = {
  bristolScore: number | null;
  capturedAt: string;
  id: string;
  imageUrl: string | null;
  petName: string;
  riskLevel: RiskLevel;
  status: string;
  summary: string | null;
};

export function useRecentLogs() {
  const { user } = useSession();

  return useQuery({
    queryKey: [POOP_LOGS_KEY, user?.id, 'recent'],
    queryFn: async () => {
      if (!supabase || !user) return [];

      const { data: rows, error } = await supabase
        .from('poop_logs')
        .select('id, captured_at, image_path, status, summary, risk_level, bristol_score, pets(name)')
        .order('captured_at', { ascending: false })
        .limit(8);

      if (error) throw error;

      return Promise.all(
        (rows ?? []).map(async (row) => {
          const petName =
            row.pets && typeof row.pets === 'object' && 'name' in row.pets
              ? row.pets.name
              : '未分類';
          const { data: signed } = await supabase!.storage
            .from('poop-photos')
            .createSignedUrl(row.image_path, 60 * 60);
          return {
            bristolScore: row.bristol_score,
            capturedAt: row.captured_at,
            id: row.id,
            imageUrl: signed?.signedUrl ?? null,
            petName,
            riskLevel: row.risk_level,
            status: row.status,
            summary: row.summary,
          } satisfies RecentLog;
        })
      );
    },
    enabled: !!user && !!supabase,
    staleTime: 30_000, // 30 秒：首頁紀錄變動較頻繁
  });
}

// ─── 統計資料（全量 done logs）────────────────────────────────────────────────

export type StatsData = {
  total: number;
  normal: number;
  observe: number;
  vet: number;
  rows: { captured_at: string; risk_level: RiskLevel }[];
};

export function useStats() {
  const { user } = useSession();

  return useQuery({
    queryKey: [POOP_LOGS_KEY, user?.id, 'stats'],
    queryFn: async () => {
      if (!supabase || !user) return null;

      const { data, error } = await supabase
        .from('poop_logs')
        .select('captured_at, risk_level')
        .eq('status', 'done')
        .order('captured_at', { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as { captured_at: string; risk_level: RiskLevel }[];
      return {
        total: rows.length,
        normal: rows.filter((r) => r.risk_level === 'normal').length,
        observe: rows.filter((r) => r.risk_level === 'observe').length,
        vet: rows.filter((r) => r.risk_level === 'vet').length,
        rows,
      } satisfies StatsData;
    },
    enabled: !!user && !!supabase,
    staleTime: 2 * 60_000, // 統計 2 分鐘 stale（不需要即時）
  });
}
