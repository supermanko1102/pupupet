import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { LogDetailModal } from '@/components/log-detail-content';
import { PhotoAnalysisModal } from '@/components/photo-analysis-modal';
import { useLogDetailFlow } from '@/hooks/use-log-detail-flow';
import { usePets } from '@/hooks/use-pets';
import { usePhotoAnalysisFlow } from '@/hooks/use-photo-analysis-flow';
import { useRecentLogs, useTrendSummary } from '@/hooks/use-poop-logs';
import { logStatusLabel } from '@/lib/logs/log-utils';
import { lightImpactFeedback } from '@/lib/haptics';
import { useSession } from '@/providers/session-provider';
import { Brand, Ripple, Surface } from '@/constants/theme';

// ─── Home Screen ──────────────────────────────────────────────────────────────

const BACKGROUND_STEP_COPY = {
  uploading: '正在上傳照片',
  creating: '正在建立紀錄',
  analyzing: 'AI 分析中',
  finalizing: '正在整理結果',
} as const;

function backgroundFailureTitle(reason: string) {
  if (reason === 'not_poop') return '照片無法分析';
  if (reason === 'unclear') return '照片不夠清楚';
  return '暫時無法完成分析';
}

function backgroundFailureSubtitle(reason: string) {
  if (reason === 'not_poop') return '請重新拍攝清楚、完整的便便畫面。';
  if (reason === 'unclear') return '請重新拍攝光線足夠、不模糊的照片。';
  return '連線或分析服務暫時不穩，請稍後再試。';
}

