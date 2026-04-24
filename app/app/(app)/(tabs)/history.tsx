import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
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
} from '@/lib/log-utils';
import { StatusPill } from '@/components/status-pill';
import { useHistoryLogs, useTrendSummary, type HistoryLog } from '@/hooks/use-poop-logs';

type Section = {
  data: HistoryLog[];
  title: string;
};

export default function HistoryScreen() {
  const {
    data,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error,
  } = useHistoryLogs();

  const { data: trendSummary } = useTrendSummary();

  const logs = data?.pages.flat() ?? [];
  const sections = buildSections(logs);

  function handleLoadMore() {
    if (isFetchingNextPage || !hasNextPage) return;
    void fetchNextPage();
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#20B2AA" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color="#fca5a5" />
          <Text style={styles.errorText}>載入失敗，請下拉重試</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.contentArea}>
        <SectionList
          contentInsetAdjustmentBehavior="automatic"
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LogCard log={item} onPress={() => router.push(`/logs/${item.id}` as never)} />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          contentContainerStyle={logs.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={() => void refetch()}
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
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color="#20B2AA" />
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

function LogCard({ log, onPress }: { log: HistoryLog; onPress: () => void }) {
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

function buildSections(logs: HistoryLog[]): Section[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const today: HistoryLog[] = [];
  const thisWeek: HistoryLog[] = [];
  const earlier: HistoryLog[] = [];

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

const styles = StyleSheet.create({
  screen: { backgroundColor: '#ffffff', flex: 1 },
  contentArea: { flex: 1, overflow: 'hidden' },
  centered: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center' },
  errorText: { color: '#6c7a78', fontSize: 15, textAlign: 'center' },
  listContent: { paddingBottom: 32, paddingTop: 8 },
  emptyContainer: { flex: 1 },
  trendCard: {
    backgroundColor: '#f0fdf9',
    borderColor: '#6ee7b7',
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    marginBottom: 8,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
  },
  trendRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  trendMessage: { flex: 1, fontSize: 15, fontWeight: '600' },
  trendCount: { color: '#6c7a78', fontSize: 13, marginLeft: 28 },
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
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyTitle: { color: '#171d1c', fontSize: 17, fontWeight: '700' },
  emptySubtitle: { color: '#6c7a78', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  footer: { alignItems: 'center', paddingVertical: 20 },
});
