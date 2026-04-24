import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSession } from '@/providers/session-provider';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function AuthenticatedAppLayout() {
  const { isReady, user } = useSession();

  if (!isReady) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#20B2AA" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="follow-up/[logId]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="logs/[logId]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: '關於 PupuPet' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    flex: 1,
    justifyContent: 'center',
  },
});
