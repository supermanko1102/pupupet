import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { settingsRouteStyles as s } from '@/components/settings/route-shared';
import { Brand, Surface } from '@/constants/theme';

type PermissionState = 'loading' | 'granted' | 'denied' | 'undetermined';

function deriveState(result: Notifications.NotificationPermissionsStatus): PermissionState {
  if (result.ios) {
    const status = result.ios.status;
    if (status >= 2) return 'granted'; // AUTHORIZED / PROVISIONAL / EPHEMERAL
    if (status === 0) return 'undetermined'; // NOT_DETERMINED
    return 'denied';
  }
  // Android: 沿用 lib/notifications.ts 的 convention，預設視為 granted
  return 'granted';
}

export default function NotificationsSettingsScreen() {
  const [state, setState] = useState<PermissionState>('loading');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const result = await Notifications.getPermissionsAsync();
        if (!cancelled) setState(deriveState(result));
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  async function handlePress() {
    if (state === 'undetermined') {
      const result = await Notifications.requestPermissionsAsync();
      setState(deriveState(result));
      return;
    }
    // granted 或 denied 都導去系統設定（granted 時讓使用者自己關閉）
    await Linking.openSettings();
  }

  return (
    <SafeAreaView style={s.screen} edges={['bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <View style={local.row}>
            <View style={local.rowLeft}>
              <Text style={local.label}>推播通知</Text>
              <Text style={local.helper}>{HELPER_COPY[state]}</Text>
            </View>
            <StatusPill state={state} />
          </View>
        </View>

        {state !== 'loading' && (
          <Pressable
            style={({ pressed }) => [local.cta, pressed && local.ctaPressed]}
            onPress={handlePress}>
            <Text style={local.ctaText}>{CTA_COPY[state]}</Text>
          </Pressable>
        )}

        <Text style={local.footnote}>
          目前 PupuPet 只會在偵測到異常時，於隔天早上 9:00 提醒你追蹤。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusPill({ state }: { state: PermissionState }) {
  if (state === 'loading') return null;
  const granted = state === 'granted';
  return (
    <View style={[local.pill, granted ? local.pillOn : local.pillOff]}>
      <Text style={[local.pillText, granted ? local.pillTextOn : local.pillTextOff]}>
        {granted ? '已開啟' : '已關閉'}
      </Text>
    </View>
  );
}

const HELPER_COPY: Record<PermissionState, string> = {
  loading: '檢查中...',
  granted: '系統推播權限已開啟。',
  denied: '已被關閉，需到系統設定重新開啟。',
  undetermined: '尚未授權，開啟以接收提醒。',
};

const CTA_COPY: Record<PermissionState, string> = {
  loading: '',
  granted: '前往系統設定',
  denied: '前往系統設定開啟',
  undetermined: '開啟通知',
};

const local = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: { flex: 1, paddingRight: 12 },
  label: { color: Surface.ink, fontSize: 16, fontWeight: '600' },
  helper: { color: '#6c7a78', fontSize: 13, marginTop: 2 },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillOn: { backgroundColor: '#dff5ec' },
  pillOff: { backgroundColor: '#f1e5e5' },
  pillText: { fontSize: 12, fontWeight: '700' },
  pillTextOn: { color: '#0a7b5a' },
  pillTextOff: { color: '#9b3a3a' },
  cta: {
    alignItems: 'center',
    backgroundColor: Brand.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  footnote: {
    color: '#6c7a78',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: 4,
  },
});
