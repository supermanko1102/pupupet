import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

import type { AnalysisResult } from '@/components/photo-analysis-modal';
import { useAssignPet } from '@/hooks/use-pets';
import { pollAnalysisOnce, type AnalysisPollerDeps } from '@/lib/logs/analysis-poller';
import { createAnalysisLog } from '@/lib/logs/analysis';
import { scheduleAbnormalFollowUp } from '@/lib/notifications';
import { createPollingFailureResult, shouldScheduleAnalysisFollowUp } from '@/lib/photos/photo-analysis-result';
import { PHOTO_PICKER_OPTIONS, firstPickedAsset } from '@/lib/photos/photo-picker';
import { PollingController } from '@/lib/logs/polling-controller';
import { deletePoopPhoto, uploadPoopPhoto } from '@/lib/photos/uploads';
import { supabase } from '@/lib/supabase';
import { BILLING_KEY, useBilling } from '@/providers/billing-provider';
import { useSession } from '@/providers/session-provider';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;
const MAX_POLL_ERRORS = 3;
const DISMISS_PROCESSING_AFTER_MS = 5000;
const SHOW_RESULT_AFTER_PROGRESS_MS = 450;

export type PhotoAnalysisModalPhase = 'processing' | 'result';
export type PhotoAnalysisProcessingStep = 'uploading' | 'creating' | 'analyzing' | 'finalizing';

const PROCESSING_STEP_PROGRESS: Record<PhotoAnalysisProcessingStep, number> = {
  uploading: 0.04,
  creating: 0.25,
  analyzing: 0.35,
  finalizing: 0.9,
};

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
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPhotoModalVisibleRef = useRef(false);

  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [petAssigned, setPetAssigned] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [capturedAsset, setCapturedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [modalPhase, setModalPhase] = useState<PhotoAnalysisModalPhase>('processing');
  const [processingStep, setProcessingStep] = useState<PhotoAnalysisProcessingStep>('uploading');
  const [processingStepStartedAt, setProcessingStepStartedAt] = useState<number | null>(null);
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    isPhotoModalVisibleRef.current = isPhotoModalVisible;
  }, [isPhotoModalVisible]);

  const clearResultTimer = useCallback(() => {
    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    const timer = pollingRef.current.getTimer();
    if (timer) clearInterval(timer);
    pollingRef.current.stop();
  }, []);

  const setProcessingStage = useCallback((step: PhotoAnalysisProcessingStep) => {
    setProcessingStep(step);
    setProcessingStepStartedAt(Date.now());
    setProcessingProgress((current) => Math.max(current, PROCESSING_STEP_PROGRESS[step]));
  }, []);

  const closePhotoModal = useCallback(() => {
    clearResultTimer();
    stopPolling();
    setCapturedAsset(null);
    setIsPhotoModalVisible(false);
    setModalPhase('processing');
    setProcessingStep('uploading');
    setProcessingStepStartedAt(null);
    setProcessingStartedAt(null);
    setProcessingProgress(0);
    setAnalysisResult(null);
    setCurrentLogId(null);
    setPetAssigned(false);
  }, [clearResultTimer, stopPolling]);

  const dismissProcessingModal = useCallback(() => {
    setIsPhotoModalVisible(false);
    void onLogsUpdated();
  }, [onLogsUpdated]);

  const openPhotoModal = useCallback(() => {
    if (!capturedAsset && !analysisResult) return;
    setIsPhotoModalVisible(true);
  }, [analysisResult, capturedAsset]);

  useEffect(() => {
    return () => {
      clearResultTimer();
      stopPolling();
    };
  }, [clearResultTimer, stopPolling]);

  useEffect(() => {
    if (modalPhase !== 'processing' || !processingStepStartedAt) return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - processingStepStartedAt;
      const nextProgress = (() => {
        switch (processingStep) {
          case 'uploading':
            return Math.min(0.24, 0.04 + (elapsed / 8000) * 0.2);
          case 'creating':
            return Math.min(0.34, 0.25 + (elapsed / 3000) * 0.09);
          case 'analyzing':
            return Math.min(0.9, 0.35 + (elapsed / POLL_TIMEOUT_MS) * 0.55);
          case 'finalizing':
            return Math.min(0.98, 0.9 + (elapsed / 1200) * 0.08);
        }
      })();

      setProcessingProgress((current) => Math.max(current, nextProgress));
    }, 120);

    return () => clearInterval(timer);
  }, [modalPhase, processingStep, processingStepStartedAt]);

  const showPollingFailure = useCallback((
    summary: string,
    previewUri: string,
    recommendation: string | null = '你可以先離開此畫面，稍後到歷程查看是否完成分析。'
  ) => {
    stopPolling();

    setAnalysisResult(createPollingFailureResult(summary, previewUri, recommendation));
    setProcessingProgress(1);
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
          .select('status, bristol_score, failure_reason, risk_level, summary, recommendation')
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
          setProcessingStage('finalizing');
          setAnalysisResult(outcome.result);
          if (shouldScheduleAnalysisFollowUp(outcome.result.riskLevel)) {
            void scheduleAbnormalFollowUp(outcome.logId);
          }
          setProcessingProgress(1);
          clearResultTimer();
          resultTimerRef.current = setTimeout(() => {
            resultTimerRef.current = null;
            setModalPhase('result');
          }, isPhotoModalVisibleRef.current ? SHOW_RESULT_AFTER_PROGRESS_MS : 0);
          void onLogsUpdated();
          return;
      }
    }, POLL_INTERVAL_MS);

    pollingRef.current.start(timer);
  }, [clearResultTimer, onLogsUpdated, setProcessingStage, showPollingFailure, stopPolling]);

  const uploadAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    if (!supabase || !user) return;

    clearResultTimer();
    stopPolling();
    setCapturedAsset(asset);
    setIsPhotoModalVisible(true);
    setModalPhase('processing');
    setAnalysisResult(null);
    setCurrentLogId(null);
    setPetAssigned(false);
    setProcessingStartedAt(Date.now());
    setProcessingProgress(0);
    setProcessingStage('uploading');
    setIsUploading(true);

    let imagePath: string | null = null;

    try {
      imagePath = await uploadPoopPhoto(user.id, asset);
      setProcessingStage('creating');
      const newLog = await createAnalysisLog(imagePath);

      void queryClient.invalidateQueries({ queryKey: [BILLING_KEY, user.id] });
      setCurrentLogId(newLog.log_id);
      void onLogsUpdated();
      setProcessingStage('analyzing');
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
  }, [clearResultTimer, closePhotoModal, onLogsUpdated, queryClient, setProcessingStage, startPolling, stopPolling, user]);

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

  const canDismissProcessing =
    modalPhase === 'processing'
    && !!currentLogId
    && !!processingStartedAt
    && Date.now() - processingStartedAt >= DISMISS_PROCESSING_AFTER_MS;

  return {
    analysisResult,
    assignPet,
    canDismissProcessing,
    capturedAsset,
    closePhotoModal,
    dismissProcessingModal,
    isUploading,
    isPhotoModalVisible,
    modalPhase,
    openPhotoModal,
    petAssigned,
    pickFromLibrary,
    processingProgress,
    processingStartedAt,
    processingStep,
    startScan,
  };
}
