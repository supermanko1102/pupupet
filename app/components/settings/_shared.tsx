import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type Screen = 'menu' | 'pets' | 'account' | 'terms' | 'privacy' | 'disclaimer';

// ─── SubHeader ────────────────────────────────────────────────────────────────

export function SubHeader({
  title,
  onBack,
  backLabel = '設定',
}: {
  title: string;
  onBack: () => void;
  backLabel?: string;
}) {
  return (
    <View style={s.subHeader}>
      <Pressable style={s.backButton} onPress={onBack}>
        <Ionicons name="chevron-back" size={22} color="#20B2AA" />
        <Text style={s.backText}>{backLabel}</Text>
      </Pressable>
      <Text style={s.subTitle}>{title}</Text>
      <View style={s.backButton} />
    </View>
  );
}

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

export const shared = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  section: {
    backgroundColor: '#f5fbf9',
    borderColor: '#e3e9e8',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

const s = StyleSheet.create({
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
    backgroundColor: '#20B2AA',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  menuItemLabel: {
    color: '#171d1c',
    fontSize: 16,
  },
});
