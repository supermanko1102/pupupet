import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SettingsPanel } from '@/components/settings-panel';
import { StatsPanel } from '@/components/stats-panel';

type ActiveTab = 'scan' | 'stats';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { uploadPoopPhoto } from '@/lib/uploads';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import type { Database } from '@/types/database';

type Pet = Database['public']['Tables']['pets']['Row'];
type RiskLevel = Database['public']['Tables']['poop_logs']['Row']['risk_level'];

type RecentLog = {
  bristolScore: number | null;
  capturedAt: string;
  id: string;
  imageUrl: string | null;
  petName: string;
  riskLevel: RiskLevel;
  status: string;
  summary: string | null;
};

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { isReady, user } = useSession();
  const palette = Colors[colorScheme];

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('scan');
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

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [capturedAsset, setCapturedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [modalPhase, setModalPhase] = useState<'preview' | 'analyzing' | 'result'>('preview');
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

  const loadDashboard = useCallback(
    async (isPullToRefresh = false) => {
      if (!supabase || !user) return;

      const client = supabase;

      if (isPullToRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const [{ data: petsData }, { data: logRows }] = await Promise.all([
        client.from('pets').select('*').order('created_at', { ascending: false }),
        client
          .from('poop_logs')
          .select('id, captured_at, image_path, status, summary, risk_level, bristol_score, pets(name)')
          .order('captured_at', { ascending: false })
          .limit(8),
      ]);

      const nextPets = petsData ?? [];
      setPets(nextPets);
      setSelectedPetId((current) => {
        if (current && nextPets.some((p) => p.id === current)) return current;
        return nextPets[0]?.id ?? null;
      });

      const nextLogs = await Promise.all(
        (logRows ?? []).map(async (row) => {
          const petNameValue =
            row.pets && typeof row.pets === 'object' && 'name' in row.pets
              ? row.pets.name
              : '未命名寵物';
          const { data } = await client.storage
            .from('poop-photos')
            .createSignedUrl(row.image_path, 60 * 60);
          return {
            bristolScore: row.bristol_score,
            capturedAt: row.captured_at,
            id: row.id,
            imageUrl: data?.signedUrl ?? null,
            petName: petNameValue,
            riskLevel: row.risk_level,
            status: row.status,
            summary: row.summary,
          } satisfies RecentLog;
        })
      );

      setRecentLogs(nextLogs);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [user]
  );

  useEffect(() => {
    if (!isReady || !user || !supabase) return;
    void loadDashboard();
  }, [isReady, loadDashboard, user]);

  async function ensureDefaultPet() {
    if (!supabase) throw new Error('Supabase 尚未設定完成。');
    const existingPetId = selectedPetId ?? pets[0]?.id;
    if (existingPetId) return existingPetId;

    const { data, error } = await supabase
      .from('pets')
      .insert({ name: '我的毛孩', species: 'dog' })
      .select()
      .single();

    if (error) throw error;
    setPets((current) => [data, ...current]);
    setSelectedPetId(data.id);
    return data.id;
  }

  async function uploadAsset(asset: ImagePicker.ImagePickerAsset) {
    if (!supabase || !user) return;
    setCapturedAsset(asset);
    setModalPhase('analyzing');
    setIsUploading(true);
    try {
      const petId = await ensureDefaultPet();
      const imagePath = await uploadPoopPhoto(user.id, asset);
      const { data: newLog, error } = await supabase
        .from('poop_logs')
        .insert({ pet_id: petId, image_path: imagePath, status: 'uploaded' })
        .select('id, image_path')
        .single();
      if (error) throw error;
      startPolling(newLog.id, newLog.image_path);
    } catch (err) {
      Alert.alert('上傳失敗', err instanceof Error ? err.message : '請稍後再試。');
      closeModal();
    } finally {
      setIsUploading(false);
    }
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

        setAnalysisResult({
          imageUrl: signedData?.signedUrl ?? '',
          bristolScore: data.bristol_score,
          riskLevel: data.status === 'failed' ? null : data.risk_level,
          summary: data.status === 'failed' ? '分析失敗，請重新拍照。' : data.summary,
          recommendation: data.status === 'failed' ? null : data.recommendation,
          failed: data.status === 'failed',
        });
        setModalPhase('result');
        void loadDashboard();
      }
    }, 2000);
  }

  function closeModal() {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = null;
    setCapturedAsset(null);
    setModalPhase('preview');
    setAnalysisResult(null);
  }

  return (
    <>
    {/* 拍照 / 分析 / 結果 Modal */}
    <Modal visible={!!capturedAsset} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalSafe}>

        {/* 分析中 */}
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

        {/* 階段三：分析結果 */}
        {modalPhase === 'result' && analysisResult && (
          <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent}>
            {analysisResult.imageUrl ? (
              <Image source={{ uri: analysisResult.imageUrl }} style={styles.resultImage} contentFit="cover" />
            ) : null}

            <View style={styles.resultBody}>
              {/* 風險等級 */}
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

              {/* 建議 */}
              {analysisResult.recommendation && (
                <View style={styles.recommendBox}>
                  <Text style={styles.recommendLabel}>建議</Text>
                  <Text style={styles.recommendText}>{analysisResult.recommendation}</Text>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.uploadButton]} onPress={closeModal}>
                <Text style={styles.uploadButtonText}>完成</Text>
              </Pressable>
            </View>
          </ScrollView>
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

        {/* Content + Tab Bar */}
        <View style={styles.bodyWrap}>
          <View style={styles.contentArea}>
            {/* 統計 tab */}
            {activeTab === 'stats' && <StatsPanel />}

            {/* 掃描 tab */}
            {activeTab === 'scan' && (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => (user ? void loadDashboard(true) : undefined)}
                />
              }>
          {/* Hero Text */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>準備好健康檢查了嗎？</Text>
            <Text style={styles.heroSubtitle}>確保你的毛孩今天狀態最佳。</Text>
          </View>

          {/* Scan Button */}
          <View style={styles.scanButtonWrap}>
            <Pressable
              style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
              onPress={() => void startScan()}
              disabled={isUploading || !user}>
              {isUploading ? (
                <ActivityIndicator size="large" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="camera" size={56} color="#ffffff" style={styles.scanIcon} />
                  <Text style={styles.scanLabel}>開始掃描</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={styles.libraryButton}
              onPress={() => void pickFromLibrary()}
              disabled={isUploading || !user}>
              <Ionicons name="images-outline" size={18} color="#6c7a78" />
              <Text style={styles.libraryButtonText}>從相簿選擇</Text>
            </Pressable>
          </View>

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
                  {log.imageUrl ? (
                    <Image source={{ uri: log.imageUrl }} style={styles.logImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.logImage, styles.logImageFallback]}>
                      <Ionicons name="image-outline" size={24} color="#bbc9c7" />
                    </View>
                  )}
                  <View style={styles.logMeta}>
                    <View style={styles.logRow}>
                      <Text style={styles.logPetName}>{log.petName}</Text>
                      <StatusPill label={riskLabel(log.riskLevel, log.status)} tone={riskTone(log.riskLevel)} />
                    </View>
                    <Text style={styles.logDate}>
                      {new Date(log.capturedAt).toLocaleString('zh-TW')}
                    </Text>
                    {log.summary ? (
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
              <Text style={styles.emptyText}>還沒有紀錄，點上方按鈕開始第一次掃描。</Text>
            </View>
          )}
            </ScrollView>
            )}

            {/* Settings overlay — covers content area only */}
            {menuOpen && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }]}>
                <SettingsPanel />
              </View>
            )}
          </View>

          {/* Custom Tab Bar */}
          <View style={styles.tabBar}>
            <Pressable style={styles.tabItem} onPress={() => setActiveTab('scan')}>
              <Ionicons name="camera" size={22} color={activeTab === 'scan' ? '#20B2AA' : '#bbc9c7'} />
              <Text style={[styles.tabLabel, activeTab === 'scan' && styles.tabLabelActive]}>掃描</Text>
            </Pressable>
            <Pressable style={styles.tabItem} onPress={() => setActiveTab('stats')}>
              <Ionicons name="bar-chart" size={22} color={activeTab === 'stats' ? '#20B2AA' : '#bbc9c7'} />
              <Text style={[styles.tabLabel, activeTab === 'stats' && styles.tabLabelActive]}>統計</Text>
            </Pressable>
          </View>
        </View>

      </SafeAreaView>
    </LinearGradient>

    {/* 歷史記錄詳細 Modal */}
    <Modal visible={!!detailLog} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalSafe}>
        {detailLog && (
          <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent}>
            {detailLog.imageUrl ? (
              <Image source={{ uri: detailLog.imageUrl }} style={styles.resultImage} contentFit="cover" />
            ) : null}
            <View style={styles.resultBody}>
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

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>寵物</Text>
                <Text style={styles.resultValue}>{detailLog.petName}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>時間</Text>
                <Text style={styles.resultValue}>{new Date(detailLog.capturedAt).toLocaleString('zh-TW')}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.uploadButton]} onPress={() => setDetailLog(null)}>
                <Text style={styles.uploadButtonText}>關閉</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>

    </>
  );
}

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

