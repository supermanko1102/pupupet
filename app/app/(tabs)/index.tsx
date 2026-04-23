import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SettingsPanel } from '@/components/settings-panel';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePets, useAssignPet } from '@/hooks/use-pets';
import { useRecentLogs, useQuickLog } from '@/hooks/use-poop-logs';
import { scheduleAbnormalFollowUp } from '@/lib/notifications';
import { uploadPoopPhoto } from '@/lib/uploads';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import type { Database } from '@/types/database';

type RiskLevel = Database['public']['Tables']['poop_logs']['Row']['risk_level'];
type ManualStatus = Database['public']['Tables']['poop_logs']['Row']['manual_status'];

type RecentLog = {
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

// ─── Quick Log Status Options ────────────────────────────────────────────────

const QUICK_STATUS_OPTIONS: { value: NonNullable<ManualStatus>; label: string; emoji: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }[] = [
  { value: 'normal', label: '正常', emoji: '✅', tone: 'success' },
  { value: 'soft', label: '偏軟', emoji: '🟡', tone: 'warning' },
  { value: 'hard', label: '偏硬', emoji: '🟤', tone: 'warning' },
  { value: 'abnormal', label: '異常', emoji: '🚨', tone: 'danger' },
];

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
  const [analysisResult, setAnalysisResult] = useState<{
    imageUrl: string;
    bristolScore: number | null;
    riskLevel: RiskLevel;
    summary: string | null;
    recommendation: string | null;
    failed?: boolean;
  } | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [detailLog, setDetailLog] = useState<RecentLog | null>(null);

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
    {/* ── 拍照分析 Modal ──────────────────────────────────────────────────── */}
    <Modal visible={!!capturedAsset} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalSafe}>

        {modalPhase === 'analyzing' && (
          <View style={styles.analyzingContainer}>
            {capturedAsset && (
              <Image source={{ uri: capturedAsset.uri }} style={styles.analyzingImage} contentFit="cover" />
            )}
            <View style={styles.analyzingOverlay}>
              <ActivityIndicator size="large" color="#20B2AA" />
              <Text style={styles.analyzingTitle}>AI 分析中...</Text>
              <Text style={styles.analyzingSubtitle}>正在分析健康狀況，請稍候</Text>
            </View>
          </View>
        )}

        {modalPhase === 'result' && analysisResult && (
          <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent}>
            {analysisResult.imageUrl ? (
              <Image source={{ uri: analysisResult.imageUrl }} style={styles.resultImage} contentFit="cover" />
            ) : null}

            <View style={styles.resultBody}>
              <View style={[styles.riskBanner, riskBannerStyle(analysisResult.failed ? null : analysisResult.riskLevel)]}>
                <Text style={styles.riskBannerIcon}>{analysisResult.failed ? '❌' : riskIcon(analysisResult.riskLevel)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.riskBannerTitle, { color: riskBannerStyle(analysisResult.failed ? null : analysisResult.riskLevel).textColor }]}>
                    {analysisResult.failed ? '分析失敗' : riskTitle(analysisResult.riskLevel)}
                  </Text>
                  <Text style={[styles.riskBannerSub, { color: riskBannerStyle(analysisResult.failed ? null : analysisResult.riskLevel).textColor }]}>
                    {analysisResult.summary ?? ''}
                  </Text>
                </View>
              </View>

              {analysisResult.recommendation && (
                <View style={styles.recommendBox}>
                  <Text style={styles.recommendLabel}>建議</Text>
                  <Text style={styles.recommendText}>{analysisResult.recommendation}</Text>
                </View>
              )}

              {/* 異常提示 */}
              {!analysisResult.failed && (analysisResult.riskLevel === 'vet' || analysisResult.riskLevel === 'observe') && (
                <View style={styles.trackingNotice}>
                  <Ionicons name="notifications-outline" size={16} color="#92400e" />
                  <Text style={styles.trackingNoticeText}>明天會提醒你追蹤狀況</Text>
                </View>
              )}

              {!analysisResult.failed && (
                <View style={styles.petPickerSection}>
                  {petAssigned ? (
                    <Text style={styles.petPickerDone}>✓ 已分類</Text>
                  ) : (
                    <>
                      <Text style={styles.petPickerTitle}>這是哪一隻的紀錄？</Text>
                      {pets.length > 0 && (
                        <View style={styles.petPickerRow}>
                          {pets.map((pet) => (
                            <Pressable
                              key={pet.id}
                              style={styles.petPickerButton}
                              onPress={() => void assignPet(pet.id)}>
                              <Text style={styles.petPickerEmoji}>
                                {pet.species === 'dog' ? '🐶' : pet.species === 'cat' ? '🐱' : '🐾'}
                              </Text>
                              <Text style={styles.petPickerName}>{pet.name}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                      <Pressable onPress={closePhotoModal}>
                        <Text style={styles.petPickerSkip}>略過，之後再分類</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              {(petAssigned || analysisResult.failed) && (
                <Pressable style={[styles.modalButton, styles.primaryButton]} onPress={closePhotoModal}>
                  <Text style={styles.primaryButtonText}>完成</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        )}

      </SafeAreaView>
    </Modal>

    {/* ── 快速記錄 Modal ──────────────────────────────────────────────────── */}
    <Modal visible={quickLogVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalSafe}>
        {quickLogDone ? (
          <View style={styles.quickDoneContainer}>
            <Text style={styles.quickDoneEmoji}>
              {selectedStatus === 'normal' ? '✅' : selectedStatus === 'abnormal' ? '🚨' : '📝'}
            </Text>
            <Text style={styles.quickDoneTitle}>記錄完成</Text>
            {(selectedStatus === 'abnormal' || selectedStatus === 'soft') && (
              <View style={styles.trackingNotice}>
                <Ionicons name="notifications-outline" size={16} color="#92400e" />
                <Text style={styles.trackingNoticeText}>明天會提醒你追蹤狀況</Text>
              </View>
            )}
            <Pressable style={[styles.modalButton, styles.primaryButton, { marginTop: 24, width: '80%' }]}
              onPress={() => setQuickLogVisible(false)}>
              <Text style={styles.primaryButtonText}>好</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.quickLogContainer}>
            <Text style={styles.quickLogTitle}>今天狀況如何？</Text>
            <Text style={styles.quickLogSubtitle}>選一個最接近的描述</Text>

            <View style={styles.statusGrid}>
              {QUICK_STATUS_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.statusCard,
                    selectedStatus === opt.value && styles.statusCardSelected,
                    selectedStatus === opt.value && { borderColor: toneBorderColor(opt.tone) },
                  ]}
                  onPress={() => setSelectedStatus(opt.value)}>
                  <Text style={styles.statusEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.statusLabel, selectedStatus === opt.value && { color: '#171d1c', fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.noteInputWrap}>
              <TextInput
                style={styles.noteInput}
                placeholder="補充備註（可略）"
                placeholderTextColor="#bbc9c7"
                value={quickNote}
                onChangeText={setQuickNote}
                maxLength={100}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.primaryButton, !selectedStatus && styles.buttonDisabled]}
                disabled={!selectedStatus || quickLogMutation.isPending}
                onPress={() => void submitQuickLog()}>
                {quickLogMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>記錄</Text>
                )}
              </Pressable>
              <Pressable style={[styles.modalButton, styles.ghostButton]} onPress={() => setQuickLogVisible(false)}>
                <Text style={styles.ghostButtonText}>取消</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>

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

    {/* 歷史記錄詳細 Modal */}
    <Modal visible={!!detailLog} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalSafe}>
        {detailLog && (
          <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent}>
            {detailLog.entryMode === 'quick_log' ? (
              <View style={[styles.detailQuickBanner, { backgroundColor: manualStatusBg(detailLog.manualStatus) }]}>
                <Text style={styles.detailQuickEmoji}>{manualStatusEmoji(detailLog.manualStatus)}</Text>
                <Text style={styles.detailQuickLabel}>{manualStatusLabel(detailLog.manualStatus)}</Text>
              </View>
            ) : detailLog.imageUrl ? (
              <Image source={{ uri: detailLog.imageUrl }} style={styles.resultImage} contentFit="cover" />
            ) : null}

            <View style={styles.resultBody}>
              {detailLog.entryMode === 'photo_ai' && (
                <View style={[styles.riskBanner, riskBannerStyle(detailLog.riskLevel)]}>
                  <Text style={styles.riskBannerIcon}>{riskIcon(detailLog.riskLevel)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.riskBannerTitle, { color: riskBannerStyle(detailLog.riskLevel).textColor }]}>
                      {riskTitle(detailLog.riskLevel)}
                    </Text>
                    {detailLog.summary ? (
                      <Text style={[styles.riskBannerSub, { color: riskBannerStyle(detailLog.riskLevel).textColor }]}>
                        {detailLog.summary}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}

              {detailLog.note && (
                <View style={styles.recommendBox}>
                  <Text style={styles.recommendLabel}>備註</Text>
                  <Text style={styles.recommendText}>{detailLog.note}</Text>
                </View>
              )}

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>寵物</Text>
                <Text style={styles.resultValue}>{detailLog.petName}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>時間</Text>
                <Text style={styles.resultValue}>{new Date(detailLog.capturedAt).toLocaleString('zh-TW')}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>記錄方式</Text>
                <Text style={styles.resultValue}>{detailLog.entryMode === 'quick_log' ? '快速記錄' : '拍照分析'}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.primaryButton]} onPress={() => setDetailLog(null)}>
                <Text style={styles.primaryButtonText}>關閉</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>

    </>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function StatusPill({ label, tone }: { label: string; tone: 'danger' | 'neutral' | 'success' | 'warning' }) {
  const tones = {
    danger: { bg: '#fde8e8', text: '#9a3412' },
    neutral: { bg: '#e9efed', text: '#3c4948' },
    success: { bg: '#d8f3e8', text: '#166534' },
    warning: { bg: '#fef3c7', text: '#92400e' },
  };
  return (
    <View style={[styles.pill, { backgroundColor: tones[tone].bg }]}>
      <Text style={[styles.pillText, { color: tones[tone].text }]}>{label}</Text>
    </View>
  );
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function logStatusLabel(log: RecentLog) {
  if (log.entryMode === 'quick_log') return manualStatusLabel(log.manualStatus);
  if (log.status !== 'done') return '待分析';
  if (log.riskLevel === 'normal') return '正常';
  if (log.riskLevel === 'observe') return '觀察';
  if (log.riskLevel === 'vet') return '就醫';
  return '已記錄';
}

function logStatusTone(log: RecentLog): 'danger' | 'neutral' | 'success' | 'warning' {
  if (log.entryMode === 'quick_log') {
    if (log.manualStatus === 'normal') return 'success';
    if (log.manualStatus === 'abnormal') return 'danger';
    if (log.manualStatus === 'soft' || log.manualStatus === 'hard') return 'warning';
    return 'neutral';
  }
  if (log.riskLevel === 'normal') return 'success';
  if (log.riskLevel === 'observe') return 'warning';
  if (log.riskLevel === 'vet') return 'danger';
  return 'neutral';
}

function manualStatusLabel(status: ManualStatus) {
  if (status === 'normal') return '正常';
  if (status === 'soft') return '偏軟';
  if (status === 'hard') return '偏硬';
  if (status === 'abnormal') return '異常';
  return '未知';
}

function manualStatusEmoji(status: ManualStatus) {
  if (status === 'normal') return '✅';
  if (status === 'soft') return '🟡';
  if (status === 'hard') return '🟤';
  if (status === 'abnormal') return '🚨';
  return '❓';
}

function manualStatusBg(status: ManualStatus) {
  if (status === 'normal') return '#d8f3e8';
  if (status === 'soft' || status === 'hard') return '#fef3c7';
  if (status === 'abnormal') return '#fde8e8';
  return '#e9efed';
}

function toneBorderColor(tone: 'success' | 'warning' | 'danger' | 'neutral') {
  if (tone === 'success') return '#6ee7b7';
  if (tone === 'warning') return '#fcd34d';
  if (tone === 'danger') return '#fca5a5';
  return '#bbc9c7';
}

function riskTitle(riskLevel: RiskLevel) {
  if (riskLevel === 'normal') return '狀況正常';
  if (riskLevel === 'observe') return '需要觀察';
  if (riskLevel === 'vet') return '建議就醫';
  return '分析完成';
}

function riskIcon(riskLevel: RiskLevel) {
  if (riskLevel === 'normal') return '✅';
  if (riskLevel === 'observe') return '⚠️';
  if (riskLevel === 'vet') return '🏥';
  return '📋';
}

function riskBannerStyle(riskLevel: RiskLevel) {
  if (riskLevel === 'normal') return { backgroundColor: '#d8f3e8', borderColor: '#6ee7b7', textColor: '#065f46' };
  if (riskLevel === 'observe') return { backgroundColor: '#fef3c7', borderColor: '#fcd34d', textColor: '#92400e' };
  if (riskLevel === 'vet') return { backgroundColor: '#fde8e8', borderColor: '#fca5a5', textColor: '#9a3412' };
  return { backgroundColor: '#e9efed', borderColor: '#bbc9c7', textColor: '#3c4948' };
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
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', gap: 12, marginTop: 24, paddingHorizontal: 40 },
  emptyText: { color: '#6c7a78', fontSize: 15, lineHeight: 22, textAlign: 'center' },

  // Modal base
  modalSafe: { flex: 1, backgroundColor: '#ffffff' },
  modalActions: { gap: 12, padding: 24 },
  modalButton: { alignItems: 'center', borderRadius: 16, height: 54, justifyContent: 'center' },
  primaryButton: { backgroundColor: '#20B2AA' },
  primaryButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  ghostButton: { backgroundColor: '#e9efed' },
  ghostButtonText: { color: '#3c4948', fontSize: 17, fontWeight: '600' },
  buttonDisabled: { opacity: 0.4 },

  // Analyzing
  analyzingContainer: { flex: 1, position: 'relative' },
  analyzingImage: { flex: 1, opacity: 0.4 },
  analyzingOverlay: {
    alignItems: 'center', bottom: 0, gap: 12, justifyContent: 'center',
    left: 0, position: 'absolute', right: 0, top: 0,
  },
  analyzingTitle: { color: '#171d1c', fontSize: 22, fontWeight: '700' },
  analyzingSubtitle: { color: '#6c7a78', fontSize: 15 },

  // Result
  resultScroll: { flex: 1 },
  resultContent: { paddingBottom: 8 },
  resultImage: { height: 260, width: '100%' },
  resultBody: { gap: 16, padding: 20 },
  riskBanner: {
    alignItems: 'center', borderRadius: 16, borderWidth: 1,
    flexDirection: 'row', gap: 14, padding: 16,
  },
  riskBannerIcon: { fontSize: 32 },
  riskBannerTitle: { fontSize: 18, fontWeight: '700' },
  riskBannerSub: { fontSize: 14, marginTop: 2, opacity: 0.8 },
  resultRow: {
    alignItems: 'center', backgroundColor: '#f5fbf9', borderRadius: 12,
    flexDirection: 'row', justifyContent: 'space-between', padding: 14,
  },
  resultLabel: { color: '#6c7a78', fontSize: 15 },
  resultValue: { color: '#171d1c', fontSize: 15, fontWeight: '700' },
  recommendBox: { backgroundColor: '#f5fbf9', borderRadius: 12, gap: 6, padding: 14 },
  recommendLabel: {
    color: '#6c7a78', fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  recommendText: { color: '#3c4948', fontSize: 15, lineHeight: 22 },

  // Tracking notice
  trackingNotice: {
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  trackingNoticeText: { color: '#92400e', fontSize: 14, fontWeight: '500' },

  // Pet picker
  petPickerSection: {
    borderTopColor: '#e3e9e8', borderTopWidth: StyleSheet.hairlineWidth, gap: 12, paddingTop: 16,
  },
  petPickerTitle: {
    color: '#6c7a78', fontSize: 13, fontWeight: '600',
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  petPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  petPickerButton: {
    alignItems: 'center', backgroundColor: '#f5fbf9', borderColor: '#e3e9e8',
    borderRadius: 12, borderWidth: 1, flexDirection: 'row',
    gap: 6, paddingHorizontal: 14, paddingVertical: 10,
  },
  petPickerEmoji: { fontSize: 18 },
  petPickerName: { color: '#171d1c', fontSize: 15, fontWeight: '600' },
  petPickerSkip: { color: '#bbc9c7', fontSize: 14, textAlign: 'center' },
  petPickerDone: { color: '#16a34a', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  // Quick log modal
  quickLogContainer: { flex: 1, paddingTop: 32 },
  quickLogTitle: {
    color: '#171d1c', fontSize: 24, fontWeight: '700',
    textAlign: 'center', marginBottom: 6,
  },
  quickLogSubtitle: { color: '#6c7a78', fontSize: 15, textAlign: 'center', marginBottom: 32 },
  statusGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    justifyContent: 'center', paddingHorizontal: 24,
  },
  statusCard: {
    alignItems: 'center',
    backgroundColor: '#f5fbf9',
    borderColor: '#e3e9e8',
    borderRadius: 16,
    borderWidth: 2,
    gap: 8,
    paddingVertical: 20,
    width: '44%',
  },
  statusCardSelected: { backgroundColor: '#f0fdf9' },
  statusEmoji: { fontSize: 36 },
  statusLabel: { color: '#6c7a78', fontSize: 16, fontWeight: '600' },
  noteInputWrap: { marginHorizontal: 24, marginTop: 20 },
  noteInput: {
    backgroundColor: '#f5fbf9',
    borderColor: '#e3e9e8',
    borderRadius: 12,
    borderWidth: 1,
    color: '#171d1c',
    fontSize: 15,
    padding: 14,
  },

  // Quick done
  quickDoneContainer: { alignItems: 'center', flex: 1, justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  quickDoneEmoji: { fontSize: 64 },
  quickDoneTitle: { color: '#171d1c', fontSize: 24, fontWeight: '700' },

  // Detail modal quick banner
  detailQuickBanner: {
    alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 48,
  },
  detailQuickEmoji: { fontSize: 56 },
  detailQuickLabel: { fontSize: 20, fontWeight: '700', color: '#3c4948' },
});
