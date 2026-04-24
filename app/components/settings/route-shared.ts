import { StyleSheet } from 'react-native';

export const settingsRouteStyles = StyleSheet.create({
  screen: { backgroundColor: '#ffffff', flex: 1 },
  scroll: { flex: 1 },
  content: { gap: 12, padding: 20, paddingBottom: 40 },
  section: {
    backgroundColor: '#f5fbf9',
    borderColor: '#e3e9e8',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
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
