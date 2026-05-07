import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { settingsRouteStyles as shared } from '@/components/settings/route-shared';
import { deleteCurrentAccount } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function SettingsAccountScreen() {
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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
    if (isDeletingAccount) return;

    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '登出', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  async function deleteAccount() {
    setIsDeletingAccount(true);

    try {
      await deleteCurrentAccount();
      router.dismissAll();
      router.replace('/sign-in' as never);
    } catch (error) {
      Alert.alert('刪除失敗', error instanceof Error ? error.message : '請稍後再試。');
    } finally {
      setIsDeletingAccount(false);
    }
  }

  function handleDeleteAccount() {
    if (isDeletingAccount) return;

    Alert.alert(
      '刪除帳號',
      '這會永久刪除你的帳號、寵物資料、便便紀錄、分析結果與已上傳照片。此操作無法復原。',
      [
        { text: '取消', style: 'cancel' },
        { text: '刪除帳號', style: 'destructive', onPress: () => void deleteAccount() },
      ],
    );
  }

  return (
    <SafeAreaView style={shared.screen} edges={['bottom']}>
      <ScrollView
        style={shared.scroll}
        contentContainerStyle={shared.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={[styles.signOutButton, isDeletingAccount && styles.disabled]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={18} color="#9a3412" />
          <Text style={styles.signOutText}>登出</Text>
        </Pressable>
        <Pressable
          style={[styles.deleteButton, isDeletingAccount && styles.disabled]}
          onPress={handleDeleteAccount}
          disabled={isDeletingAccount}
        >
          {isDeletingAccount ? (
            <ActivityIndicator color="#991b1b" size="small" />
          ) : (
            <Ionicons name="trash-outline" size={18} color="#991b1b" />
          )}
          <Text style={styles.deleteButtonText}>
            {isDeletingAccount ? '刪除中' : '永久刪除帳號'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 48,
    justifyContent: 'center',
  },
  deleteButtonText: { color: '#991b1b', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.55 },
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
