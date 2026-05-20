import { StyleSheet } from 'react-native';

import { Brand, Surface } from '@/constants/theme';

// Shared styles used across modal components
export const modalStyles = StyleSheet.create({
  modalSafe:         { flex: 1, backgroundColor: '#ffffff' },
  modalActions:      { gap: 12, padding: 24 },
  modalButton:       { alignItems: 'center', borderRadius: 16, height: 54, justifyContent: 'center' },
  primaryButton:     { backgroundColor: Brand.primary },
  primaryButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  ghostButton:       { backgroundColor: Surface.bgMuted },
  ghostButtonText:   { color: Surface.inkSoft, fontSize: 17, fontWeight: '600' },
  buttonDisabled:    { opacity: 0.4 },

  resultScroll:   { flex: 1 },
  resultContent:  { paddingBottom: 8 },
  resultImage:    { height: 260, width: '100%' },
  resultBody:     { gap: 16, padding: 20 },

  observationCard: {
    backgroundColor: Surface.bgSoft,
    borderColor: '#d9e7e5',
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  observationTitle: { color: Surface.ink, fontSize: 18, fontWeight: '800' },
  observationText:  { color: Surface.inkSoft, fontSize: 15, lineHeight: 22 },

  recommendBox:   { backgroundColor: Surface.bgSoft, borderRadius: 12, gap: 6, padding: 14 },
  recommendLabel: { color: Surface.muted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  recommendText:  { color: Surface.inkSoft, fontSize: 15, lineHeight: 22 },
});
