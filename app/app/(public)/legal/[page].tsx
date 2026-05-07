import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { LEGAL_PAGES, type LegalPageKey } from '@/components/settings/legal-content';
import { Surface } from '@/constants/theme';

function isLegalPageKey(value: string): value is LegalPageKey {
  return value === 'terms' || value === 'privacy' || value === 'disclaimer';
}

export default function PublicLegalPageScreen() {
  const { page } = useLocalSearchParams<{ page?: string }>();
  const key: LegalPageKey = page && isLegalPageKey(page) ? page : 'terms';
  const { title, meta, alertBox, sections } = LEGAL_PAGES[key];

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ title }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.meta}>{meta}</Text>

        {alertBox ? (
          <View style={styles.alertBox}>
            <Ionicons name="alert-circle" size={20} color="#9a3412" />
            <Text style={styles.alertText}>{alertBox}</Text>
          </View>
        ) : null}

        {sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#ffffff', flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  meta: { color: Surface.hairline, fontSize: 13, marginBottom: 20 },
  alertBox: {
    alignItems: 'flex-start',
    backgroundColor: '#fde8e8',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    padding: 14,
  },
  alertText: { color: '#9a3412', flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  section: { gap: 6, marginBottom: 24 },
  heading: { color: Surface.ink, fontSize: 15, fontWeight: '700' },
  body: { color: '#444f4e', fontSize: 14, lineHeight: 22 },
});
