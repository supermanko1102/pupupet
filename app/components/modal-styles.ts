import { StyleSheet } from 'react-native';

// Shared styles used across modal components
export const modalStyles = StyleSheet.create({
  modalSafe:         { flex: 1, backgroundColor: '#ffffff' },
  modalActions:      { gap: 12, padding: 24 },
  modalButton:       { alignItems: 'center', borderRadius: 16, height: 54, justifyContent: 'center' },
  primaryButton:     { backgroundColor: '#20B2AA' },
  primaryButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  ghostButton:       { backgroundColor: '#e9efed' },
  ghostButtonText:   { color: '#3c4948', fontSize: 17, fontWeight: '600' },
  buttonDisabled:    { opacity: 0.4 },

  trackingNotice: {
    alignItems: 'center', backgroundColor: '#fef3c7',
    borderRadius: 12, flexDirection: 'row', gap: 8, padding: 12,
  },
  trackingNoticeText: { color: '#92400e', fontSize: 14, fontWeight: '500' },

  resultScroll:   { flex: 1 },
  resultContent:  { paddingBottom: 8 },
  resultImage:    { height: 260, width: '100%' },
  resultBody:     { gap: 16, padding: 20 },

  riskBanner: {
    alignItems: 'center', borderRadius: 16, borderWidth: 1,
    flexDirection: 'row', gap: 14, padding: 16,
  },
  riskBannerIcon:  { fontSize: 32 },
  riskBannerTitle: { fontSize: 18, fontWeight: '700' },
  riskBannerSub:   { fontSize: 14, marginTop: 2, opacity: 0.8 },

  recommendBox:   { backgroundColor: '#f5fbf9', borderRadius: 12, gap: 6, padding: 14 },
  recommendLabel: { color: '#6c7a78', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  recommendText:  { color: '#3c4948', fontSize: 15, lineHeight: 22 },
});
