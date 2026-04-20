import { useColorScheme as useNativeColorScheme } from 'react-native';

export type ThemeMode = 'dark' | 'light';

export function useColorScheme(): ThemeMode {
  return useNativeColorScheme() === 'dark' ? 'dark' : 'light';
}
