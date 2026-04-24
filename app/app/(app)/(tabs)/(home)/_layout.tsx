import { Stack } from 'expo-router';

import { tabStackScreenOptions } from '@/lib/tab-stack-screen-options';

export default function HomeTabLayout() {
  return (
    <Stack screenOptions={tabStackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'PupuPet' }} />
    </Stack>
  );
}
