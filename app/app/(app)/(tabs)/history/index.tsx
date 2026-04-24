import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HistoryEmptyRecords } from '@/components/history/history-empty-records';
import { HistoryHeader } from '@/components/history/history-header';
import { HistoryLogCard } from '@/components/history/history-log-card';
import {
  buildCurrentMonthDays,
  buildRangeSummary,
  buildRecentDays,
  buildSections,
  isAbnormalLog,
  RANGE_OPTIONS,
  type DayMetric,
  type RangeKey,
} from '@/lib/history-metrics';
import {
  useHistoryLogs,
  useHistoryLogsForDate,
  useStats,
  useTrendSummary,
} from '@/hooks/use-poop-logs';

export default function HistoryScreen() {
  const [rangeKey, setRangeKey] = useState<RangeKey>('7d');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [abnormalOnly, setAbnormalOnly] = useState(false);

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
  const {
    data: selectedDayLogs = [],
    isLoading: isSelectedDayLoading,
    isRefetching: isSelectedDayRefetching,
    refetch: refetchSelectedDay,
  } = useHistoryLogsForDate(selectedDate);
  const {
    data: statsData,
    isLoading: isStatsLoading,
    isRefetching: isStatsRefetching,
    refetch: refetchStats,
  } = useStats();
  const { data: trendSummary } = useTrendSummary();

  const logs = data?.pages.flat() ?? [];
  const statsRows = useMemo(() => statsData?.rows ?? [], [statsData?.rows]);
  const currentRangeDays = RANGE_OPTIONS.find((option) => option.key === rangeKey)?.days ?? 7;
  const rangeDays = useMemo(
    () => buildRecentDays(statsRows, currentRangeDays),
    [currentRangeDays, statsRows]
  );
  const monthDays = useMemo(() => buildCurrentMonthDays(statsRows), [statsRows]);
  const rangeSummary = useMemo(() => buildRangeSummary(rangeDays), [rangeDays]);
  const recordDays = useMemo(
    () => monthDays
      .filter((day: DayMetric) => day.count > 0)
      .slice()
      .reverse(),
    [monthDays]
  );

  const baseLogs = selectedDate ? selectedDayLogs : logs;
  const displayLogs = abnormalOnly ? baseLogs.filter(isAbnormalLog) : baseLogs;
  const sections = buildSections(displayLogs, selectedDate);
  const showInitialLoading = isLoading && isStatsLoading;

  function handleLoadMore() {
    if (selectedDate || isFetchingNextPage || !hasNextPage) return;
    void fetchNextPage();
  }

  function handleRefresh() {
    void refetch();
    void refetchStats();
    if (selectedDate) {
      void refetchSelectedDay();
    }
  }

  function handleSelectDate(dateKey: string) {
    setSelectedDate(dateKey);
    setAbnormalOnly(false);
  }

  if (showInitialLoading) {
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
            <HistoryLogCard log={item} onPress={() => router.push(`/logs/${item.id}` as never)} />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={
                (isRefetching && !isFetchingNextPage)
                || isStatsRefetching
                || isSelectedDayRefetching
              }
              onRefresh={handleRefresh}
              tintColor="#20B2AA"
            />
          }
          onEndReached={selectedDate ? undefined : handleLoadMore}
          onEndReachedThreshold={0.3}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <HistoryHeader
              abnormalOnly={abnormalOnly}
              isStatsLoading={isStatsLoading}
              rangeDays={rangeDays}
              rangeKey={rangeKey}
              recordDays={recordDays}
              rangeSummary={rangeSummary}
              selectedDate={selectedDate}
              trendSummary={trendSummary}
              onClearDate={() => setSelectedDate(null)}
              onRangeChange={setRangeKey}
              onSelectDate={handleSelectDate}
              onToggleAbnormalOnly={setAbnormalOnly}
            />
          }
          ListEmptyComponent={
            <HistoryEmptyRecords
              abnormalOnly={abnormalOnly}
              isLoading={!!selectedDate && isSelectedDayLoading}
              selectedDate={selectedDate}
            />
          }
          ListFooterComponent={
            !selectedDate && isFetchingNextPage ? (
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

const styles = StyleSheet.create({
  screen: { backgroundColor: '#ffffff', flex: 1 },
  contentArea: { flex: 1, overflow: 'hidden' },
  centered: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center' },
  errorText: { color: '#6c7a78', fontSize: 15, textAlign: 'center' },
  listContent: { paddingBottom: 32, paddingTop: 8 },
  sectionHeader: {
    backgroundColor: '#ffffff',
    paddingBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  sectionHeaderText: {
    color: '#6c7a78',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: { alignItems: 'center', paddingVertical: 20 },
});
