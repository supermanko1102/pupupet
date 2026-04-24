import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MenuItem } from '@/components/settings/_shared';
import { settingsRouteStyles as s } from '@/components/settings/route-shared';

export default function SettingsIndexScreen() {
  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <MenuItem icon="paw" label="寵物管理" onPress={() => router.push('/settings/pets' as never)} />
          <MenuItem icon="person" label="帳號管理" onPress={() => router.push('/settings/account' as never)} isLast />
        </View>

        <Text style={s.sectionLabel}>關於</Text>
        <View style={s.section}>
          <MenuItem icon="document-text" label="使用條款" onPress={() => router.push('/settings/legal/terms' as never)} />
          <MenuItem icon="shield-checkmark" label="隱私政策" onPress={() => router.push('/settings/legal/privacy' as never)} />
          <MenuItem icon="alert-circle" label="免責聲明" onPress={() => router.push('/settings/legal/disclaimer' as never)} isLast />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
