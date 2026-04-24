import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import type { RewardFeedback } from '@/lib/catalog';

export function UnlockFeedbackCard({ feedback }: { feedback: RewardFeedback }) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 180 });
    opacity.value = withDelay(50, withSpring(1, { damping: 20, stiffness: 200 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <View style={styles.iconWrap}>
        <Text style={styles.emoji}>{feedback.emoji}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{feedback.title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {feedback.body}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: '#f0fdf9',
    borderColor: '#6ee7b7',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  emoji: {
    fontSize: 22,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#065f46',
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: '#3c4948',
    fontSize: 14,
    lineHeight: 20,
  },
});
