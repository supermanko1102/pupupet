import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const buttonStyle = {
  alignItems: 'center' as const,
  height: 40,
  justifyContent: 'center' as const,
  width: 40,
};

export function MenuHeaderButton() {
  return (
    <Pressable
      hitSlop={8}
      onPress={() => router.push('/settings' as never)}
      style={[buttonStyle, { marginLeft: 16 }]}>
      <Ionicons name="menu" size={24} color="#006a65" />
    </Pressable>
  );
}

export function NotificationsHeaderButton() {
  return (
    <Pressable
      hitSlop={8}
      style={[buttonStyle, { marginRight: 16 }]}>
      <Ionicons name="notifications-outline" size={22} color="#006a65" />
    </Pressable>
  );
}
