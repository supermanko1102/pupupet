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
import type { Database } from '@/types/database';

import { SubHeader, shared } from './_shared';

type Pet = Database['public']['Tables']['pets']['Row'];
type Species = Pet['species'];

const SPECIES_EMOJI: Record<Species, string> = { dog: '🐶', cat: '🐱', other: '🐾' };

const SPECIES_OPTIONS: { value: Species; label: string }[] = [
  { value: 'dog', label: '🐶 狗' },
  { value: 'cat', label: '🐱 貓' },
  { value: 'other', label: '🐾 其他' },
];

// ─── Pets List ────────────────────────────────────────────────────────────────

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
      <ScrollView style={shared.scroll} contentContainerStyle={shared.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color="#20B2AA" style={{ marginVertical: 40 }} />
        ) : (
          <>
            {pets.length > 0 && (
              <View style={shared.section}>
                {pets.map((pet, idx) => (
                  <Pressable
                    key={pet.id}
                    style={({ pressed }) => [
                      s.petRow,
                      idx === pets.length - 1 && s.petRowLast,
                      pressed && s.petRowPressed,
                    ]}
                    onPress={() => onEditPet(pet)}>
                    <View style={s.petRowLeft}>
                      <Text style={s.petEmoji}>{SPECIES_EMOJI[pet.species]}</Text>
                      <View>
                        <Text style={s.petName}>{pet.name}</Text>
                        {(pet.breed || pet.weight_kg) && (
                          <Text style={s.petMeta}>
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
              <Text style={s.emptyHint}>還沒有寵物檔案，點下方按鈕新增。</Text>
            )}
            <Pressable style={s.addButton} onPress={() => onEditPet(null)}>
              <Ionicons name="add" size={20} color="#ffffff" />
              <Text style={s.addButtonText}>新增寵物</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </>
  );
}

// ─── Pet Edit / Create ────────────────────────────────────────────────────────

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
        style={shared.scroll}
        contentContainerStyle={shared.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={shared.section}>
          <View style={s.field}>
            <Text style={s.fieldLabel}>種類</Text>
            <View style={s.speciesRow}>
              {SPECIES_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[s.speciesButton, species === opt.value && s.speciesButtonActive]}
                  onPress={() => setSpecies(opt.value)}>
                  <Text style={[s.speciesButtonText, species === opt.value && s.speciesButtonTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.field}>
            <Text style={s.fieldLabel}>名字</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="例如：小白"
              placeholderTextColor="#bbc9c7"
            />
          </View>
          <View style={s.divider} />
          <View style={s.field}>
            <Text style={s.fieldLabel}>品種</Text>
            <TextInput
              style={s.input}
              value={breed}
              onChangeText={setBreed}
              placeholder="例如：柴犬"
              placeholderTextColor="#bbc9c7"
            />
          </View>
          <View style={s.divider} />
          <View style={s.field}>
            <Text style={s.fieldLabel}>體重（kg）</Text>
            <TextInput
              style={s.input}
              value={weightKg}
              onChangeText={setWeightKg}
              placeholder="例如：5.2"
              placeholderTextColor="#bbc9c7"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Pressable
          style={[s.saveButton, (isSaving || !name.trim()) && { opacity: 0.5 }]}
          onPress={() => void save()}
          disabled={isSaving || !name.trim()}>
          {isSaving
            ? <ActivityIndicator color="#ffffff" />
            : <Text style={s.saveButtonText}>{isNew ? '新增' : '儲存'}</Text>}
        </Pressable>

        {!isNew && (
          <Pressable
            style={[s.deleteButton, isDeleting && { opacity: 0.5 }]}
            onPress={confirmDelete}
            disabled={isDeleting}>
            {isDeleting
              ? <ActivityIndicator color="#9a3412" />
              : (
                <>
                  <Ionicons name="trash-outline" size={16} color="#9a3412" />
                  <Text style={s.deleteButtonText}>刪除寵物檔案</Text>
                </>
              )}
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}

// ─── PetsView (manages list ↔ edit sub-navigation) ────────────────────────────

export function PetsView({ onBack }: { onBack: () => void }) {
  const [editingPet, setEditingPet] = useState<Pet | null | undefined>(undefined);

  if (editingPet !== undefined) {
    return (
      <PetEditView
        pet={editingPet}
        onBack={() => setEditingPet(undefined)}
        onSaved={() => setEditingPet(undefined)}
        onDeleted={() => setEditingPet(undefined)}
      />
    );
  }

  return <PetsListView onBack={onBack} onEditPet={setEditingPet} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Pet list rows
  petRow: {
    alignItems: 'center',
    backgroundColor: '#f5fbf9',
    borderBottomColor: '#e3e9e8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  petRowLast: { borderBottomWidth: 0 },
  petRowPressed: { backgroundColor: '#eaf4f4' },
  petRowLeft: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  petEmoji: { fontSize: 28, textAlign: 'center', width: 36 },
  petName: { color: '#171d1c', fontSize: 16 },
  petMeta: { color: '#6c7a78', fontSize: 12, marginTop: 1 },
  emptyHint: { color: '#bbc9c7', fontSize: 14, marginVertical: 20, textAlign: 'center' },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#20B2AA',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 6,
    height: 50,
    justifyContent: 'center',
  },
  addButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  // Form
  field: { gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  fieldLabel: {
    color: '#6c7a78',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: { color: '#171d1c', fontSize: 16, paddingVertical: 4 },
  divider: { backgroundColor: '#e3e9e8', height: StyleSheet.hairlineWidth, marginLeft: 16 },

  // Species selector
  speciesRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  speciesButton: {
    backgroundColor: '#ffffff',
    borderColor: '#e3e9e8',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  speciesButtonActive: { backgroundColor: '#eaf4f4', borderColor: '#20B2AA' },
  speciesButtonText: { color: '#6c7a78', fontSize: 14 },
  speciesButtonTextActive: { color: '#20B2AA', fontWeight: '700' },

  // Action buttons
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#20B2AA',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
  },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#fde8e8',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 6,
    height: 50,
    justifyContent: 'center',
  },
  deleteButtonText: { color: '#9a3412', fontSize: 15, fontWeight: '600' },
});
