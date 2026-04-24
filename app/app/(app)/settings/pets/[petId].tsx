import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { settingsRouteStyles as shared } from '@/components/settings/route-shared';
import { useCreatePet, useDeletePet, usePets, useUpdatePet } from '@/hooks/use-pets';
import type { Database } from '@/types/database';

type Pet = Database['public']['Tables']['pets']['Row'];
type Species = Pet['species'];

const SPECIES_OPTIONS: { value: Species; label: string }[] = [
  { value: 'dog', label: '🐶 狗' },
  { value: 'cat', label: '🐱 貓' },
  { value: 'other', label: '🐾 其他' },
];

export default function PetEditorScreen() {
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const isNew = !petId || petId === 'new';

  const { data: pets = [], isLoading } = usePets();
  const createPet = useCreatePet();
  const updatePet = useUpdatePet();
  const deletePet = useDeletePet();

  const pet = useMemo<Pet | null>(() => {
    if (isNew || !petId) return null;
    return pets.find((item) => item.id === petId) ?? null;
  }, [isNew, petId, pets]);

  const [name, setName] = useState(pet?.name ?? '');
  const [breed, setBreed] = useState(pet?.breed ?? '');
  const [weightKg, setWeightKg] = useState(pet?.weight_kg ? String(pet.weight_kg) : '');
  const [species, setSpecies] = useState<Species>(pet?.species ?? 'dog');

  const isSaving = createPet.isPending || updatePet.isPending;
  const isDeleting = deletePet.isPending;

  useEffect(() => {
    if (isNew) {
      setName('');
      setBreed('');
      setWeightKg('');
      setSpecies('dog');
      return;
    }

    if (pet) {
      setName(pet.name);
      setBreed(pet.breed ?? '');
      setWeightKg(pet.weight_kg ? String(pet.weight_kg) : '');
      setSpecies(pet.species);
    }
  }, [isNew, pet]);

  async function handleSave() {
    if (!name.trim()) return;

    const fields = {
      name: name.trim(),
      breed: breed.trim() || null,
      species,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
    };

    try {
      if (isNew) {
        await createPet.mutateAsync(fields);
      } else if (pet) {
        await updatePet.mutateAsync({ id: pet.id, ...fields });
      }
      router.replace('/settings/pets' as never);
    } catch (err) {
      Alert.alert('儲存失敗', err instanceof Error ? err.message : '請稍後再試。');
    }
  }

  function handleDelete() {
    if (!pet) return;

    Alert.alert(`刪除 ${pet.name}`, '刪除後，相關紀錄將變成未分類。確定要刪除嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePet.mutateAsync(pet.id);
            router.replace('/settings/pets' as never);
          } catch (err) {
            Alert.alert('刪除失敗', err instanceof Error ? err.message : '請稍後再試。');
          }
        },
      },
    ]);
  }

  if (!isNew && isLoading) {
    return (
      <SafeAreaView style={shared.screen} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#20B2AA" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isNew && !isLoading && !pet) {
    return (
      <SafeAreaView style={shared.screen} edges={['bottom']}>
        <Stack.Screen options={{ title: '編輯寵物' }} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color="#fca5a5" />
          <Text style={styles.errorTitle}>找不到這隻寵物</Text>
          <Text style={styles.errorSubtitle}>可能已被刪除，請返回寵物列表重新確認。</Text>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace('/settings/pets' as never)}>
            <Text style={styles.secondaryButtonText}>回到寵物列表</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={shared.screen} edges={['bottom']}>
      <Stack.Screen options={{ title: isNew ? '新增寵物' : '編輯寵物' }} />
      <ScrollView
        style={shared.scroll}
        contentContainerStyle={shared.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={shared.section}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>種類</Text>
            <View style={styles.speciesRow}>
              {SPECIES_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[styles.speciesButton, species === option.value && styles.speciesButtonActive]}
                  onPress={() => setSpecies(option.value)}>
                  <Text style={[styles.speciesButtonText, species === option.value && styles.speciesButtonTextActive]}>
                    {option.label}
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
          style={[styles.primaryButton, (isSaving || !name.trim()) && { opacity: 0.5 }]}
          onPress={() => void handleSave()}
          disabled={isSaving || !name.trim()}>
          {isSaving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>儲存</Text>}
        </Pressable>

        {!isNew && pet ? (
          <Pressable
            style={[styles.deleteButton, isDeleting && { opacity: 0.5 }]}
            onPress={handleDelete}
            disabled={isDeleting}>
            {isDeleting ? (
              <ActivityIndicator color="#9a3412" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color="#9a3412" />
                <Text style={styles.deleteButtonText}>刪除寵物檔案</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  errorTitle: { color: '#171d1c', fontSize: 17, fontWeight: '700', marginTop: 4 },
  errorSubtitle: {
    color: '#6c7a78',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    textAlign: 'center',
  },
  field: { gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  fieldLabel: { color: '#3c4948', fontSize: 14, fontWeight: '600' },
  speciesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  speciesButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d9e3e1',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  speciesButtonActive: { backgroundColor: '#f0fdf9', borderColor: '#20B2AA' },
  speciesButtonText: { color: '#3c4948', fontSize: 14, fontWeight: '600' },
  speciesButtonTextActive: { color: '#006a65' },
  divider: { backgroundColor: '#e3e9e8', height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d9e3e1',
    borderRadius: 12,
    borderWidth: 1,
    color: '#171d1c',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#20B2AA',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#fde8e8',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    justifyContent: 'center',
  },
  deleteButtonText: { color: '#9a3412', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#e9efed',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
    paddingHorizontal: 18,
  },
  secondaryButtonText: { color: '#3c4948', fontSize: 15, fontWeight: '700' },
});
