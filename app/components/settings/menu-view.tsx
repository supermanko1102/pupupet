import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MenuItem, shared, type Screen } from './_shared';

export function MenuView({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <ScrollView style={shared.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.pageTitle}>設定</Text>
      <View style={shared.section}>
        <MenuItem icon="paw" label="寵物管理" onPress={() => onNavigate('pets')} />
        <MenuItem icon="person" label="帳號管理" onPress={() => onNavigate('account')} isLast />
      </View>
      <Text style={s.sectionLabel}>關於</Text>
      <View style={shared.section}>
        <MenuItem icon="document-text" label="使用條款" onPress={() => onNavigate('terms')} />
        <MenuItem icon="shield-checkmark" label="隱私政策" onPress={() => onNavigate('privacy')} />
        <MenuItem icon="alert-circle" label="免責聲明" onPress={() => onNavigate('disclaimer')} isLast />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
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
  sectionLabel: {
    color: '#6c7a78',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: -4,
    marginTop: 4,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
});
