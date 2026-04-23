import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  logStatusLabel,
  logStatusTone,
  manualStatusBg,
  manualStatusEmoji,
  manualStatusLabel,
  riskBannerStyle,
  riskIcon,
  riskTitle,
} from '@/lib/log-utils';
import { StatusPill } from '@/components/status-pill';
import { supabase } from '@/lib/supabase';
import { useTrendSummary } from '@/hooks/use-poop-logs';
import { useSession } from '@/providers/session-provider';
import type { Database } from '@/types/database';

type RiskLevel = Database['public']['Tables']['poop_logs']['Row']['risk_level'];
type ManualStatus = Database['public']['Tables']['poop_logs']['Row']['manual_status'];
type Pet = Database['public']['Tables']['pets']['Row'];

type LogItem = {
  capturedAt: string;
  entryMode: 'quick_log' | 'photo_ai';
  id: string;
  imagePath: string | null;
  imageUrl: string | null;
  manualStatus: ManualStatus;
  note: string | null;
  petId: string | null;
  petName: string;
  recommendation: string | null;
  riskLevel: RiskLevel;
  status: string;
  summary: string | null;
};

type Section = {
  data: LogItem[];
  title: string;
};

const PAGE_SIZE = 20;

export default function HistoryScreen() {
  const { user } = useSession();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [detailLog, setDetailLog] = useState<LogItem | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const offsetRef = useRef(0);

  const { data: trendSummary } = useTrendSummary();

  const fetchLogs = useCallback(
    async (offset: number, isPullToRefresh = false) => {
      if (!supabase || !user) return;

      if (isPullToRefresh) {
        setIsRefreshing(true);
      } else if (offset === 0) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const { data: rows } = await supabase
        .from('poop_logs')
        .select('id, captured_at, image_path, status, summary, recommendation, risk_level, pet_id, entry_mode, manual_status, note, pets(name)')
        .order('captured_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      const items: LogItem[] = await Promise.all(
        (rows ?? []).map(async (row) => {
          const petName =
            row.pets && typeof row.pets === 'object' && 'name' in row.pets
              ? (row.pets as { name: string }).name
              : '未分類';

          let imageUrl: string | null = null;
          if (row.image_path) {
            const { data: signedData } = await supabase!.storage
              .from('poop-photos')
              .createSignedUrl(row.image_path, 60 * 60);
            imageUrl = signedData?.signedUrl ?? null;
          }

          return {
            capturedAt: row.captured_at,
            entryMode: (row.entry_mode ?? 'photo_ai') as 'quick_log' | 'photo_ai',
            id: row.id,
            imagePath: row.image_path ?? null,
            imageUrl,
            manualStatus: row.manual_status as ManualStatus,
            note: row.note ?? null,
            petId: row.pet_id ?? null,
            petName,
            recommendation: row.recommendation,
            riskLevel: row.risk_level,
            status: row.status,
            summary: row.summary,
          };
        })
      );

      if (isPullToRefresh || offset === 0) {
        setLogs(items);
      } else {
        setLogs((prev) => [...prev, ...items]);
      }

      setHasMore(items.length === PAGE_SIZE);
      offsetRef.current = offset + items.length;
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    },
    [user]
  );

  useEffect(() => {
    offsetRef.current = 0;
    void fetchLogs(0);
    if (supabase && user) {
      void supabase.from('pets').select('*').order('created_at', { ascending: true }).then(({ data }) => {
        setPets(data ?? []);
      });
    }
  }, [fetchLogs, user]);

  async function assignPet(logId: string, petId: string) {
    if (!supabase) return;
    setIsAssigning(true);
    const { error } = await supabase.from('poop_logs').update({ pet_id: petId }).eq('id', logId);
    setIsAssigning(false);
    if (error) { Alert.alert('指定失敗', error.message); return; }
    const pet = pets.find((p) => p.id === petId);
    setDetailLog((prev) => prev ? { ...prev, petId, petName: pet?.name ?? prev.petName } : prev);
    setLogs((prev) => prev.map((l) => l.id === logId ? { ...l, petId, petName: pet?.name ?? l.petName } : l));
  }

  function handleRefresh() {
    offsetRef.current = 0;
    setHasMore(true);
    void fetchLogs(0, true);
  }

  function handleLoadMore() {
    if (isLoadingMore || !hasMore) return;
    void fetchLogs(offsetRef.current);
  }

  const sections = buildSections(logs);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#20B2AA" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LogCard log={item} onPress={() => setDetailLog(item)} />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          contentContainerStyle={logs.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#20B2AA"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            trendSummary ? (
              <View style={styles.trendCard}>
                <View style={styles.trendRow}>
                  <Ionicons
                    name={trendSummary.hasRecentAbnormal ? 'warning-outline' : 'checkmark-circle-outline'}
                    size={20}
                    color={trendSummary.hasRecentAbnormal ? '#92400e' : '#065f46'}
                  />
                  <Text style={[
                    styles.trendMessage,
                    { color: trendSummary.hasRecentAbnormal ? '#92400e' : '#065f46' }
                  ]}>
                    {trendSummary.message}
                  </Text>
                </View>
                <Text style={styles.trendCount}>共 {trendSummary.recentCount} 筆紀錄</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="paw-outline" size={48} color="#bbc9c7" />
              <Text style={styles.emptyTitle}>還沒有紀錄</Text>
              <Text style={styles.emptySubtitle}>回首頁記錄第一筆，只需要 5 秒</Text>
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color="#20B2AA" />
              </View>
            ) : null
          }
        />
      </SafeAreaView>

      <Modal visible={!!detailLog} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          {detailLog && (
            <ScrollView contentContainerStyle={styles.modalContent}>
              {detailLog.entryMode === 'quick_log' ? (
                <View style={[styles.modalQuickBanner, { backgroundColor: manualStatusBg(detailLog.manualStatus) }]}>
                  <Text style={styles.modalQuickEmoji}>{manualStatusEmoji(detailLog.manualStatus)}</Text>
                  <Text style={styles.modalQuickLabel}>{manualStatusLabel(detailLog.manualStatus)}</Text>
                  <Text style={styles.modalQuickModeTag}>快速記錄</Text>
                </View>
              ) : detailLog.imageUrl ? (
                <Image source={{ uri: detailLog.imageUrl }} style={styles.modalImage} contentFit="cover" />
              ) : (
                <View style={[styles.modalImage, styles.modalImageFallback]}>
                  <Ionicons name="image-outline" size={40} color="#bbc9c7" />
                </View>
              )}

              <View style={styles.modalBody}>
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

                {detailLog.note ? (
                  <View style={styles.recommendBox}>
                    <Text style={styles.recommendLabel}>備註</Text>
                    <Text style={styles.recommendText}>{detailLog.note}</Text>
                  </View>
                ) : null}

                {detailLog.recommendation ? (
                  <View style={styles.recommendBox}>
                    <Text style={styles.recommendLabel}>建議</Text>
                    <Text style={styles.recommendText}>{detailLog.recommendation}</Text>
                  </View>
                ) : null}

                {detailLog.petId ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>寵物</Text>
                    <Text style={styles.infoValue}>{detailLog.petName}</Text>
                  </View>
                ) : (
                  <View style={styles.unclassifiedBox}>
                    <Text style={styles.unclassifiedLabel}>尚未分類</Text>
                    {pets.length > 0 && (
                      <View style={styles.petPickerRow}>
                        {pets.map((pet) => (
                          <Pressable
                            key={pet.id}
                            style={styles.petPickerButton}
                            disabled={isAssigning}
                            onPress={() => void assignPet(detailLog.id, pet.id)}>
                            <Text style={styles.petPickerEmoji}>
                              {pet.species === 'dog' ? '🐶' : pet.species === 'cat' ? '🐱' : '🐾'}
                            </Text>
                            <Text style={styles.petPickerName}>{pet.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>時間</Text>
                  <Text style={styles.infoValue}>
                    {new Date(detailLog.capturedAt).toLocaleString('zh-TW')}
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable style={styles.closeButton} onPress={() => setDetailLog(null)}>
                  <Text style={styles.closeButtonText}>關閉</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ─── LogCard ──────────────────────────────────────────────────────────────────

function LogCard({ log, onPress }: { log: LogItem; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {log.entryMode === 'quick_log' ? (
        <View style={[styles.cardQuickThumb, { backgroundColor: manualStatusBg(log.manualStatus) }]}>
          <Text style={styles.cardQuickEmoji}>{manualStatusEmoji(log.manualStatus)}</Text>
        </View>
      ) : log.imageUrl ? (
        <Image source={{ uri: log.imageUrl }} style={styles.cardImage} contentFit="cover" />
      ) : (
        <View style={[styles.cardImage, styles.cardImageFallback]}>
          <Ionicons name="image-outline" size={22} color="#bbc9c7" />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={styles.cardPetName}>{log.petName}</Text>
          <StatusPill label={logStatusLabel(log)} tone={logStatusTone(log)} />
        </View>
        <Text style={styles.cardDate}>
          {new Date(log.capturedAt).toLocaleString('zh-TW')}
        </Text>
        {log.note ? (
          <Text style={styles.cardSummary} numberOfLines={1}>{log.note}</Text>
        ) : log.summary ? (
          <Text style={styles.cardSummary} numberOfLines={2}>{log.summary}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSections(logs: LogItem[]): Section[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const today: LogItem[] = [];
  const thisWeek: LogItem[] = [];
  const earlier: LogItem[] = [];

  for (const log of logs) {
    const d = new Date(log.capturedAt);
    if (d >= todayStart) today.push(log);
    else if (d >= weekStart) thisWeek.push(log);
    else earlier.push(log);
  }

  const sections: Section[] = [];
  if (today.length > 0) sections.push({ title: '今天', data: today });
  if (thisWeek.length > 0) sections.push({ title: '本週', data: thisWeek });
  if (earlier.length > 0) sections.push({ title: '更早', data: earlier });
  return sections;
}


// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { backgroundColor: '#ffffff', flex: 1 },
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  listContent: { paddingBottom: 32, paddingTop: 8 },
  emptyContainer: { flex: 1 },

  // Trend summary
  trendCard: {
    backgroundColor: '#f0fdf9',
    borderColor: '#6ee7b7',
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
  },
  trendRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  trendMessage: { flex: 1, fontSize: 15, fontWeight: '600' },
  trendCount: { color: '#6c7a78', fontSize: 13, marginLeft: 28 },

  // Section
  sectionHeader: {
    backgroundColor: '#ffffff',
    paddingBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeaderText: {
    color: '#6c7a78',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Card
  card: {
    backgroundColor: '#f5fbf9',
    borderColor: '#e3e9e8',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    marginHorizontal: 20,
    overflow: 'hidden',
    padding: 12,
  },
  cardImage: { borderRadius: 12, height: 80, width: 80 },
  cardImageFallback: { alignItems: 'center', backgroundColor: '#e9efed', justifyContent: 'center' },
  cardQuickThumb: {
    alignItems: 'center',
    borderRadius: 12,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  cardQuickEmoji: { fontSize: 32 },
  cardBody: { flex: 1, gap: 4, justifyContent: 'center' },
  cardRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardPetName: { color: '#171d1c', fontSize: 15, fontWeight: '600' },
  cardDate: { color: '#6c7a78', fontSize: 12 },
  cardSummary: { color: '#3c4948', fontSize: 13, lineHeight: 18, marginTop: 2 },


  // Empty
  emptyState: {
    alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center',
    paddingHorizontal: 40, paddingTop: 80,
  },
  emptyTitle: { color: '#171d1c', fontSize: 17, fontWeight: '700' },
  emptySubtitle: { color: '#6c7a78', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  footer: { alignItems: 'center', paddingVertical: 20 },

  // Modal
  modalSafe: { backgroundColor: '#ffffff', flex: 1 },
  modalContent: { paddingBottom: 8 },
  modalImage: { height: 260, width: '100%' },
  modalImageFallback: { alignItems: 'center', backgroundColor: '#e9efed', justifyContent: 'center' },
  modalQuickBanner: {
    alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 48,
  },
  modalQuickEmoji: { fontSize: 56 },
  modalQuickLabel: { color: '#3c4948', fontSize: 22, fontWeight: '700' },
  modalQuickModeTag: { color: '#6c7a78', fontSize: 13 },
  modalBody: { gap: 12, padding: 20 },
  modalActions: { gap: 12, padding: 24 },
  riskBanner: {
    alignItems: 'center', borderRadius: 16, borderWidth: 1,
    flexDirection: 'row', gap: 14, padding: 16,
  },
  riskBannerIcon: { fontSize: 32 },
  riskBannerTitle: { fontSize: 18, fontWeight: '700' },
  riskBannerSub: { fontSize: 14, marginTop: 2, opacity: 0.8 },
  infoRow: {
    alignItems: 'center', backgroundColor: '#f5fbf9', borderRadius: 12,
    flexDirection: 'row', justifyContent: 'space-between', padding: 14,
  },
  infoLabel: { color: '#6c7a78', fontSize: 15 },
  infoValue: { color: '#171d1c', fontSize: 15, fontWeight: '700' },
  recommendBox: { backgroundColor: '#f5fbf9', borderRadius: 12, gap: 6, padding: 14 },
  recommendLabel: {
    color: '#6c7a78', fontSize: 13, fontWeight: '600',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  recommendText: { color: '#3c4948', fontSize: 15, lineHeight: 22 },
  closeButton: {
    alignItems: 'center', backgroundColor: '#20B2AA',
    borderRadius: 16, height: 54, justifyContent: 'center',
  },
  closeButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  unclassifiedBox: { backgroundColor: '#f5fbf9', borderRadius: 12, gap: 10, padding: 14 },
  unclassifiedLabel: {
    color: '#6c7a78', fontSize: 13, fontWeight: '600',
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  petPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  petPickerButton: {
    alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e3e9e8',
    borderRadius: 10, borderWidth: 1, flexDirection: 'row',
    gap: 6, paddingHorizontal: 12, paddingVertical: 8,
  },
  petPickerEmoji: { fontSize: 16 },
  petPickerName: { color: '#171d1c', fontSize: 14, fontWeight: '600' },
});
