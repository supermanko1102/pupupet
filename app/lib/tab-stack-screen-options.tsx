import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { MenuHeaderButton, NotificationsHeaderButton } from '@/components/tab-header-buttons';

export const tabStackScreenOptions: NativeStackNavigationOptions = {
  contentStyle: { backgroundColor: '#ffffff' },
  headerBackButtonDisplayMode: 'minimal',
  headerLeft: () => <MenuHeaderButton />,
  headerRight: () => <NotificationsHeaderButton />,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: '#ffffff' },
  headerTitleStyle: {
    color: '#171d1c',
    fontSize: 18,
    fontWeight: '700',
  },
};
