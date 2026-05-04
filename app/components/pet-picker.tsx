import { Pressable, StyleSheet, Text, View } from 'react-native';

import { petSpeciesEmoji } from '@/lib/pet-display';
import type { Database } from '@/types/database';

type Pet = Database['public']['Tables']['pets']['Row'];

type Props = {
  pets: Pet[];
  onSelect: (petId: string) => void;
  variant?: 'card' | 'compact';
  disabled?: boolean;
};

const BUTTON_RIPPLE = { color: 'rgba(23, 29, 28, 0.08)' };

export function PetPicker({ pets, onSelect, variant = 'card', disabled = false }: Props) {
  if (pets.length === 0) return null;

  const buttonStyle = variant === 'card' ? styles.cardButton : styles.compactButton;
  const emojiStyle = variant === 'card' ? styles.cardEmoji : styles.compactEmoji;
  const nameStyle = variant === 'card' ? styles.cardName : styles.compactName;

  return (
    <View style={styles.row}>
      {pets.map((pet) => (
        <Pressable
          key={pet.id}
          android_ripple={BUTTON_RIPPLE}
          disabled={disabled}
          onPress={() => onSelect(pet.id)}
          style={({ pressed }) => [buttonStyle, pressed && styles.pressed]}>
          <Text style={emojiStyle}>{petSpeciesEmoji(pet.species)}</Text>
          <Text style={nameStyle}>{pet.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pressed: { opacity: 0.72 },

  cardButton: {
    alignItems: 'center',
    backgroundColor: '#f5fbf9',
    borderColor: '#e3e9e8',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cardEmoji: { fontSize: 18 },
  cardName: { color: '#171d1c', fontSize: 15, fontWeight: '600' },

  compactButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e3e9e8',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  compactEmoji: { fontSize: 16 },
  compactName: { color: '#171d1c', fontSize: 14, fontWeight: '600' },
});
