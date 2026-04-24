import * as Haptics from 'expo-haptics';

export function lightImpactFeedback() {
  if (process.env.EXPO_OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export function selectionFeedback() {
  if (process.env.EXPO_OS === 'ios') {
    void Haptics.selectionAsync();
  }
}
