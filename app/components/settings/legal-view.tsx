import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SubHeader, shared } from './_shared';
import { LEGAL_PAGES, type LegalPageKey } from './legal-content';

export function LegalView({ page, onBack }: { page: LegalPageKey; onBack: () => void }) {
  const { title, meta, alertBox, sections } = LEGAL_PAGES[page];

  return (
    <>
      <SubHeader title={title} onBack={onBack} />
      <ScrollView style={shared.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.meta}>{meta}</Text>

        {alertBox && (
          <View style={s.alertBox}>
            <Ionicons name="alert-circle" size={20} color="#9a3412" />
            <Text style={s.alertText}>{alertBox}</Text>
          </View>
        )}

        {sections.map((section) => (
          <View key={section.heading} style={s.section}>
            <Text style={s.heading}>{section.heading}</Text>
            <Text style={s.body}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  meta: { color: '#bbc9c7', fontSize: 13, marginBottom: 20 },
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
  heading: { color: '#171d1c', fontSize: 15, fontWeight: '700' },
  body: { color: '#444f4e', fontSize: 14, lineHeight: 22 },
});
