import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import type { Database } from '@/types/database';

type RiskLevel = Database['public']['Tables']['poop_logs']['Row']['risk_level'];

type LogItem = {
  capturedAt: string;
  id: string;
  imagePath: string;
  imageUrl: string | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [detailLog, setDetailLog] = useState<LogItem | null>(null);
  const offsetRef = useRef(0);

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
        .select('id, captured_at, image_path, status, summary, recommendation, risk_level, pets(name)')
        .order('captured_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      const items: LogItem[] = await Promise.all(
        (rows ?? []).map(async (row) => {
          const petName =
            row.pets && typeof row.pets === 'object' && 'name' in row.pets
              ? (row.pets as { name: string }).name
              : '未命名寵物';
          const { data: signedData } = await supabase!.storage
            .from('poop-photos')
            .createSignedUrl(row.image_path, 60 * 60);
          return {
            capturedAt: row.captured_at,
            id: row.id,
            imagePath: row.image_path,
            imageUrl: signedData?.signedUrl ?? null,
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
  }, [fetchLogs]);

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
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="paw-outline" size={48} color="#bbc9c7" />
              <Text style={styles.emptyTitle}>還沒有紀錄</Text>
              <Text style={styles.emptySubtitle}>回首頁拍照，開始記錄毛孩健康</Text>
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
              {detailLog.imageUrl ? (
                <Image
                  source={{ uri: detailLog.imageUrl }}
                  style={styles.modalImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.modalImage, styles.modalImageFallback]}>
                  <Ionicons name="image-outline" size={40} color="#bbc9c7" />
                </View>
              )}

              <View style={styles.modalBody}>
                <View style={[styles.riskBanner, riskBannerStyle(detailLog.riskLevel)]}>
                  <Text style={styles.riskBannerIcon}>{riskIcon(detailLog.riskLevel)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.riskBannerTitle,
                        { color: riskBannerStyle(detailLog.riskLevel).textColor },
                      ]}>
                      {riskTitle(detailLog.riskLevel)}
                    </Text>
                    {detailLog.summary ? (
                      <Text
                        style={[
                          styles.riskBannerSub,
                          { color: riskBannerStyle(detailLog.riskLevel).textColor },
                        ]}>
                        {detailLog.summary}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>寵物</Text>
                  <Text style={styles.infoValue}>{detailLog.petName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>時間</Text>
                  <Text style={styles.infoValue}>
                    {new Date(detailLog.capturedAt).toLocaleString('zh-TW')}
                  </Text>
                </View>

                {detailLog.recommendation ? (
                  <View style={styles.recommendBox}>
                    <Text style={styles.recommendLabel}>建議</Text>
                    <Text style={styles.recommendText}>{detailLog.recommendation}</Text>
                  </View>
                ) : null}
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

function LogCard({ log, onPress }: { log: LogItem; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {log.imageUrl ? (
        <Image source={{ uri: log.imageUrl }} style={styles.cardImage} contentFit="cover" />
      ) : (
        <View style={[styles.cardImage, styles.cardImageFallback]}>
          <Ionicons name="image-outline" size={22} color="#bbc9c7" />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={styles.cardPetName}>{log.petName}</Text>
          <StatusPill
            label={riskLabel(log.riskLevel, log.status)}
            tone={riskTone(log.riskLevel)}
          />
        </View>
        <Text style={styles.cardDate}>
          {new Date(log.capturedAt).toLocaleString('zh-TW')}
        </Text>
        {log.summary ? (
          <Text style={styles.cardSummary} numberOfLines={2}>
            {log.summary}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'danger' | 'neutral' | 'success' | 'warning';
}) {
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

function riskLabel(riskLevel: RiskLevel, status: string) {
  if (status !== 'done') return '分析中';
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
  if (riskLevel === 'normal')
    return { backgroundColor: '#d8f3e8', borderColor: '#6ee7b7', textColor: '#065f46' };
  if (riskLevel === 'observe')
    return { backgroundColor: '#fef3c7', borderColor: '#fcd34d', textColor: '#92400e' };
  if (riskLevel === 'vet')
    return { backgroundColor: '#fde8e8', borderColor: '#fca5a5', textColor: '#9a3412' };
  return { backgroundColor: '#e9efed', borderColor: '#bbc9c7', textColor: '#3c4948' };
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 32,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
  },
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
  cardImage: {
    borderRadius: 12,
    height: 80,
    width: 80,
  },
  cardImageFallback: {
    alignItems: 'center',
    backgroundColor: '#e9efed',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  cardRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardPetName: {
    color: '#171d1c',
    fontSize: 15,
    fontWeight: '600',
  },
  cardDate: {
    color: '#6c7a78',
    fontSize: 12,
  },
  cardSummary: {
    color: '#3c4948',
    fontSize: 13,
    lineHeight: 18,
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
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyTitle: {
    color: '#171d1c',
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#6c7a78',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalSafe: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  modalContent: {
    paddingBottom: 8,
  },
  modalImage: {
    height: 260,
    width: '100%',
  },
  modalImageFallback: {
    alignItems: 'center',
    backgroundColor: '#e9efed',
    justifyContent: 'center',
  },
  modalBody: {
    gap: 12,
    padding: 20,
  },
  modalActions: {
    gap: 12,
    padding: 24,
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
  infoRow: {
    alignItems: 'center',
    backgroundColor: '#f5fbf9',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  infoLabel: {
    color: '#6c7a78',
    fontSize: 15,
  },
  infoValue: {
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
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  recommendText: {
    color: '#3c4948',
    fontSize: 15,
    lineHeight: 22,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#20B2AA',
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
});
