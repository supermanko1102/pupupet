import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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

import { useCreatePet, useDeletePet, usePets, useUpdatePet } from '@/hooks/use-pets';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import type { Database } from '@/types/database';

type Pet = Database['public']['Tables']['pets']['Row'];
type Species = Pet['species'];
type Screen = 'menu' | 'pets' | 'pet-edit' | 'account';

// ─── Sub Header ───────────────────────────────────────────────────────────────

function SubHeader({ title, onBack, backLabel = '設定' }: { title: string; onBack: () => void; backLabel?: string }) {
  return (
    <View style={styles.subHeader}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Ionicons name="chevron-back" size={22} color="#20B2AA" />
        <Text style={styles.backText}>{backLabel}</Text>
      </Pressable>
      <Text style={styles.subTitle}>{title}</Text>
      <View style={styles.backButton} />
    </View>
  );
}

// ─── Menu Item ────────────────────────────────────────────────────────────────

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

// ─── Main Menu ────────────────────────────────────────────────────────────────

function MenuView({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>設定</Text>
      <View style={styles.section}>
        <MenuItem icon="paw" label="寵物管理" onPress={() => onNavigate('pets')} />
        <MenuItem icon="person" label="帳號管理" onPress={() => onNavigate('account')} isLast />
      </View>
    </ScrollView>
  );
}

// ─── Pets List ────────────────────────────────────────────────────────────────

const SPECIES_EMOJI: Record<Species, string> = { dog: '🐶', cat: '🐱', other: '🐾' };

