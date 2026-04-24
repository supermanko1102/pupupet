import { Redirect, Tabs, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppNavbar } from '@/components/app-navbar';
import { HapticTab } from '@/components/haptic-tab';
import { TAB_TITLES } from '@/lib/tab-titles';
import { useSession } from '@/providers/session-provider';

export default function AppLayout() {
  const { isReady, user } = useSession();
  const segments = useSegments();

  const activeRoute = useMemo(() => {
    const segment = segments[segments.length - 1];
    return typeof segment === 'string' ? segment : 'index';
  }, [segments]);

  if (isReady && !user) {
    return <Redirect href={'/sign-in' as never} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <AppNavbar title={TAB_TITLES[activeRoute] ?? 'PupuPet'} />

        <View style={styles.contentArea}>
          <Tabs
            screenOptions={({ route }) => ({
              headerShown: false,
              sceneStyle: { backgroundColor: '#ffffff' },
              tabBarActiveTintColor: '#20B2AA',
              tabBarInactiveTintColor: '#93a4a1',
              tabBarButton: HapticTab,
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '700',
                marginBottom: 2,
              },
              tabBarStyle: {
                backgroundColor: '#ffffff',
                borderTopColor: '#e3e9e8',
                height: 72,
                paddingTop: 8,
              },
              tabBarIcon: ({ color, focused, size }) => {
                const iconMap: Record<string, ComponentProps<typeof Ionicons>['name']> = {
                  index: focused ? 'flash' : 'flash-outline',
                  history: focused ? 'time' : 'time-outline',
                  catalog: focused ? 'sparkles' : 'sparkles-outline',
                };

                return <Ionicons color={color} name={iconMap[route.name]} size={size} />;
              },
            })}>
            <Tabs.Screen name="index" options={{ title: '記錄' }} />
            <Tabs.Screen name="history" options={{ title: '歷程' }} />
            <Tabs.Screen name="catalog" options={{ title: '圖鑑' }} />
          </Tabs>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#ffffff', flex: 1 },
  container: { backgroundColor: '#ffffff', flex: 1 },
  contentArea: { flex: 1, position: 'relative' },
});
