import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

import type { AnalysisResult } from '@/components/photo-analysis-modal';
import { useAssignPet } from '@/hooks/use-pets';
import { pollAnalysisOnce, type AnalysisPollerDeps } from '@/lib/analysis-poller';
import { createAnalysisLog } from '@/lib/analysis';
import { scheduleAbnormalFollowUp } from '@/lib/notifications';
import { createPollingFailureResult, shouldScheduleAnalysisFollowUp } from '@/lib/photo-analysis-result';
import { PHOTO_PICKER_OPTIONS, firstPickedAsset } from '@/lib/photo-picker';
import { PollingController } from '@/lib/polling-controller';
import { deletePoopPhoto, uploadPoopPhoto } from '@/lib/uploads';
import { supabase } from '@/lib/supabase';
import { BILLING_KEY, useBilling } from '@/providers/billing-provider';
import { useSession } from '@/providers/session-provider';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;
const MAX_POLL_ERRORS = 3;

type Props = {
  onLogsUpdated: () => void | Promise<unknown>;
};

export function usePhotoAnalysisFlow({ onLogsUpdated }: Props) {
  const { user } = useSession();
  const billing = useBilling();
  const assignPetMutation = useAssignPet();
  const queryClient = useQueryClient();
  const pollingRef = useRef(new PollingController<ReturnType<typeof setInterval>>({
    maxErrors: MAX_POLL_ERRORS,
    timeoutMs: POLL_TIMEOUT_MS,
  }));

  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [petAssigned, setPetAssigned] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [capturedAsset, setCapturedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [modalPhase, setModalPhase] = useState<'analyzing' | 'result'>('analyzing');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const stopPolling = useCallback(() => {
    const timer = pollingRef.current.getTimer();
    if (timer) clearInterval(timer);
    pollingRef.current.stop();
  }, []);

  const closePhotoModal = useCallback(() => {
    stopPolling();
    setCapturedAsset(null);
    setModalPhase('analyzing');
    setAnalysisResult(null);
    setCurrentLogId(null);
    setPetAssigned(false);
  }, [stopPolling]);

  useEffect(() => {
    return stopPolling;
  }, [stopPolling]);

  const showPollingFailure = useCallback((
    summary: string,
    previewUri: string,
    recommendation: string | null = '你可以先離開此畫面，稍後到歷程查看是否完成分析。'
  ) => {
    stopPolling();

    setAnalysisResult(createPollingFailureResult(summary, previewUri, recommendation));
    setModalPhase('result');
    void onLogsUpdated();
  }, [onLogsUpdated, stopPolling]);

  const startPolling = useCallback((logId: string, imagePath: string, previewUri: string) => {
    stopPolling();

    if (!supabase) return;
    const client = supabase;

    const deps: AnalysisPollerDeps = {
      fetchLogStatus: async (id) => {
        const { data, error } = await client
          .from('poop_logs')
          .select('status, bristol_score, risk_level, summary, recommendation')
          .eq('id', id)
          .single();
        return { data, error };
      },
      createSignedUrl: async (path) => {
        const { data } = await client.storage
          .from('poop-photos')
          .createSignedUrl(path, 60 * 60);
        return data?.signedUrl ?? null;
      },
    };

    const timer = setInterval(async () => {
      const outcome = await pollAnalysisOnce({
        controller: pollingRef.current,
        deps,
        imagePath,
        logId,
        previewUri,
      });

      switch (outcome.kind) {
        case 'pending':
        case 'skipped':
          return;
        case 'timeout':
          showPollingFailure('分析時間較長，稍後可在歷程查看結果。', previewUri);
          return;
        case 'fatal-error':
          showPollingFailure('連線不穩，暫時無法確認分析結果。', previewUri);
          return;
        case 'completed':
          stopPolling();
          setAnalysisResult(outcome.result);
          if (shouldScheduleAnalysisFollowUp(outcome.result.riskLevel)) {
            void scheduleAbnormalFollowUp(outcome.logId);
          }
          setModalPhase('result');
          void onLogsUpdated();
          return;
      }
    }, POLL_INTERVAL_MS);

    pollingRef.current.start(timer);
  }, [onLogsUpdated, showPollingFailure, stopPolling]);

  const uploadAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    if (!supabase || !user) return;

    setCapturedAsset(asset);
    setModalPhase('analyzing');
    setIsUploading(true);

    let imagePath: string | null = null;

    try {
      imagePath = await uploadPoopPhoto(user.id, asset);
      const newLog = await createAnalysisLog(imagePath);

      void queryClient.invalidateQueries({ queryKey: [BILLING_KEY, user.id] });
      setCurrentLogId(newLog.log_id);
      startPolling(newLog.log_id, newLog.image_path, asset.uri);
    } catch (error) {
      if (imagePath) {
        void deletePoopPhoto(imagePath);
      }
      Alert.alert('上傳失敗', error instanceof Error ? error.message : '請稍後再試。');
      closePhotoModal();
    } finally {
      setIsUploading(false);
    }
  }, [closePhotoModal, queryClient, startPolling, user]);

  const assignPet = useCallback(async (petId: string) => {
    if (!currentLogId) return;
    await assignPetMutation.mutateAsync({ logId: currentLogId, petId });
    setPetAssigned(true);
    void onLogsUpdated();
  }, [assignPetMutation, currentLogId, onLogsUpdated]);

  const startScan = useCallback(async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      Alert.alert('請使用手機拍照', '拍照分析建議使用 iPhone 或 Android App。');
      return;
    }

    const canAnalyze = await billing.ensureCanAnalyze();
    if (!canAnalyze) return;

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要相機權限', '請先允許 App 使用相機。');
      return;
    }

    const asset = firstPickedAsset(await ImagePicker.launchCameraAsync(PHOTO_PICKER_OPTIONS));
    if (!asset) return;
    void uploadAsset(asset);
  }, [billing, uploadAsset]);

  const pickFromLibrary = useCallback(async () => {
    const canAnalyze = await billing.ensureCanAnalyze();
    if (!canAnalyze) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要相簿權限', '請先允許 App 存取相簿。');
      return;
    }

    const asset = firstPickedAsset(await ImagePicker.launchImageLibraryAsync(PHOTO_PICKER_OPTIONS));
    if (!asset) return;
    void uploadAsset(asset);
  }, [billing, uploadAsset]);

  return {
    analysisResult,
    assignPet,
    capturedAsset,
    closePhotoModal,
    isUploading,
    modalPhase,
    petAssigned,
    pickFromLibrary,
    startScan,
  };
}
