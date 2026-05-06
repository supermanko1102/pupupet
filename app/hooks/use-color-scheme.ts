import { useColorScheme as useNativeColorScheme } from 'react-native';

type ThemeMode = 'dark' | 'light';

export function useColorScheme(): ThemeMode {
  return useNativeColorScheme() === 'dark' ? 'dark' : 'light';
}
