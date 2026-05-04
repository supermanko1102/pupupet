import { LinearGradient } from 'expo-linear-gradient';
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

import { NotificationDebugPanel } from '@/components/dev/notification-debug-panel';
import { LogDetailModal } from '@/components/log-detail-content';
import { PhotoAnalysisModal } from '@/components/photo-analysis-modal';
import { Ripple } from '@/constants/theme';
import { useLogDetailFlow } from '@/hooks/use-log-detail-flow';
import { usePets } from '@/hooks/use-pets';
import { usePhotoAnalysisFlow } from '@/hooks/use-photo-analysis-flow';
import { useRecentLogs, useTrendSummary } from '@/hooks/use-poop-logs';
import { logStatusLabel } from '@/lib/log-utils';
import { lightImpactFeedback } from '@/lib/haptics';
import { useSession } from '@/providers/session-provider';

// ─── Home Screen ──────────────────────────────────────────────────────────────

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

  return (
    <>
    <PhotoAnalysisModal
      capturedAsset={photoAnalysisFlow.capturedAsset}
      modalPhase={photoAnalysisFlow.modalPhase}
      analysisResult={photoAnalysisFlow.analysisResult}
      petAssigned={photoAnalysisFlow.petAssigned}
      pets={pets}
      onAssignPet={(petId) => void photoAnalysisFlow.assignPet(petId)}
      onClose={photoAnalysisFlow.closePhotoModal}
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

              {__DEV__ && (
                <NotificationDebugPanel
                  recentLogs={recentLogs}
                  onOpenFollowUp={(log) => logDetailFlow.openLogDetail(log, { isFollowUp: true })}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>

    <LogDetailModal
      log={logDetailFlow.detailLog}
      variant={logDetailFlow.isFollowUp ? 'follow-up' : 'default'}
      showEntryModeRow
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
  heroTitle: { color: '#171d1c', fontSize: 26, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 },
  heroSubtitle: { color: '#6c7a78', fontSize: 15, textAlign: 'center' },

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
    backgroundColor: '#20B2AA',
    shadowColor: '#20B2AA',
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
    overflow: 'hidden',
    paddingHorizontal: 14,
  },
  summaryActionPrimary: { backgroundColor: '#20B2AA' },
  summaryActionPrimaryText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  buttonPressed: { opacity: 0.72 },
  emptyState: { alignItems: 'center', gap: 12, marginTop: 24, paddingHorizontal: 40 },
  emptyText: { color: '#6c7a78', fontSize: 15, lineHeight: 22, textAlign: 'center' },

});
