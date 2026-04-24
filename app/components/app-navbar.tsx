import { router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  title?: string;
};

export function AppNavbar({
  title = 'PupuPet',
}: Props) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.iconButton} onPress={() => router.push('/settings' as never)}>
        <Ionicons name="menu" size={26} color="#006a65" />
      </Pressable>

      <Text style={styles.title}>{title}</Text>

      <Pressable style={styles.iconButton}>
        <Ionicons name="notifications-outline" size={24} color="#006a65" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  title: {
    color: '#20B2AA',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
