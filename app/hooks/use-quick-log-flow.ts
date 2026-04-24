import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useQuickLog, type StatsData } from '@/hooks/use-poop-logs';
import { buildRewardFeedback, type RewardFeedback } from '@/lib/catalog';
import type { Database } from '@/types/database';

type ManualStatus = Database['public']['Tables']['poop_logs']['Row']['manual_status'];

type Props = {
  statsRows?: StatsData['rows'];
};

export function useQuickLogFlow({ statsRows }: Props) {
  const quickLogMutation = useQuickLog();
  const [isVisible, setIsVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<NonNullable<ManualStatus> | null>(null);
  const [quickNote, setQuickNote] = useState('');
  const [quickLogDone, setQuickLogDone] = useState(false);
  const [rewardFeedback, setRewardFeedback] = useState<RewardFeedback | null>(null);

  const openQuickLog = useCallback(() => {
    setSelectedStatus(null);
    setQuickNote('');
    setQuickLogDone(false);
    setRewardFeedback(null);
    setIsVisible(true);
  }, []);

  const closeQuickLog = useCallback(() => {
    setIsVisible(false);
    setRewardFeedback(null);
  }, []);

  const submitQuickLog = useCallback(async () => {
    if (!selectedStatus) return;

    const feedback = buildRewardFeedback(statsRows ?? [], {
      captured_at: new Date().toISOString(),
      entry_mode: 'quick_log',
      manual_status: selectedStatus,
      risk_level: null,
    });

    try {
      await quickLogMutation.mutateAsync({
        manualStatus: selectedStatus,
        note: quickNote.trim() || undefined,
      });
      setRewardFeedback(feedback);
      setQuickLogDone(true);
    } catch {
      Alert.alert('記錄失敗', '請稍後再試。');
    }
  }, [quickLogMutation, quickNote, selectedStatus, statsRows]);

  return {
    closeQuickLog,
    isPending: quickLogMutation.isPending,
    isVisible,
    openQuickLog,
    quickLogDone,
    quickNote,
    rewardFeedback,
    selectedStatus,
    setQuickNote,
    setSelectedStatus,
    submitQuickLog,
  };
}
