import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand, Surface } from '@/constants/theme';

export type Screen = 'menu' | 'pets' | 'account' | 'terms' | 'privacy' | 'disclaimer';

// ─── MenuItem ─────────────────────────────────────────────────────────────────

export function MenuItem({
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
      style={({ pressed }) => [s.menuItem, isLast && s.menuItemLast, pressed && s.menuItemPressed]}
      onPress={onPress}>
      <View style={s.menuItemLeft}>
        <View style={s.menuIconWrap}>
          <Ionicons name={icon} size={18} color="#ffffff" />
        </View>
        <Text style={s.menuItemLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#bbc9c7" />
    </Pressable>
  );
}

// ─── Shared styles (re-exported for sub-screens) ──────────────────────────────

/* eslint-disable react-native/no-unused-styles -- consumed by sibling settings screens */
export const shared = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  section: {
    backgroundColor: Surface.bgSoft,
    borderColor: Surface.border,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
/* eslint-enable react-native/no-unused-styles */

const s = StyleSheet.create({
  subHeader: {
    alignItems: 'center',
    borderBottomColor: Surface.border,
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
    color: Brand.primary,
    fontSize: 16,
  },
  subTitle: {
    color: Surface.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  menuItem: {
    alignItems: 'center',
    backgroundColor: Surface.bgSoft,
    borderBottomColor: Surface.border,
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
    backgroundColor: Brand.primary,
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  menuItemLabel: {
    color: Surface.ink,
    fontSize: 16,
  },
});
