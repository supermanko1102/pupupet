import * as Notifications from 'expo-notifications';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { cancelFollowUp } from '@/lib/notifications';
import type { RecentLog } from '@/hooks/use-poop-logs';

type Props = {
  recentLogs: RecentLog[];
  onOpenFollowUp: (log: RecentLog) => void;
};

export function NotificationDebugPanel({ recentLogs, onOpenFollowUp }: Props) {
  if (recentLogs.length === 0) return null;

  const firstAbnormal = recentLogs.find(
    (l) => l.riskLevel === 'vet' || l.riskLevel === 'observe'
  ) ?? recentLogs[0];

  async function scheduleIn5Seconds() {
    await cancelFollowUp(firstAbnormal.id);
    await Notifications.scheduleNotificationAsync({
      identifier: `follow_up_${firstAbnormal.id}`,
      content: {
        title: '記得追蹤昨天的異常',
        body: '（測試）昨天有記錄到異常狀況，今天排便後記得再記錄一次。',
        data: { logId: firstAbnormal.id, type: 'abnormal_follow_up' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        repeats: false,
      },
    });
    Alert.alert('✅ 通知已排程', '5 秒後點擊測試 tap → navigate 流程');
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>🛠 DEV: 通知測試</Text>
      <Text style={styles.target} numberOfLines={1}>
        目標 log：{firstAbnormal.id.slice(0, 8)}… ({firstAbnormal.riskLevel ?? firstAbnormal.manualStatus})
      </Text>
      <Pressable style={styles.btn} onPress={() => onOpenFollowUp(firstAbnormal)}>
        <Text style={styles.btnText}>直接開 Follow-up Modal</Text>
      </Pressable>
      <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => void scheduleIn5Seconds()}>
        <Text style={[styles.btnText, { color: '#3c4948' }]}>排一個 5 秒後的通知</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#fef9c3',
    borderColor: '#fde047',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    width: '100%',
  },
  title: { color: '#713f12', fontSize: 13, fontWeight: '700' },
  target: { color: '#92400e', fontSize: 12 },
  btn: {
    alignItems: 'center',
    backgroundColor: '#20B2AA',
    borderRadius: 10,
    paddingVertical: 10,
  },
  btnSecondary: { backgroundColor: '#e9efed' },
  btnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});
