import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionProvider } from '@/providers/session-provider';

export const unstable_settings = {
  anchor: '(app)',
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,      // 1 分鐘內不重新 fetch
      gcTime: 5 * 60_000,     // 5 分鐘後清除 cache
      retry: 2,
    },
  },
});

function navigateToFollowUp(logId: string) {
  router.navigate(`/follow-up/${logId}` as never);
}

function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data;
  if (data?.type === 'abnormal_follow_up' && typeof data.logId === 'string') {
    navigateToFollowUp(data.logId);
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // addNotificationResponseReceivedListener 同時處理：
    // - app 在前景/背景時點擊通知
    // - cold start（app 被關掉後被通知叫起）
    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    return () => sub.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(public)" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