function riskLabel(riskLevel: RiskLevel, status: string) {
  if (status !== 'done') return '待分析';
  if (riskLevel === 'normal') return '正常';
  if (riskLevel === 'observe') return '觀察';
  if (riskLevel === 'vet') return '就醫';
  return '待補資料';
}

function riskTone(riskLevel: RiskLevel): 'danger' | 'neutral' | 'success' | 'warning' {
  if (riskLevel === 'normal') return 'success';
  if (riskLevel === 'observe') return 'warning';
  if (riskLevel === 'vet') return 'danger';
  return 'neutral';
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

const SCAN_BUTTON_SIZE = 224;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  hamburgerButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  iconWrap: {
    height: 26,
    width: 26,
  },
  bodyWrap: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
  },
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e3e9e8',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    paddingBottom: 8,
    paddingTop: 10,
  },
  tabLabel: {
    color: '#bbc9c7',
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#20B2AA',
  },
  brandName: {
    color: '#20B2AA',
    fontWeight: '800',
    fontSize: 20,
    letterSpacing: -0.5,
  },
  notifButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 16,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  heroTitle: {
    color: '#171d1c',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: '#6c7a78',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  scanButtonWrap: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 48,
  },
  scanButton: {
    alignItems: 'center',
    backgroundColor: '#20B2AA',
    borderRadius: SCAN_BUTTON_SIZE / 2,
    height: SCAN_BUTTON_SIZE,
    justifyContent: 'center',
    width: SCAN_BUTTON_SIZE,
    shadowColor: '#20B2AA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  scanButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  scanIcon: {
    marginBottom: 8,
  },
  scanLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  libraryButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
  },
  libraryButtonText: {
    color: '#6c7a78',
    fontSize: 15,
    fontWeight: '500',
  },
  logsSection: {
    gap: 12,
    paddingHorizontal: 20,
    width: '100%',
  },
  logsSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logsSectionTitle: {
    color: '#171d1c',
    fontSize: 17,
    fontWeight: '700',
  },
  logsSectionRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  viewAllText: {
    color: '#20B2AA',
    fontSize: 14,
    fontWeight: '600',
  },
  logCard: {
    backgroundColor: '#f5fbf9',
    borderRadius: 20,
    gap: 12,
    overflow: 'hidden',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e3e9e8',
  },
  logImage: {
    borderRadius: 14,
    height: 160,
    width: '100%',
  },
  logImageFallback: {
    alignItems: 'center',
    backgroundColor: '#e9efed',
    justifyContent: 'center',
  },
  logMeta: {
    gap: 4,
  },
  logRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logPetName: {
    color: '#171d1c',
    fontSize: 15,
    fontWeight: '600',
  },
  logDate: {
    color: '#6c7a78',
    fontSize: 13,
  },
  logSummary: {
    color: '#3c4948',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#6c7a78',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  modalSafe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalTitle: {
    color: '#171d1c',
    fontSize: 18,
    fontWeight: '700',
  },
  modalPreview: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalActions: {
    gap: 12,
    padding: 24,
  },
  modalButton: {
    alignItems: 'center',
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
  },
  uploadButton: {
    backgroundColor: '#20B2AA',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  retakeButton: {
    backgroundColor: '#e9efed',
  },
  retakeButtonText: {
    color: '#3c4948',
    fontSize: 17,
    fontWeight: '600',
  },
  analyzingContainer: {
    flex: 1,
    position: 'relative',
  },
  analyzingImage: {
    flex: 1,
    opacity: 0.4,
  },
  analyzingOverlay: {
    alignItems: 'center',
    bottom: 0,
    gap: 12,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  analyzingTitle: {
    color: '#171d1c',
    fontSize: 22,
    fontWeight: '700',
  },
  analyzingSubtitle: {
    color: '#6c7a78',
    fontSize: 15,
  },
  resultScroll: {
    flex: 1,
  },
  resultContent: {
    paddingBottom: 8,
  },
  resultImage: {
    height: 260,
    width: '100%',
  },
  resultBody: {
    gap: 16,
    padding: 20,
  },
  riskBanner: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  riskBannerIcon: {
    fontSize: 32,
  },
  riskBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  riskBannerSub: {
    fontSize: 14,
    marginTop: 2,
    opacity: 0.8,
  },
  resultRow: {
    alignItems: 'center',
    backgroundColor: '#f5fbf9',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  resultLabel: {
    color: '#6c7a78',
    fontSize: 15,
  },
  resultValue: {
    color: '#171d1c',
    fontSize: 15,
    fontWeight: '700',
  },
  recommendBox: {
    backgroundColor: '#f5fbf9',
    borderRadius: 12,
    gap: 6,
    padding: 14,
  },
  recommendLabel: {
    color: '#6c7a78',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recommendText: {
    color: '#3c4948',
    fontSize: 15,
    lineHeight: 22,
  },
});
