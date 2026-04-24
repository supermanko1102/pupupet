import { Stack } from 'expo-router';

import { tabStackScreenOptions } from '@/lib/tab-stack-screen-options';

export default function CatalogTabLayout() {
  return (
    <Stack screenOptions={tabStackScreenOptions}>
      <Stack.Screen name="index" options={{ title: '圖鑑' }} />
    </Stack>
  );
}
