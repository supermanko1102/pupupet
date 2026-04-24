import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { LogDetailModal, type DetailLog } from '@/components/log-detail-modal';
import { PhotoAnalysisModal, type AnalysisResult } from '@/components/photo-analysis-modal';
import { QuickLogModal } from '@/components/quick-log-modal';
import { usePets, useAssignPet } from '@/hooks/use-pets';
import {
  useRecentLogs,
  useQuickLog,
  useStats,
  useTrendSummary,
  type RecentLog,
} from '@/hooks/use-poop-logs';
import { buildRewardFeedback, type RewardFeedback } from '@/lib/catalog';
import {
  logStatusLabel,
} from '@/lib/log-utils';
import { cancelFollowUp, scheduleAbnormalFollowUp } from '@/lib/notifications';
import { uploadPoopPhoto } from '@/lib/uploads';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import type { Database } from '@/types/database';

type ManualStatus = Database['public']['Tables']['poop_logs']['Row']['manual_status'];

// ─── DEV ONLY: 通知測試面板 ───────────────────────────────────────────────────

function DebugPanel({
  recentLogs,
  onOpenFollowUp,
}: {
  recentLogs: RecentLog[];
  onOpenFollowUp: (log: DetailLog) => void;
}) {
  const firstAbnormal = recentLogs.find(
    (l) => l.riskLevel === 'vet' || l.riskLevel === 'observe'
  ) ?? recentLogs[0];

  async function scheduleIn5Seconds() {
    await cancelFollowUp(firstAbnormal.id);
    await Notifications.scheduleNotificationAsync({
      identifier: `follow_up_${firstAbnormal.id}`,
      content: {
        title: '記得追蹤昨天的異常',
        body: '（測試）昨天有記錄到異常狀況，今天排便後記得再記錄一次。',
        data: { logId: firstAbnormal.id, type: 'abnormal_follow_up' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        repeats: false,
      },
    });
    Alert.alert('✅ 通知已排程', '5 秒後點擊測試 tap → navigate 流程');
  }

  return (
    <View style={debugStyles.panel}>
      <Text style={debugStyles.title}>🛠 DEV: 通知測試</Text>
      <Text style={debugStyles.target} numberOfLines={1}>
        目標 log：{firstAbnormal.id.slice(0, 8)}… ({firstAbnormal.riskLevel ?? firstAbnormal.manualStatus})
      </Text>
      <Pressable style={debugStyles.btn} onPress={() => onOpenFollowUp(firstAbnormal)}>
        <Text style={debugStyles.btnText}>直接開 Follow-up Modal</Text>
      </Pressable>
      <Pressable style={[debugStyles.btn, debugStyles.btnSecondary]} onPress={() => void scheduleIn5Seconds()}>
        <Text style={[debugStyles.btnText, { color: '#3c4948' }]}>排一個 5 秒後的通知</Text>
      </Pressable>
    </View>
  );
}

const debugStyles = StyleSheet.create({
  panel: {
    backgroundColor: '#fef9c3',
    borderColor: '#fde047',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    width: '100%',
  },
  title: { color: '#713f12', fontSize: 13, fontWeight: '700' },
  target: { color: '#92400e', fontSize: 12 },
  btn: {
    alignItems: 'center',
    backgroundColor: '#20B2AA',
    borderRadius: 10,
    paddingVertical: 10,
  },
  btnSecondary: { backgroundColor: '#e9efed' },
  btnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useSession();

  const { data: pets = [] } = usePets();
  const { data: recentLogs = [], isLoading, isRefetching, refetch: refetchLogs } = useRecentLogs();
  const { data: statsData } = useStats();
  const { data: trendSummary } = useTrendSummary();
  const assignPetMutation = useAssignPet();
  const quickLogMutation = useQuickLog();

  // ── 通知點擊追蹤：讀取 trackLogId param，從快取找 log，開 modal ──────────
  // follow-up 通知對應昨天的 log，幾乎必然在 recentLogs 快取裡，不需要額外 fetch
  const { trackLogId } = useLocalSearchParams<{ trackLogId?: string }>();
  const handledTrackLogIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!trackLogId || trackLogId === handledTrackLogIdRef.current) return;

    const log = recentLogs.find((l) => l.id === trackLogId);
    if (!log) return; // 不在快取裡（edge case），略過

    handledTrackLogIdRef.current = trackLogId;
    setDetailLog(log);
    setIsFollowUp(true);
  }, [trackLogId, recentLogs]);

  // ── photo analysis state ──────────────────────────────────────────────────
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [petAssigned, setPetAssigned] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [capturedAsset, setCapturedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [modalPhase, setModalPhase] = useState<'analyzing' | 'result'>('analyzing');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [detailLog, setDetailLog] = useState<DetailLog | null>(null);
  const [isFollowUp, setIsFollowUp] = useState(false);

  // 元件 unmount 時清除 polling，避免 memory leak
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ── quick log state ───────────────────────────────────────────────────────
  const [quickLogVisible, setQuickLogVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<NonNullable<ManualStatus> | null>(null);
  const [quickNote, setQuickNote] = useState('');
  const [quickLogDone, setQuickLogDone] = useState(false);
  const [rewardFeedback, setRewardFeedback] = useState<RewardFeedback | null>(null);

  function openQuickLog() {
    setSelectedStatus(null);
    setQuickNote('');
    setQuickLogDone(false);
    setRewardFeedback(null);
    setQuickLogVisible(true);
  }

  function closeQuickLog() {
    setQuickLogVisible(false);
    setRewardFeedback(null);
  }

  async function submitQuickLog() {
    if (!selectedStatus) return;
    const feedback = buildRewardFeedback(statsData?.rows ?? [], {
      captured_at: new Date().toISOString(),
      entry_mode: 'quick_log',
      manual_status: selectedStatus,
      risk_level: null,
    });

    try {
      await quickLogMutation.mutateAsync({ manualStatus: selectedStatus, note: quickNote.trim() || undefined });
      setRewardFeedback(feedback);
      setQuickLogDone(true);
    } catch {
      Alert.alert('記錄失敗', '請稍後再試。');
    }
  }

  // ── photo analysis ────────────────────────────────────────────────────────

  async function uploadAsset(asset: ImagePicker.ImagePickerAsset) {
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
      startPolling(newLog.id, newLog.image_path!);
    } catch (err) {
      Alert.alert('上傳失敗', err instanceof Error ? err.message : '請稍後再試。');
      closePhotoModal();
    } finally {
      setIsUploading(false);
    }
  }

  async function assignPet(petId: string) {
    if (!currentLogId) return;
    await assignPetMutation.mutateAsync({ logId: currentLogId, petId });
    void refetchLogs();
    setPetAssigned(true);
  }

  async function startScan() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要相機權限', '請先允許 App 使用相機。');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled || !result.assets[0]) return;
    void uploadAsset(result.assets[0]);
  }

  async function pickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要相簿權限', '請先允許 App 存取相簿。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled || !result.assets[0]) return;
    void uploadAsset(result.assets[0]);
  }

  function startPolling(logId: string, imagePath: string) {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      if (!supabase) return;

      const { data } = await supabase
        .from('poop_logs')
        .select('status, bristol_score, risk_level, summary, recommendation')
        .eq('id', logId)
        .single();

      if (data?.status === 'done' || data?.status === 'failed') {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;

        const { data: signedData } = await supabase.storage
          .from('poop-photos')
          .createSignedUrl(imagePath, 60 * 60);

        const resolvedRiskLevel = data.status === 'failed' ? null : data.risk_level;
        if (data.status !== 'failed') {
          setRewardFeedback(
            buildRewardFeedback(statsData?.rows ?? [], {
              captured_at: new Date().toISOString(),
              entry_mode: 'photo_ai',
              manual_status: null,
              risk_level: resolvedRiskLevel,
            })
          );
        }

        setAnalysisResult({
          imageUrl: signedData?.signedUrl ?? '',
          bristolScore: data.bristol_score,
          riskLevel: resolvedRiskLevel,
          summary: data.status === 'failed' ? '分析失敗，請重新拍照。' : data.summary,
          recommendation: data.status === 'failed' ? null : data.recommendation,
          failed: data.status === 'failed',
        });

        // 異常排程次日追蹤提醒
        if (resolvedRiskLevel === 'vet' || resolvedRiskLevel === 'observe') {
          void scheduleAbnormalFollowUp(logId);
        }

        setModalPhase('result');
        void refetchLogs();
      }
    }, 2000);
  }

  function closePhotoModal() {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = null;
    setCapturedAsset(null);
    setModalPhase('analyzing');
    setAnalysisResult(null);
    setCurrentLogId(null);
    setPetAssigned(false);
    setRewardFeedback(null);
  }

  return (
    <>
    <PhotoAnalysisModal
      capturedAsset={capturedAsset}
      modalPhase={modalPhase}
      analysisResult={analysisResult}
      petAssigned={petAssigned}
      pets={pets}
      rewardFeedback={rewardFeedback}
      onAssignPet={(petId) => void assignPet(petId)}
      onClose={closePhotoModal}
    />

    <QuickLogModal
      visible={quickLogVisible}
      selectedStatus={selectedStatus}
      quickNote={quickNote}
      quickLogDone={quickLogDone}
      rewardFeedback={rewardFeedback}
      isPending={quickLogMutation.isPending}
      onSelectStatus={setSelectedStatus}
      onChangeNote={setQuickNote}
      onSubmit={() => void submitQuickLog()}
      onClose={closeQuickLog}
    />

    <LinearGradient
      colors={['rgba(32, 178, 170, 0.08)', '#ffffff', '#ffffff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 0.4 }}
      style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.bodyWrap}>
          <View style={styles.contentArea}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={() => void refetchLogs()} />
              }>

              <View style={styles.heroSection}>
                <Text style={styles.heroTitle}>今天記一下</Text>
                <Text style={styles.heroSubtitle}>每次排便都只要 5 秒</Text>
              </View>

              <View style={styles.ctaRow}>
                <Pressable
                  style={({ pressed }) => [styles.ctaCard, styles.ctaCardPrimary, pressed && styles.ctaCardPressed]}
                  onPress={openQuickLog}
                  disabled={!user}>
                  <View style={styles.ctaIconWrap}>
                    <Ionicons name="flash" size={28} color="#ffffff" />
                  </View>
                  <Text style={styles.ctaCardTitle}>快速記錄</Text>
                  <Text style={styles.ctaCardSub}>選狀態，5 秒完成</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.ctaCard, styles.ctaCardSecondary, pressed && styles.ctaCardPressed]}
                  onPress={() => void startScan()}
                  disabled={isUploading || !user}>
                  <View style={[styles.ctaIconWrap, { backgroundColor: 'rgba(32,178,170,0.12)' }]}>
                    <Ionicons name="camera" size={28} color="#20B2AA" />
                  </View>
                  <Text style={[styles.ctaCardTitle, { color: '#171d1c' }]}>拍照分析</Text>
                  <Text style={styles.ctaCardSub}>AI 判讀健康狀況</Text>
                </Pressable>
              </View>

              <Pressable
                style={styles.libraryButton}
                onPress={() => void pickFromLibrary()}
                disabled={isUploading || !user}>
                <Ionicons name="images-outline" size={16} color="#6c7a78" />
                <Text style={styles.libraryButtonText}>從相簿選擇</Text>
              </Pressable>

              <View style={styles.summarySection}>
                <Text style={styles.summarySectionTitle}>最近狀態</Text>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardTop}>
                    <View style={styles.summaryIconWrap}>
                      <Ionicons
                        name={trendSummary?.hasRecentAbnormal ? 'warning-outline' : 'checkmark-circle-outline'}
                        size={22}
                        color={trendSummary?.hasRecentAbnormal ? '#92400e' : '#065f46'}
                      />
                    </View>
                    <View style={styles.summaryBody}>
                      <Text style={styles.summaryTitle}>
                        {trendSummary?.message ?? '還沒有記錄，先完成第一筆吧'}
                      </Text>
                      <Text style={styles.summarySubtitle}>
                        {recentLogs[0]
                          ? `${new Date(recentLogs[0].capturedAt).toLocaleString('zh-TW')} ・ ${logStatusLabel(recentLogs[0])}`
                          : '記錄夠快，異常有後續，這裡只保留最重要的狀態。'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.summaryActionRow}>
                    <Pressable
                      style={[styles.summaryActionButton, styles.summaryActionPrimary]}
                      onPress={() => router.navigate('/(tabs)/history' as never)}>
                      <Text style={styles.summaryActionPrimaryText}>看歷程</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.summaryActionButton, styles.summaryActionSecondary]}
                      onPress={() => router.navigate('/(tabs)/catalog' as never)}>
                      <Text style={styles.summaryActionSecondaryText}>看圖鑑</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {user && recentLogs.length === 0 && !isLoading && (
                <View style={styles.emptyState}>
                  <Ionicons name="paw-outline" size={40} color="#bbc9c7" />
                  <Text style={styles.emptyText}>還沒有紀錄，按上方按鈕開始第一筆。</Text>
                </View>
              )}

              {__DEV__ && recentLogs.length > 0 && (
                <DebugPanel
                  recentLogs={recentLogs}
                  onOpenFollowUp={(log) => { setDetailLog(log); setIsFollowUp(true); }}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>

    <LogDetailModal
      log={detailLog}
      isFollowUp={isFollowUp}
      onClose={() => { setDetailLog(null); setIsFollowUp(false); }}
    />
    </>
  );
}



// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  bodyWrap: { flex: 1 },
  contentArea: { flex: 1, overflow: 'hidden' },
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center', paddingBottom: 40, paddingTop: 16 },

  // Hero
  heroSection: { alignItems: 'center', paddingHorizontal: 32, gap: 6, marginBottom: 28 },
  heroTitle: { color: '#171d1c', fontSize: 26, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 },
  heroSubtitle: { color: '#6c7a78', fontSize: 15, textAlign: 'center' },

  // Dual CTA
  ctaRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, width: '100%', marginBottom: 12 },
  ctaCard: {
    alignItems: 'center',
    borderRadius: 20,
    flex: 1,
    gap: 8,
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  ctaCardPrimary: {
    backgroundColor: '#20B2AA',
    shadowColor: '#20B2AA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaCardSecondary: {
    backgroundColor: '#f5fbf9',
    borderWidth: 1,
    borderColor: '#e3e9e8',
  },
  ctaCardPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  ctaIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  ctaCardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  ctaCardSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center' },

  // Library button
  libraryButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 32,
    paddingVertical: 8,
  },
  libraryButtonText: { color: '#6c7a78', fontSize: 14, fontWeight: '500' },

  summarySection: { gap: 10, paddingHorizontal: 20, width: '100%' },
  summarySectionTitle: { color: '#171d1c', fontSize: 17, fontWeight: '700' },
  summaryCard: {
    backgroundColor: '#f5fbf9',
    borderColor: '#e3e9e8',
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  summaryCardTop: { flexDirection: 'row', gap: 12 },
  summaryIconWrap: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  summaryBody: { flex: 1, gap: 4 },
  summaryTitle: { color: '#171d1c', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  summarySubtitle: { color: '#6c7a78', fontSize: 13, lineHeight: 19 },
  summaryActionRow: { flexDirection: 'row', gap: 10 },
  summaryActionButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  summaryActionPrimary: { backgroundColor: '#20B2AA' },
  summaryActionSecondary: { backgroundColor: '#e9efed' },
  summaryActionPrimaryText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  summaryActionSecondaryText: { color: '#3c4948', fontSize: 15, fontWeight: '700' },
  emptyState: { alignItems: 'center', gap: 12, marginTop: 24, paddingHorizontal: 40 },
  emptyText: { color: '#6c7a78', fontSize: 15, lineHeight: 22, textAlign: 'center' },

});
