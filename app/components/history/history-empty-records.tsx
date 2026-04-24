import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function HistoryEmptyRecords({
  abnormalOnly,
  isLoading,
  selectedDate,
}: {
  abnormalOnly: boolean;
  isLoading: boolean;
  selectedDate: string | null;
}) {
  if (isLoading) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator size="small" color="#20B2AA" />
        <Text style={styles.emptySubtitle}>載入這天的紀錄中</Text>
      </View>
    );
  }

  return (
    <View style={styles.emptyState}>
      <Ionicons name={abnormalOnly ? 'checkmark-circle-outline' : 'paw-outline'} size={44} color="#bbc9c7" />
      <Text style={styles.emptyTitle}>
        {selectedDate ? '這天沒有符合的紀錄' : abnormalOnly ? '目前沒有異常紀錄' : '還沒有紀錄'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {selectedDate ? '尚無資料符合目前條件。' : '回首頁記錄第一筆，只需要 5 秒。'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 48,
  },
  emptyTitle: { color: '#171d1c', fontSize: 17, fontWeight: '700' },
  emptySubtitle: { color: '#6c7a78', fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