function PetsListView({
  onBack,
  onEditPet,
}: {
  onBack: () => void;
  onEditPet: (pet: Pet | null) => void;
}) {
  const { data: pets = [], isLoading } = usePets();

  return (
    <>
      <SubHeader title="寵物管理" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color="#20B2AA" style={{ marginVertical: 40 }} />
        ) : (
          <>
            {pets.length > 0 && (
              <View style={styles.section}>
                {pets.map((pet, idx) => (
                  <Pressable
                    key={pet.id}
                    style={({ pressed }) => [
                      styles.menuItem,
                      idx === pets.length - 1 && styles.menuItemLast,
                      pressed && styles.menuItemPressed,
                    ]}
                    onPress={() => onEditPet(pet)}>
                    <View style={styles.menuItemLeft}>
                      <Text style={styles.petEmoji}>{SPECIES_EMOJI[pet.species]}</Text>
                      <View>
                        <Text style={styles.menuItemLabel}>{pet.name}</Text>
                        {(pet.breed || pet.weight_kg) && (
                          <Text style={styles.petMeta}>
                            {[pet.breed, pet.weight_kg ? `${pet.weight_kg} kg` : null]
                              .filter(Boolean)
                              .join('・')}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#bbc9c7" />
                  </Pressable>
                ))}
              </View>
            )}

            {pets.length === 0 && (
              <Text style={styles.emptyHint}>還沒有寵物檔案，點下方按鈕新增。</Text>
            )}

            <Pressable style={styles.addButton} onPress={() => onEditPet(null)}>
              <Ionicons name="add" size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>新增寵物</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </>
  );
}

// ─── Pet Edit / Create ────────────────────────────────────────────────────────

const SPECIES_OPTIONS: { value: Species; label: string }[] = [
  { value: 'dog', label: '🐶 狗' },
  { value: 'cat', label: '🐱 貓' },
  { value: 'other', label: '🐾 其他' },
];

function PetEditView({
  pet,
  onBack,
  onSaved,
  onDeleted,
}: {
  pet: Pet | null;
  onBack: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const isNew = pet === null;
  const createPet = useCreatePet();
  const updatePet = useUpdatePet();
  const deletePet = useDeletePet();

  const [name, setName] = useState(pet?.name ?? '');
  const [breed, setBreed] = useState(pet?.breed ?? '');
  const [weightKg, setWeightKg] = useState(pet?.weight_kg ? String(pet.weight_kg) : '');
  const [species, setSpecies] = useState<Species>(pet?.species ?? 'dog');

  const isSaving = createPet.isPending || updatePet.isPending;
  const isDeleting = deletePet.isPending;

  async function save() {
    if (!name.trim()) return;
    const fields = {
      name: name.trim(),
      breed: breed.trim() || null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      species,
    };
    try {
      if (isNew) {
        await createPet.mutateAsync(fields);
      } else {
        await updatePet.mutateAsync({ id: pet.id, ...fields });
      }
      onSaved();
    } catch (err) {
      Alert.alert('儲存失敗', err instanceof Error ? err.message : '請稍後再試。');
    }
  }

  function confirmDelete() {
    Alert.alert(
      `刪除 ${pet?.name}`,
      '刪除後，相關紀錄將變成未分類。確定要刪除嗎？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            if (!pet) return;
            try {
              await deletePet.mutateAsync(pet.id);
              onDeleted();
            } catch (err) {
              Alert.alert('刪除失敗', err instanceof Error ? err.message : '請稍後再試。');
            }
          },
        },
      ]
    );
  }

  return (
    <>
      <SubHeader
        title={isNew ? '新增寵物' : '編輯寵物'}
        onBack={onBack}
        backLabel="寵物管理"
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* 物種選擇 */}
        <View style={styles.section}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>種類</Text>
            <View style={styles.speciesRow}>
              {SPECIES_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.speciesButton, species === opt.value && styles.speciesButtonActive]}
                  onPress={() => setSpecies(opt.value)}>
                  <Text style={[styles.speciesButtonText, species === opt.value && styles.speciesButtonTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.divider} />
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
          <View style={styles.divider} />
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
          <View style={styles.divider} />
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
        </View>

        <Pressable
          style={[styles.saveButton, (isSaving || !name.trim()) && { opacity: 0.5 }]}
          onPress={() => void save()}
          disabled={isSaving || !name.trim()}>
          {isSaving
            ? <ActivityIndicator color="#ffffff" />
            : <Text style={styles.saveButtonText}>{isNew ? '新增' : '儲存'}</Text>}
        </Pressable>

        {!isNew && (
          <Pressable
            style={[styles.deleteButton, isDeleting && { opacity: 0.5 }]}
            onPress={confirmDelete}
            disabled={isDeleting}>
            {isDeleting
              ? <ActivityIndicator color="#9a3412" />
              : (
                <>
                  <Ionicons name="trash-outline" size={16} color="#9a3412" />
                  <Text style={styles.deleteButtonText}>刪除寵物檔案</Text>
                </>
              )}
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}

// ─── Account ──────────────────────────────────────────────────────────────────

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

// ─── Root ─────────────────────────────────────────────────────────────────────

export function SettingsPanel() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [editingPet, setEditingPet] = useState<Pet | null>(null);

  function openPetEdit(pet: Pet | null) {
    setEditingPet(pet);
    setScreen('pet-edit');
  }

  return (
    <View style={styles.panel}>
      {screen === 'menu' && <MenuView onNavigate={setScreen} />}
      {screen === 'pets' && (
        <PetsListView
          onBack={() => setScreen('menu')}
          onEditPet={openPetEdit}
        />
      )}
      {screen === 'pet-edit' && (
        <PetEditView
          pet={editingPet}
          onBack={() => setScreen('pets')}
          onSaved={() => setScreen('pets')}
          onDeleted={() => setScreen('pets')}
        />
      )}
      {screen === 'account' && <AccountView onBack={() => setScreen('menu')} />}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // Section / Menu
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

  // Pet list
  petEmoji: {
    fontSize: 28,
    width: 36,
    textAlign: 'center',
  },
  petMeta: {
    color: '#6c7a78',
    fontSize: 12,
    marginTop: 1,
  },
  emptyHint: {
    color: '#bbc9c7',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#20B2AA',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 6,
    height: 50,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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

  // Species selector
  speciesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  speciesButton: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e3e9e8',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  speciesButtonActive: {
    borderColor: '#20B2AA',
    backgroundColor: '#eaf4f4',
  },
  speciesButtonText: {
    color: '#6c7a78',
    fontSize: 14,
  },
  speciesButtonTextActive: {
    color: '#20B2AA',
    fontWeight: '700',
  },

  // Buttons
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
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#fde8e8',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 6,
    height: 50,
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#9a3412',
    fontSize: 15,
    fontWeight: '600',
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
