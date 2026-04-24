import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { HapticTab } from '@/components/haptic-tab';

export default function AppLayout() {
  return (
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
            '(home)': focused ? 'flash' : 'flash-outline',
            history: focused ? 'time' : 'time-outline',
          };

          return <Ionicons color={color} name={iconMap[route.name]} size={size} />;
        },
      })}>
      <Tabs.Screen name="(home)" options={{ title: '記錄' }} />
      <Tabs.Screen name="history" options={{ title: '歷程' }} />
    </Tabs>
  );
}
