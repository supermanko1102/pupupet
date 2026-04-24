import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useQuickLog } from '@/hooks/use-poop-logs';
import type { Database } from '@/types/database';

type ManualStatus = Database['public']['Tables']['poop_logs']['Row']['manual_status'];

export function useQuickLogFlow() {
  const quickLogMutation = useQuickLog();
  const [isVisible, setIsVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<NonNullable<ManualStatus> | null>(null);
  const [quickNote, setQuickNote] = useState('');
  const [quickLogDone, setQuickLogDone] = useState(false);

  const openQuickLog = useCallback(() => {
    setSelectedStatus(null);
    setQuickNote('');
    setQuickLogDone(false);
    setIsVisible(true);
  }, []);

  const closeQuickLog = useCallback(() => {
    setIsVisible(false);
  }, []);

  const submitQuickLog = useCallback(async () => {
    if (!selectedStatus) return;

    try {
      await quickLogMutation.mutateAsync({
        manualStatus: selectedStatus,
        note: quickNote.trim() || undefined,
      });
      setQuickLogDone(true);
    } catch {
      Alert.alert('記錄失敗', '請稍後再試。');
    }
  }, [quickLogMutation, quickNote, selectedStatus]);

  return {
    closeQuickLog,
    isPending: quickLogMutation.isPending,
    isVisible,
    openQuickLog,
    quickLogDone,
    quickNote,
    selectedStatus,
    setQuickNote,
    setSelectedStatus,
    submitQuickLog,
  };
}
