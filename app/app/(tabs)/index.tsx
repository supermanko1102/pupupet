import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { SettingsPanel } from '@/components/settings-panel';
import { StatusPill } from '@/components/status-pill';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePets, useAssignPet } from '@/hooks/use-pets';
import { useRecentLogs, useQuickLog } from '@/hooks/use-poop-logs';
import {
  logStatusLabel,
  logStatusTone,
  manualStatusBg,
  manualStatusEmoji,
  manualStatusLabel,
} from '@/lib/log-utils';
import { scheduleAbnormalFollowUp } from '@/lib/notifications';
import { uploadPoopPhoto } from '@/lib/uploads';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import type { Database } from '@/types/database';

type ManualStatus = Database['public']['Tables']['poop_logs']['Row']['manual_status'];


export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { user } = useSession();
  const palette = Colors[colorScheme];

  const { data: pets = [] } = usePets();
  const { data: recentLogs = [], isLoading, isRefetching, refetch: refetchLogs } = useRecentLogs();
  const assignPetMutation = useAssignPet();
  const quickLogMutation = useQuickLog();

  // ── photo analysis state ──────────────────────────────────────────────────
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [petAssigned, setPetAssigned] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const iconAnim = useRef(new Animated.Value(0)).current;

  const menuOpacity = iconAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 0, 0] });
  const closeOpacity = iconAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] });
  const closeRotate = iconAnim.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] });

  function openMenu() {
    setMenuOpen(true);
    Animated.timing(iconAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }

  function closeMenu() {
    Animated.timing(iconAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setMenuOpen(false));
  }

  const [isUploading, setIsUploading] = useState(false);
  const [capturedAsset, setCapturedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [modalPhase, setModalPhase] = useState<'analyzing' | 'result'>('analyzing');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [detailLog, setDetailLog] = useState<DetailLog | null>(null);

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

  function openQuickLog() {
    setSelectedStatus(null);
    setQuickNote('');
    setQuickLogDone(false);
    setQuickLogVisible(true);
  }

  async function submitQuickLog() {
    if (!selectedStatus) return;
    try {
      await quickLogMutation.mutateAsync({ manualStatus: selectedStatus, note: quickNote.trim() || undefined });
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
  }

  return (
    <>
    <PhotoAnalysisModal
      capturedAsset={capturedAsset}
      modalPhase={modalPhase}
      analysisResult={analysisResult}
      petAssigned={petAssigned}
      pets={pets}
      onAssignPet={(petId) => void assignPet(petId)}
      onClose={closePhotoModal}
    />

    <QuickLogModal
      visible={quickLogVisible}
      selectedStatus={selectedStatus}
      quickNote={quickNote}
      quickLogDone={quickLogDone}
      isPending={quickLogMutation.isPending}
      onSelectStatus={setSelectedStatus}
      onChangeNote={setQuickNote}
      onSubmit={() => void submitQuickLog()}
      onClose={() => setQuickLogVisible(false)}
    />

    <LinearGradient
      colors={['rgba(32, 178, 170, 0.08)', '#ffffff', '#ffffff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 0.4 }}
      style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.hamburgerButton} onPress={menuOpen ? closeMenu : openMenu}>
            <View style={styles.iconWrap}>
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: menuOpacity }]}>
                <Ionicons name="menu" size={26} color="#006a65" />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: closeOpacity, transform: [{ rotate: closeRotate }] }]}>
                <Ionicons name="close" size={26} color="#006a65" />
              </Animated.View>
            </View>
          </Pressable>
          <Text style={styles.brandName}>PupuPet</Text>
          <Pressable style={styles.notifButton}>
            <Ionicons name="notifications-outline" size={24} color="#006a65" />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.bodyWrap}>
          <View style={styles.contentArea}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={() => void refetchLogs()} />
              }>

              {/* Hero */}
              <View style={styles.heroSection}>
                <Text style={styles.heroTitle}>今天記一下</Text>
                <Text style={styles.heroSubtitle}>每次排便都只要 5 秒</Text>
              </View>

              {/* 雙 CTA */}
              <View style={styles.ctaRow}>
                {/* 快速記錄 */}
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

                {/* 拍照分析 */}
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

              {/* 從相簿選擇 */}
              <Pressable
                style={styles.libraryButton}
                onPress={() => void pickFromLibrary()}
                disabled={isUploading || !user}>
                <Ionicons name="images-outline" size={16} color="#6c7a78" />
                <Text style={styles.libraryButtonText}>從相簿選擇</Text>
              </Pressable>

              {/* Recent Logs */}
              {recentLogs.length > 0 && (
                <View style={styles.logsSection}>
                  <View style={styles.logsSectionHeader}>
                    <Text style={styles.logsSectionTitle}>最近紀錄</Text>
                    <View style={styles.logsSectionRight}>
                      {isLoading && <ActivityIndicator size="small" color={palette.tint} />}
                      <Pressable onPress={() => router.push('/history' as never)}>
                        <Text style={styles.viewAllText}>查看全部</Text>
                      </Pressable>
                    </View>
                  </View>
                  {recentLogs.map((log) => (
                    <Pressable key={log.id} style={styles.logCard} onPress={() => setDetailLog(log)}>
                      {log.entryMode === 'quick_log' ? (
                        <View style={[styles.logImagePlaceholder, { backgroundColor: manualStatusBg(log.manualStatus) }]}>
                          <Text style={styles.logImagePlaceholderEmoji}>{manualStatusEmoji(log.manualStatus)}</Text>
                          <Text style={styles.logImagePlaceholderLabel}>{manualStatusLabel(log.manualStatus)}</Text>
                        </View>
                      ) : log.imageUrl ? (
                        <Image source={{ uri: log.imageUrl }} style={styles.logImage} contentFit="cover" />
                      ) : (
                        <View style={[styles.logImage, styles.logImageFallback]}>
                          <Ionicons name="image-outline" size={24} color="#bbc9c7" />
                        </View>
                      )}
                      <View style={styles.logMeta}>
                        <View style={styles.logRow}>
                          <Text style={styles.logPetName}>{log.petName}</Text>
                          <StatusPill
                            label={logStatusLabel(log)}
                            tone={logStatusTone(log)}
                          />
                        </View>
                        <Text style={styles.logDate}>
                          {new Date(log.capturedAt).toLocaleString('zh-TW')}
                        </Text>
                        {log.note ? (
                          <Text style={styles.logSummary} numberOfLines={1}>{log.note}</Text>
                        ) : log.summary ? (
                          <Text style={styles.logSummary} numberOfLines={2}>{log.summary}</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {user && recentLogs.length === 0 && !isLoading && (
                <View style={styles.emptyState}>
                  <Ionicons name="paw-outline" size={40} color="#bbc9c7" />
                  <Text style={styles.emptyText}>還沒有紀錄，按上方按鈕開始第一筆。</Text>
                </View>
              )}
            </ScrollView>

            {menuOpen && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }]}>
                <SettingsPanel />
              </View>
            )}
          </View>
        </View>

      </SafeAreaView>
    </LinearGradient>

    <LogDetailModal log={detailLog} onClose={() => setDetailLog(null)} />
    </>
  );
}



// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  hamburgerButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  iconWrap: { height: 26, width: 26 },
  bodyWrap: { flex: 1 },
  contentArea: { flex: 1, overflow: 'hidden' },
  brandName: { color: '#20B2AA', fontWeight: '800', fontSize: 20, letterSpacing: -0.5 },
  notifButton: { alignItems: 'center', borderRadius: 999, height: 40, justifyContent: 'center', width: 40 },
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

  // Recent logs
  logsSection: { gap: 12, paddingHorizontal: 20, width: '100%' },
  logsSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logsSectionTitle: { color: '#171d1c', fontSize: 17, fontWeight: '700' },
  logsSectionRight: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  viewAllText: { color: '#20B2AA', fontSize: 14, fontWeight: '600' },
  logCard: {
    backgroundColor: '#f5fbf9',
    borderRadius: 20,
    gap: 12,
    overflow: 'hidden',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e3e9e8',
  },
  logImage: { borderRadius: 14, height: 140, width: '100%' },
  logImageFallback: { alignItems: 'center', backgroundColor: '#e9efed', justifyContent: 'center' },
  logImagePlaceholder: {
    alignItems: 'center',
    borderRadius: 14,
    gap: 6,
    height: 80,
    justifyContent: 'center',
    width: '100%',
  },
  logImagePlaceholderEmoji: { fontSize: 28 },
  logImagePlaceholderLabel: { color: '#3c4948', fontSize: 13, fontWeight: '600' },
  logMeta: { gap: 4 },
  logRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  logPetName: { color: '#171d1c', fontSize: 15, fontWeight: '600' },
  logDate: { color: '#6c7a78', fontSize: 13 },
  logSummary: { color: '#3c4948', fontSize: 14, lineHeight: 20, marginTop: 2 },
  emptyState: { alignItems: 'center', gap: 12, marginTop: 24, paddingHorizontal: 40 },
  emptyText: { color: '#6c7a78', fontSize: 15, lineHeight: 22, textAlign: 'center' },

});
