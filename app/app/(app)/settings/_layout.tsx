import { Stack } from 'expo-router';
import { Brand, Surface } from '@/constants/theme';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerTintColor: Brand.primary,
        headerTitleStyle: {
          color: Surface.ink,
          fontWeight: '700',
        },
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        contentStyle: {
          backgroundColor: '#ffffff',
        },
      }}>
      <Stack.Screen name="index" options={{ title: '設定' }} />
      <Stack.Screen name="plus" options={{ title: 'PupuPet Plus' }} />
      <Stack.Screen name="account" options={{ title: '帳號管理' }} />
      <Stack.Screen name="pets/index" options={{ title: '寵物管理' }} />
      <Stack.Screen name="pets/new" options={{ title: '新增寵物' }} />
      <Stack.Screen name="pets/[petId]" options={{ title: '編輯寵物' }} />
      <Stack.Screen name="legal/[page]" options={{ title: '條款與政策' }} />
    </Stack>
  );
}
