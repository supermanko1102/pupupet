import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { settingsRouteStyles as shared } from '@/components/settings/route-shared';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';

export default function SettingsAccountScreen() {
  const { user } = useSession();

  async function signOut() {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('登出失敗', error.message);
      return;
    }

    router.dismissAll();
    router.replace('/sign-in' as never);
  }

  function handleSignOut() {
    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '登出', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <SafeAreaView style={shared.screen} edges={['bottom']}>
      <ScrollView style={shared.scroll} contentContainerStyle={shared.content} showsVerticalScrollIndicator={false}>
        <View style={shared.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>電子郵件</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
          </View>
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#9a3412" />
          <Text style={styles.signOutText}>登出</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: { color: '#6c7a78', fontSize: 15 },
  infoValue: { color: '#171d1c', flex: 1, fontSize: 15, textAlign: 'right' },
  signOutButton: {
    alignItems: 'center',
    backgroundColor: '#fde8e8',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    justifyContent: 'center',
  },
  signOutText: { color: '#9a3412', fontSize: 16, fontWeight: '600' },
});
