import { router, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: {
          color: '#171d1c',
          fontSize: 18,
          fontWeight: '700',
        },
        sceneStyle: { backgroundColor: '#ffffff' },
        headerLeft: () => (
          <Pressable
            hitSlop={8}
            onPress={() => router.push('/settings' as never)}
            style={{ alignItems: 'center', height: 40, justifyContent: 'center', width: 40 }}>
            <Ionicons name="menu" size={24} color="#006a65" />
          </Pressable>
        ),
        headerRight: () => (
          <Pressable
            hitSlop={8}
            style={{ alignItems: 'center', height: 40, justifyContent: 'center', width: 40 }}>
            <Ionicons name="notifications-outline" size={22} color="#006a65" />
          </Pressable>
        ),
        headerLeftContainerStyle: { paddingLeft: 16 },
        headerRightContainerStyle: { paddingRight: 16 },
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
      <Tabs.Screen name="index" options={{ title: 'PupuPet' }} />
      <Tabs.Screen name="history" options={{ title: '歷程' }} />
      <Tabs.Screen name="catalog" options={{ title: '圖鑑' }} />
    </Tabs>
  );
}