export default function HomeScreen() {
  const { user } = useSession();

  const { data: pets = [] } = usePets();
  const { data: recentLogs = [], isLoading, isRefetching, refetch: refetchLogs } = useRecentLogs();
  const { data: trendSummary } = useTrendSummary();
  const logDetailFlow = useLogDetailFlow();
  const photoAnalysisFlow = usePhotoAnalysisFlow({
    onLogsUpdated: refetchLogs,
  });

  function handleStartScan() {
    lightImpactFeedback();
    void photoAnalysisFlow.startScan();
  }

  function handlePickFromLibrary() {
    lightImpactFeedback();
    void photoAnalysisFlow.pickFromLibrary();
  }

  function handleOpenHistory() {
    lightImpactFeedback();
    router.navigate('/history' as never);
  }

  function handleOpenBackgroundAnalysis() {
    lightImpactFeedback();
    photoAnalysisFlow.openPhotoModal();
  }

  const showBackgroundAnalysisCard =
    !!photoAnalysisFlow.capturedAsset
    && !photoAnalysisFlow.isPhotoModalVisible
    && (photoAnalysisFlow.modalPhase === 'processing' || !!photoAnalysisFlow.analysisResult);
  const backgroundAnalysisDone = photoAnalysisFlow.modalPhase === 'result' && !!photoAnalysisFlow.analysisResult;
  const backgroundAnalysisFailed = !!photoAnalysisFlow.analysisResult?.failed;
  const backgroundFailureReason = photoAnalysisFlow.analysisResult?.failureReason ?? 'system_error';
  const backgroundProgress = Math.max(0, Math.min(1, photoAnalysisFlow.processingProgress));
  const backgroundTitle = backgroundAnalysisDone
    ? backgroundAnalysisFailed ? backgroundFailureTitle(backgroundFailureReason) : '分析完成'
    : BACKGROUND_STEP_COPY[photoAnalysisFlow.processingStep];
  const backgroundSubtitle = backgroundAnalysisDone
    ? backgroundAnalysisFailed
      ? backgroundFailureSubtitle(backgroundFailureReason)
      : '結果已準備好，點開即可查看。'
    : backgroundProgress >= 0.9
      ? '快好了，完成後會更新到最近狀態。'
      : '背景持續處理中，通常需要 10-30 秒。';

  return (
    <>
    <PhotoAnalysisModal
      capturedAsset={photoAnalysisFlow.capturedAsset}
      isVisible={photoAnalysisFlow.isPhotoModalVisible}
      modalPhase={photoAnalysisFlow.modalPhase}
      processingProgress={photoAnalysisFlow.processingProgress}
      processingStep={photoAnalysisFlow.processingStep}
      canDismissProcessing={photoAnalysisFlow.canDismissProcessing}
      analysisResult={photoAnalysisFlow.analysisResult}
      petAssigned={photoAnalysisFlow.petAssigned}
      pets={pets}
      onAssignPet={(petId) => void photoAnalysisFlow.assignPet(petId)}
      onClose={photoAnalysisFlow.closePhotoModal}
      onDismissProcessing={photoAnalysisFlow.dismissProcessingModal}
      onPickPhoto={handlePickFromLibrary}
      onRetake={handleStartScan}
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
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={() => void refetchLogs()} />
              }>

              <View style={styles.heroSection}>
                <Text style={styles.heroTitle}>今天記一下</Text>
                <Text style={styles.heroSubtitle}>拍照分析健康狀況</Text>
              </View>

              <View style={styles.ctaRow}>
                <Pressable
                  style={({ pressed }) => [styles.ctaCard, styles.ctaCardPrimary, pressed && styles.ctaCardPressed]}
                  onPress={handleStartScan}
                  disabled={photoAnalysisFlow.isUploading || !user}>
                  <View style={styles.ctaIconWrap}>
                    <Ionicons name="camera" size={28} color="#ffffff" />
                  </View>
                  <Text style={styles.ctaCardTitle}>拍照分析</Text>
                  <Text style={styles.ctaCardSub}>使用手機相機建立紀錄</Text>
                </Pressable>
              </View>

              <Pressable
                android_ripple={Ripple.onLight}
                style={({ pressed }) => [styles.libraryButton, pressed && styles.buttonPressed]}
                onPress={handlePickFromLibrary}
                disabled={photoAnalysisFlow.isUploading || !user}>
                <Ionicons name="images-outline" size={16} color="#6c7a78" />
                <Text style={styles.libraryButtonText}>從相簿補一筆</Text>
              </Pressable>

              {showBackgroundAnalysisCard && (
                <View style={styles.backgroundAnalysisSection}>
                  <View style={styles.backgroundAnalysisCard}>
                    <Image
                      source={{ uri: photoAnalysisFlow.capturedAsset?.uri }}
                      style={styles.backgroundAnalysisImage}
                      contentFit="cover"
                    />
                    <View style={styles.backgroundAnalysisBody}>
                      <View style={styles.backgroundAnalysisTopRow}>
                        <View style={styles.backgroundAnalysisTitleWrap}>
                          <Text style={styles.backgroundAnalysisTitle}>{backgroundTitle}</Text>
                          <Text style={styles.backgroundAnalysisSubtitle}>{backgroundSubtitle}</Text>
                        </View>
                        <View style={[
                          styles.backgroundAnalysisIcon,
                          backgroundAnalysisFailed
                            ? styles.backgroundAnalysisIconFailed
                            : backgroundAnalysisDone && styles.backgroundAnalysisIconDone,
                        ]}>
                          <Ionicons
                            name={backgroundAnalysisFailed ? 'alert-circle-outline' : backgroundAnalysisDone ? 'checkmark' : 'sparkles-outline'}
                            size={15}
                            color={backgroundAnalysisFailed ? '#92400e' : backgroundAnalysisDone ? '#ffffff' : Brand.primary}
                          />
                        </View>
                      </View>
                      <View style={styles.backgroundProgressTrack}>
                        <View style={[
                          styles.backgroundProgressFill,
                          { width: `${backgroundProgress * 100}%` },
                          backgroundAnalysisDone && styles.backgroundProgressDone,
                        ]} />
                      </View>
                      <View style={styles.backgroundAnalysisActions}>
                        <Text style={styles.backgroundAnalysisHint}>
                          {backgroundAnalysisDone ? '結果已在這裡等你' : '你可以先做其他事'}
                        </Text>
                        <Pressable
                          android_ripple={Ripple.onDark}
                          style={({ pressed }) => [styles.backgroundPrimaryButton, pressed && styles.buttonPressed]}
                          onPress={backgroundAnalysisFailed ? handleStartScan : handleOpenBackgroundAnalysis}>
                          <Text style={styles.backgroundPrimaryButtonText}>
                            {backgroundAnalysisFailed
                              ? backgroundFailureReason === 'system_error' ? '再試一次' : '重新拍照'
                              : backgroundAnalysisDone ? '看結果' : '查看進度'}
                          </Text>
                        </Pressable>
                        <Pressable
                          android_ripple={Ripple.onLight}
                          style={({ pressed }) => [styles.backgroundHistoryButton, pressed && styles.buttonPressed]}
                          onPress={backgroundAnalysisFailed ? handlePickFromLibrary : handleOpenHistory}>
                          <Text style={styles.backgroundHistoryButtonText}>
                            {backgroundAnalysisFailed ? '選照片' : '歷程'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              )}

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
                      android_ripple={Ripple.onDark}
                      style={({ pressed }) => [
                        styles.summaryActionButton,
                        styles.summaryActionPrimary,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={handleOpenHistory}>
                      <Text style={styles.summaryActionPrimaryText}>看完整歷程</Text>
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

              {/* {__DEV__ && (
                <NotificationDebugPanel
                  recentLogs={recentLogs}
                  onOpenFollowUp={(log) => logDetailFlow.openLogDetail(log, { isFollowUp: true })}
                />
              )} */}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>

    <LogDetailModal
      log={logDetailFlow.detailLog}
      variant={logDetailFlow.isFollowUp ? 'follow-up' : 'default'}
      onClose={logDetailFlow.closeLogDetail}
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
  heroTitle: { color: Surface.ink, fontSize: 26, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 },
  heroSubtitle: { color: Surface.muted, fontSize: 15, textAlign: 'center' },

  // Primary action
  ctaRow: { paddingHorizontal: 20, width: '100%', marginBottom: 12 },
  ctaCard: {
    alignItems: 'center',
    borderRadius: 20,
    gap: 8,
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  ctaCardPrimary: {
    backgroundColor: Brand.primary,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
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

  libraryButton: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 32,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  libraryButtonText: { color: Surface.muted, fontSize: 14, fontWeight: '500' },

  backgroundAnalysisSection: { marginBottom: 28, paddingHorizontal: 20, width: '100%' },
  backgroundAnalysisCard: {
    backgroundColor: '#ffffff',
    borderColor: Surface.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    overflow: 'hidden',
    padding: 12,
  },
  backgroundAnalysisImage: { borderRadius: 12, height: 86, width: 72 },
  backgroundAnalysisBody: { flex: 1, gap: 10, minWidth: 0 },
  backgroundAnalysisTopRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  backgroundAnalysisTitleWrap: { flex: 1, gap: 3, minWidth: 0 },
  backgroundAnalysisTitle: { color: Surface.ink, fontSize: 16, fontWeight: '800', lineHeight: 21 },
  backgroundAnalysisSubtitle: { color: Surface.muted, fontSize: 12, lineHeight: 17 },
  backgroundAnalysisIcon: {
    alignItems: 'center',
    backgroundColor: Surface.bgSoft,
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  backgroundAnalysisIconDone: { backgroundColor: Brand.primary },
  backgroundAnalysisIconFailed: { backgroundColor: '#fef3c7' },
  backgroundProgressTrack: {
    backgroundColor: Surface.bgMuted,
    borderRadius: 999,
    height: 7,
    overflow: 'hidden',
  },
  backgroundProgressFill: {
    backgroundColor: Brand.primary,
    borderRadius: 999,
    height: '100%',
  },
  backgroundProgressDone: { backgroundColor: '#16a34a' },
  backgroundAnalysisActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  backgroundAnalysisHint: { color: Surface.mutedSoft, flex: 1, fontSize: 12, fontWeight: '600' },
  backgroundPrimaryButton: {
    backgroundColor: Brand.primary,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  backgroundPrimaryButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  backgroundHistoryButton: {
    backgroundColor: Surface.bgSoft,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  backgroundHistoryButtonText: { color: Surface.inkSoft, fontSize: 12, fontWeight: '800' },

  summarySection: { gap: 10, paddingHorizontal: 20, width: '100%' },
  summarySectionTitle: { color: Surface.ink, fontSize: 17, fontWeight: '700' },
  summaryCard: {
    backgroundColor: Surface.bgSoft,
    borderColor: Surface.border,
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
  summaryTitle: { color: Surface.ink, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  summarySubtitle: { color: Surface.muted, fontSize: 13, lineHeight: 19 },
  summaryActionRow: { flexDirection: 'row', gap: 10 },
  summaryActionButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    overflow: 'hidden',
    paddingHorizontal: 14,
  },
  summaryActionPrimary: { backgroundColor: Brand.primary },
  summaryActionPrimaryText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  buttonPressed: { opacity: 0.72 },
  emptyState: { alignItems: 'center', gap: 12, marginTop: 24, paddingHorizontal: 40 },
  emptyText: { color: Surface.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },

});
