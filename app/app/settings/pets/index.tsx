import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { settingsRouteStyles as shared } from '@/components/settings/route-shared';
import { usePets } from '@/hooks/use-pets';
import type { Database } from '@/types/database';

type Pet = Database['public']['Tables']['pets']['Row'];
type Species = Pet['species'];

const SPECIES_EMOJI: Record<Species, string> = { dog: '🐶', cat: '🐱', other: '🐾' };

export default function SettingsPetsScreen() {
  const { data: pets = [], isLoading } = usePets();

  return (
    <SafeAreaView style={shared.screen} edges={['bottom']}>
      <ScrollView style={shared.scroll} contentContainerStyle={shared.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color="#20B2AA" style={{ marginVertical: 40 }} />
        ) : (
          <>
            {pets.length > 0 ? (
              <View style={shared.section}>
                {pets.map((pet, idx) => (
                  <Pressable
                    key={pet.id}
                    style={({ pressed }) => [
                      styles.petRow,
                      idx === pets.length - 1 && styles.petRowLast,
                      pressed && styles.petRowPressed,
                    ]}
                    onPress={() => router.push(`/settings/pets/${pet.id}` as never)}>
                    <View style={styles.petRowLeft}>
                      <Text style={styles.petEmoji}>{SPECIES_EMOJI[pet.species]}</Text>
                      <View>
                        <Text style={styles.petName}>{pet.name}</Text>
                        {(pet.breed || pet.weight_kg) ? (
                          <Text style={styles.petMeta}>
                            {[pet.breed, pet.weight_kg ? `${pet.weight_kg} kg` : null]
                              .filter(Boolean)
                              .join('・')}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#bbc9c7" />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyHint}>還沒有寵物檔案，點下方按鈕新增。</Text>
            )}

            <Pressable style={styles.addButton} onPress={() => router.push('/settings/pets/new' as never)}>
              <Ionicons name="add" size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>新增寵物</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  petRow: {
    alignItems: 'center',
    borderBottomColor: '#e3e9e8',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  petRowLast: { borderBottomWidth: 0 },
  petRowPressed: { backgroundColor: '#eef6f4' },
  petRowLeft: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  petEmoji: { fontSize: 24 },
  petName: { color: '#171d1c', fontSize: 15, fontWeight: '600' },
  petMeta: { color: '#6c7a78', fontSize: 13, marginTop: 2 },
  emptyHint: { color: '#6c7a78', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#20B2AA',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    justifyContent: 'center',
  },
  addButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
