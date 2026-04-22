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

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import type { Database } from '@/types/database';

type Pet = Database['public']['Tables']['pets']['Row'];
type Screen = 'menu' | 'pet' | 'account';

// ─── 共用 Back Header ──────────────────────────────────────────────────────────

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.subHeader}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Ionicons name="chevron-back" size={22} color="#20B2AA" />
        <Text style={styles.backText}>設定</Text>
      </Pressable>
      <Text style={styles.subTitle}>{title}</Text>
      <View style={styles.backButton} />
    </View>
  );
}

// ─── 選單列 ────────────────────────────────────────────────────────────────────

function MenuItem({
  icon,
  label,
  onPress,
  isLast,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, isLast && styles.menuItemLast, pressed && styles.menuItemPressed]}
      onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIconWrap}>
          <Ionicons name={icon} size={18} color="#ffffff" />
        </View>
        <Text style={styles.menuItemLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#bbc9c7" />
    </Pressable>
  );
}

// ─── 主選單 ────────────────────────────────────────────────────────────────────

function MenuView({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>設定</Text>

      <View style={styles.section}>
        <MenuItem icon="paw" label="寵物資料" onPress={() => onNavigate('pet')} />
        <MenuItem icon="person" label="帳號管理" onPress={() => onNavigate('account')} isLast />
      </View>
    </ScrollView>
  );
}

// ─── 寵物資料 ──────────────────────────────────────────────────────────────────

function PetView({ onBack }: { onBack: () => void }) {
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

  useEffect(() => { void loadPet(); }, [loadPet]);

  async function savePet() {
    if (!supabase || !user || !name.trim()) return;
    setIsSaving(true);
    const fields = { name: name.trim(), breed: breed.trim() || null, weight_kg: weightKg ? parseFloat(weightKg) : null };
    try {
      if (pet) {
        const { error } = await supabase.from('pets').update(fields).eq('id', pet.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('pets').insert({ ...fields, species: 'dog' }).select().single();
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

  return (
    <>
      <SubHeader title="寵物資料" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {isLoading ? (
          <ActivityIndicator color="#20B2AA" style={{ marginVertical: 40 }} />
        ) : (
          <View style={styles.section}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>名字</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="例如：小白" placeholderTextColor="#bbc9c7" />
            </View>
            <View style={styles.divider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>品種</Text>
              <TextInput style={styles.input} value={breed} onChangeText={setBreed} placeholder="例如：柴犬" placeholderTextColor="#bbc9c7" />
            </View>
            <View style={styles.divider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>體重（kg）</Text>
              <TextInput style={styles.input} value={weightKg} onChangeText={setWeightKg} placeholder="例如：5.2" placeholderTextColor="#bbc9c7" keyboardType="decimal-pad" />
            </View>
          </View>
        )}

        <Pressable
          style={[styles.saveButton, (isSaving || !name.trim()) && { opacity: 0.5 }]}
          onPress={() => void savePet()}
          disabled={isSaving || !name.trim()}>
          {isSaving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveButtonText}>儲存</Text>}
        </Pressable>
      </ScrollView>
    </>
  );
}

// ─── 帳號管理 ──────────────────────────────────────────────────────────────────

function AccountView({ onBack }: { onBack: () => void }) {
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
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>電子郵件</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{user?.email ?? '—'}</Text>
          </View>
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#9a3412" />
          <Text style={styles.signOutText}>登出</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

// ─── 主元件 ────────────────────────────────────────────────────────────────────

export function SettingsPanel() {
  const [view, setView] = useState<Screen>('menu');

  return (
    <View style={styles.panel}>
      {view === 'menu' && <MenuView onNavigate={setView} />}
      {view === 'pet' && <PetView onBack={() => setView('menu')} />}
      {view === 'account' && <AccountView onBack={() => setView('menu')} />}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  pageTitle: {
    color: '#171d1c',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },

  // Sub header
  subHeader: {
    alignItems: 'center',
    borderBottomColor: '#e3e9e8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    minWidth: 80,
    paddingHorizontal: 8,
  },
  backText: {
    color: '#20B2AA',
    fontSize: 16,
  },
  subTitle: {
    color: '#171d1c',
    fontSize: 16,
    fontWeight: '700',
  },

  // Menu
  section: {
    backgroundColor: '#f5fbf9',
    borderColor: '#e3e9e8',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    alignItems: 'center',
    backgroundColor: '#f5fbf9',
    borderBottomColor: '#e3e9e8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemPressed: {
    backgroundColor: '#eaf4f4',
  },
  menuItemLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  menuIconWrap: {
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#20B2AA',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  menuItemLabel: {
    color: '#171d1c',
    fontSize: 16,
  },

  // Form
  field: {
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldLabel: {
    color: '#6c7a78',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    color: '#171d1c',
    fontSize: 16,
    paddingVertical: 4,
  },
  divider: {
    backgroundColor: '#e3e9e8',
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#20B2AA',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Account
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: {
    color: '#6c7a78',
    fontSize: 15,
  },
  infoValue: {
    color: '#171d1c',
    flex: 1,
    fontSize: 15,
    textAlign: 'right',
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
