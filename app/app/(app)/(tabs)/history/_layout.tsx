import { Stack } from 'expo-router';

import { tabStackScreenOptions } from '@/components/navigation/tab-stack-screen-options';

export default function HistoryTabLayout() {
  return (
    <Stack screenOptions={tabStackScreenOptions}>
      <Stack.Screen name="index" options={{ title: '歷程' }} />
    </Stack>
  );
}
