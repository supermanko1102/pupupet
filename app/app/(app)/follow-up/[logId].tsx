import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { HistoryLogDetailContent } from '@/components/history-log-detail-content';
import { usePoopLog } from '@/hooks/use-poop-logs';

export default function FollowUpScreen() {
  const { logId } = useLocalSearchParams<{ logId?: string }>();
  const { data: log, isLoading, error } = usePoopLog(logId);

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ title: '異常追蹤' }} />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#20B2AA" />
        </View>
      ) : error || !log ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color="#fca5a5" />
          <Text style={styles.errorText}>找不到這筆追蹤紀錄</Text>
          <Text style={styles.errorSubtext}>可能已被刪除，或尚未同步完成。</Text>
        </View>
      ) : (
        <HistoryLogDetailContent
          footerVariant="follow-up"
          log={log}
          onClose={() => router.replace('/' as never)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#ffffff', flex: 1 },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: { color: '#171d1c', fontSize: 17, fontWeight: '700' },
  errorSubtext: { color: '#6c7a78', fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
