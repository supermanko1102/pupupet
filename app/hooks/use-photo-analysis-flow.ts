import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { AnalysisResult } from '@/components/photo-analysis-modal';
import { useAssignPet } from '@/hooks/use-pets';
import type { StatsData } from '@/hooks/use-poop-logs';
import { buildRewardFeedback, type RewardFeedback } from '@/lib/catalog';
import { scheduleAbnormalFollowUp } from '@/lib/notifications';
import { uploadPoopPhoto } from '@/lib/uploads';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;
const MAX_POLL_ERRORS = 3;

type Props = {
  onLogsUpdated: () => void | Promise<unknown>;
  statsRows?: StatsData['rows'];
};

export function usePhotoAnalysisFlow({ onLogsUpdated, statsRows }: Props) {
  const { user } = useSession();
  const assignPetMutation = useAssignPet();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollErrorCountRef = useRef(0);
  const pollInFlightRef = useRef(false);
  const pollStartedAtRef = useRef<number | null>(null);

  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [petAssigned, setPetAssigned] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [capturedAsset, setCapturedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [modalPhase, setModalPhase] = useState<'analyzing' | 'result'>('analyzing');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [rewardFeedback, setRewardFeedback] = useState<RewardFeedback | null>(null);

  const closePhotoModal = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = null;
    pollErrorCountRef.current = 0;
    pollInFlightRef.current = false;
    pollStartedAtRef.current = null;
    setCapturedAsset(null);
    setModalPhase('analyzing');
    setAnalysisResult(null);
    setCurrentLogId(null);
    setPetAssigned(false);
    setRewardFeedback(null);
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const showPollingFailure = useCallback((
    summary: string,
    previewUri: string,
    recommendation: string | null = '你可以先離開此畫面，稍後到歷程查看是否完成分析。'
  ) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = null;
    pollErrorCountRef.current = 0;
    pollInFlightRef.current = false;
    pollStartedAtRef.current = null;

    setAnalysisResult({
      imageUrl: previewUri,
      bristolScore: null,
      failed: true,
      recommendation,
      riskLevel: null,
      summary,
    });
    setModalPhase('result');
    void onLogsUpdated();
  }, [onLogsUpdated]);

  const startPolling = useCallback((logId: string, imagePath: string, previewUri: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollErrorCountRef.current = 0;
    pollInFlightRef.current = false;
    pollStartedAtRef.current = Date.now();

    pollingRef.current = setInterval(async () => {
      if (!supabase) return;
      if (pollInFlightRef.current) return;

      const startedAt = pollStartedAtRef.current ?? Date.now();
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        showPollingFailure('分析時間較長，稍後可在歷程查看結果。', previewUri);
        return;
      }

      pollInFlightRef.current = true;

      try {
        const { data, error } = await supabase
          .from('poop_logs')
          .select('status, bristol_score, risk_level, summary, recommendation')
          .eq('id', logId)
          .single();

        if (error) {
          pollErrorCountRef.current += 1;
          if (pollErrorCountRef.current >= MAX_POLL_ERRORS) {
            showPollingFailure('連線不穩，暫時無法確認分析結果。', previewUri);
          }
          return;
        }

        pollErrorCountRef.current = 0;

        if (data?.status === 'done' || data?.status === 'failed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          pollErrorCountRef.current = 0;
          pollStartedAtRef.current = null;

          const { data: signedData } = await supabase.storage
            .from('poop-photos')
            .createSignedUrl(imagePath, 60 * 60);

          const resolvedRiskLevel = data.status === 'failed' ? null : data.risk_level;
          if (data.status !== 'failed') {
            setRewardFeedback(
              buildRewardFeedback(statsRows ?? [], {
                captured_at: new Date().toISOString(),
                entry_mode: 'photo_ai',
                manual_status: null,
                risk_level: resolvedRiskLevel,
              })
            );
          }

          setAnalysisResult({
            imageUrl: signedData?.signedUrl ?? previewUri,
            bristolScore: data.bristol_score,
            failed: data.status === 'failed',
            recommendation: data.status === 'failed' ? null : data.recommendation,
            riskLevel: resolvedRiskLevel,
            summary: data.status === 'failed' ? '分析失敗，請重新拍照。' : data.summary,
          });

          if (resolvedRiskLevel === 'vet' || resolvedRiskLevel === 'observe') {
            void scheduleAbnormalFollowUp(logId);
          }

          setModalPhase('result');
          void onLogsUpdated();
        }
      } catch {
        pollErrorCountRef.current += 1;
        if (pollErrorCountRef.current >= MAX_POLL_ERRORS) {
          showPollingFailure('連線不穩，暫時無法確認分析結果。', previewUri);
        }
      } finally {
        pollInFlightRef.current = false;
      }
    }, POLL_INTERVAL_MS);
  }, [onLogsUpdated, showPollingFailure, statsRows]);

  const uploadAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    if (!supabase || !user) return;

    setCapturedAsset(asset);
    setModalPhase('analyzing');
    setIsUploading(true);
    setRewardFeedback(null);

    try {
      const imagePath = await uploadPoopPhoto(user.id, asset);
      const { data: newLog, error } = await supabase
        .from('poop_logs')
        .insert({ image_path: imagePath, entry_mode: 'photo_ai', status: 'uploaded' })
        .select('id, image_path')
        .single();

      if (error) throw error;

      setCurrentLogId(newLog.id);
      startPolling(newLog.id, newLog.image_path!, asset.uri);
    } catch (error) {
      Alert.alert('上傳失敗', error instanceof Error ? error.message : '請稍後再試。');
      closePhotoModal();
    } finally {
      setIsUploading(false);
    }
  }, [closePhotoModal, startPolling, user]);

  const assignPet = useCallback(async (petId: string) => {
    if (!currentLogId) return;
    await assignPetMutation.mutateAsync({ logId: currentLogId, petId });
    setPetAssigned(true);
    void onLogsUpdated();
  }, [assignPetMutation, currentLogId, onLogsUpdated]);

  const startScan = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要相機權限', '請先允許 App 使用相機。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;
    void uploadAsset(result.assets[0]);
  }, [uploadAsset]);

  const pickFromLibrary = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要相簿權限', '請先允許 App 存取相簿。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;
    void uploadAsset(result.assets[0]);
  }, [uploadAsset]);

  return {
    analysisResult,
    assignPet,
    capturedAsset,
    closePhotoModal,
    isUploading,
    modalPhase,
    petAssigned,
    pickFromLibrary,
    rewardFeedback,
    startScan,
  };
}
