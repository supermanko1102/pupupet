import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { scheduleAbnormalFollowUp } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import type { Database } from '@/types/database';

type RiskLevel = Database['public']['Tables']['poop_logs']['Row']['risk_level'];
type ManualStatus = Database['public']['Tables']['poop_logs']['Row']['manual_status'];

export const POOP_LOGS_KEY = 'poop_logs';

// ─── 首頁最近紀錄（8 筆，含 signed URL）────────────────────────────────────────

export type RecentLog = {
  bristolScore: number | null;
  capturedAt: string;
  entryMode: 'quick_log' | 'photo_ai';
  id: string;
  imageUrl: string | null;
  manualStatus: ManualStatus;
  note: string | null;
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
        .select('id, captured_at, image_path, status, summary, risk_level, bristol_score, entry_mode, manual_status, note, pets(name)')
        .order('captured_at', { ascending: false })
        .limit(8);

      if (error) throw error;

      return Promise.all(
        (rows ?? []).map(async (row) => {
          const petName =
            row.pets && typeof row.pets === 'object' && 'name' in row.pets
              ? row.pets.name
              : '未分類';

          let imageUrl: string | null = null;
          if (row.image_path) {
            const { data: signed } = await supabase!.storage
              .from('poop-photos')
              .createSignedUrl(row.image_path, 60 * 60);
            imageUrl = signed?.signedUrl ?? null;
          }

          return {
            bristolScore: row.bristol_score,
            capturedAt: row.captured_at,
            entryMode: row.entry_mode as 'quick_log' | 'photo_ai',
            id: row.id,
            imageUrl,
            manualStatus: row.manual_status as ManualStatus,
            note: row.note,
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

// ─── 快速記錄（無圖片）────────────────────────────────────────────────────────

export type QuickLogInput = {
  manualStatus: NonNullable<ManualStatus>;
  note?: string;
  petId?: string;
};

export function useQuickLog() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: QuickLogInput) => {
      if (!supabase || !user) throw new Error('未登入');

      const { data, error } = await supabase
        .from('poop_logs')
        .insert({
          entry_mode: 'quick_log',
          manual_status: input.manualStatus,
          note: input.note ?? null,
          pet_id: input.petId ?? null,
          status: 'done',
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // 異常或偏軟排程次日追蹤提醒
      if (variables.manualStatus === 'abnormal' || variables.manualStatus === 'soft') {
        void scheduleAbnormalFollowUp(data.id);
      }
      queryClient.invalidateQueries({ queryKey: [POOP_LOGS_KEY, user?.id] });
    },
  });
}

// ─── 統計資料（全量 done logs）────────────────────────────────────────────────

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

      // 計算有效 risk_level：photo_ai 用 risk_level，quick_log 用 manual_status 對應
      const effectiveRisk = (row: typeof rows[number]): RiskLevel => {
        if (row.entry_mode === 'photo_ai') return row.risk_level;
        switch (row.manual_status) {
          case 'normal': return 'normal';
          case 'soft':
          case 'hard': return 'observe';
          case 'abnormal': return 'vet';
          default: return null;
        }
      };

      return {
        total: rows.length,
        normal: rows.filter((r) => effectiveRisk(r) === 'normal').length,
        observe: rows.filter((r) => effectiveRisk(r) === 'observe').length,
        vet: rows.filter((r) => effectiveRisk(r) === 'vet').length,
        rows,
      } satisfies StatsData;
    },
    enabled: !!user && !!supabase,
    staleTime: 2 * 60_000, // 統計 2 分鐘 stale（不需要即時）
  });
}

// ─── 趨勢摘要（人話式）────────────────────────────────────────────────────────

export type TrendSummary = {
  message: string;
  recentCount: number;
  hasRecentAbnormal: boolean;
  lastAbnormalDaysAgo: number | null;
};

export function useTrendSummary() {
  const { user } = useSession();

  return useQuery({
    queryKey: [POOP_LOGS_KEY, user?.id, 'trend'],
    queryFn: async () => {
      if (!supabase || !user) return null;

      const { data, error } = await supabase
        .from('poop_logs')
        .select('captured_at, risk_level, entry_mode, manual_status')
        .eq('status', 'done')
        .order('captured_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const rows = data ?? [];
      if (rows.length === 0) {
        return { message: '還沒有記錄，開始第一筆吧', recentCount: 0, hasRecentAbnormal: false, lastAbnormalDaysAgo: null } satisfies TrendSummary;
      }

      const effectiveRisk = (row: typeof rows[number]): RiskLevel => {
        if (row.entry_mode === 'photo_ai') return row.risk_level as RiskLevel;
        switch (row.manual_status) {
          case 'normal': return 'normal';
          case 'soft':
          case 'hard': return 'observe';
          case 'abnormal': return 'vet';
          default: return null;
        }
      };

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
