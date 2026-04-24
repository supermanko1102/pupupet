import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';

import { SubHeader, shared } from './_shared';

export function AccountView({ onBack }: { onBack: () => void }) {
  const { user } = useSession();

  function handleSignOut() {
    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '登出', style: 'destructive', onPress: () => void supabase?.auth.signOut() },
    ]);
  }

  return (
    <>
      <SubHeader title="帳號管理" onBack={onBack} />
      <ScrollView style={shared.scroll} contentContainerStyle={shared.content} showsVerticalScrollIndicator={false}>
        <View style={shared.section}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>電子郵件</Text>
            <Text style={s.infoValue} numberOfLines={1}>{user?.email ?? '—'}</Text>
          </View>
        </View>
        <Pressable style={s.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#9a3412" />
          <Text style={s.signOutText}>登出</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
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
