import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import type { Database } from '@/types/database';

type Pet = Database['public']['Tables']['pets']['Row'];

export default function SettingsScreen() {
  const { user } = useSession();
  const [pet, setPet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [weightKg, setWeightKg] = useState('');

  const loadPet = useCallback(async () => {
    if (!supabase || !user) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('pets')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (data) {
      setPet(data);
      setName(data.name);
      setBreed(data.breed ?? '');
      setWeightKg(data.weight_kg ? String(data.weight_kg) : '');
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    void loadPet();
  }, [loadPet]);

  async function savePet() {
    if (!supabase || !user || !name.trim()) return;
    setIsSaving(true);

    const fields = {
      name: name.trim(),
      breed: breed.trim() || null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
    };

    try {
      if (pet) {
        const { error } = await supabase.from('pets').update(fields).eq('id', pet.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('pets')
          .insert({ ...fields, species: 'dog' })
          .select()
          .single();
        if (error) throw error;
        setPet(data);
      }
      Alert.alert('儲存成功', '寵物資料已更新。');
    } catch (err) {
      Alert.alert('儲存失敗', err instanceof Error ? err.message : '請稍後再試。');
    } finally {
      setIsSaving(false);
    }
  }

  async function signOut() {
    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '登出',
        style: 'destructive',
        onPress: () => void supabase?.auth.signOut(),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>設定</Text>

        {/* 寵物資料 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>寵物資料</Text>

          {isLoading ? (
            <ActivityIndicator color="#20B2AA" style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>名字</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="例如：小白"
                  placeholderTextColor="#bbc9c7"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>品種</Text>
                <TextInput
                  style={styles.input}
                  value={breed}
                  onChangeText={setBreed}
                  placeholder="例如：柴犬"
                  placeholderTextColor="#bbc9c7"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>體重（kg）</Text>
                <TextInput
                  style={styles.input}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="例如：5.2"
                  placeholderTextColor="#bbc9c7"
                  keyboardType="decimal-pad"
                />
              </View>

              <Pressable
                style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
                onPress={() => void savePet()}
                disabled={isSaving || !name.trim()}>
                {isSaving
                  ? <ActivityIndicator color="#ffffff" />
                  : <Text style={styles.saveButtonText}>儲存</Text>}
              </Pressable>
            </View>
          )}
        </View>

        {/* 帳號 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>帳號</Text>
          <View style={styles.accountRow}>
            <Ionicons name="person-circle-outline" size={20} color="#6c7a78" />
            <Text style={styles.accountEmail} numberOfLines={1}>{user?.email ?? '已登入'}</Text>
          </View>
          <Pressable style={styles.signOutButton} onPress={() => void signOut()}>
            <Ionicons name="log-out-outline" size={18} color="#9a3412" />
            <Text style={styles.signOutText}>登出</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 24,
  },
  pageTitle: {
    color: '#171d1c',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  section: {
    backgroundColor: '#f5fbf9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e3e9e8',
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    color: '#6c7a78',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  form: {
    gap: 14,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: '#3c4948',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#bbc9c7',
    borderRadius: 12,
    borderWidth: 1,
    color: '#171d1c',
    fontSize: 16,
    height: 48,
    paddingHorizontal: 14,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#20B2AA',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    marginTop: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  accountEmail: {
    color: '#3c4948',
    flex: 1,
    fontSize: 15,
  },
  signOutButton: {
    alignItems: 'center',
    backgroundColor: '#fde8e8',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    justifyContent: 'center',
  },
  signOutText: {
    color: '#9a3412',
    fontSize: 16,
    fontWeight: '600',
  },
});
