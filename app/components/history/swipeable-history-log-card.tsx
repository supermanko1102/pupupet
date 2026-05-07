import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { HistoryLogCard } from '@/components/history/history-log-card';
import type { HistoryLog } from '@/hooks/use-poop-logs';

type Props = {
  isDeleting?: boolean;
  log: HistoryLog;
  onDelete: (log: HistoryLog) => void;
  onPress: () => void;
};

export function SwipeableHistoryLogCard({
  isDeleting = false,
  log,
  onDelete,
  onPress,
}: Props) {
  const canDelete = log.status === 'done' || log.status === 'failed';

  if (!canDelete) {
    return <HistoryLogCard log={log} onPress={onPress} />;
  }

  return (
    <ReanimatedSwipeable
      enabled={!isDeleting}
      friction={2}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.actionOuter}>
          <Pressable
            android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
            disabled={isDeleting}
            onPress={() => onDelete(log)}
            style={({ pressed }) => [styles.deleteAction, pressed && styles.actionPressed]}>
            {isDeleting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#ffffff" />
            )}
            <Text style={styles.deleteActionText}>{isDeleting ? '刪除中' : '刪除'}</Text>
          </Pressable>
        </View>
      )}
      rightThreshold={42}>
      <HistoryLogCard log={log} onPress={onPress} />
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  actionOuter: {
    marginBottom: 10,
    marginRight: 20,
    width: 86,
  },
  actionPressed: { opacity: 0.82 },
  deleteAction: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 16,
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  deleteActionText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
});
