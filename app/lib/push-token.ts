// Remote push token 註冊（stub — 還沒接線）
//
// 目的：登入後拿 Expo Push Token 寫進 Supabase，之後 server / Edge Function
// 才能主動推播（喚回流失使用者、運營活動等）。RevenueCat 的訂閱類推播
// 由 RevenueCat dashboard 直接處理，不走這條。
//
// 接線時要做的事：
// 1. Supabase 開一張 user_push_tokens 表：
//      - user_id (uuid, fk auth.users)
//      - token (text, unique)
//      - platform ('ios' | 'android')
//      - device_id (text, 用來區分同 user 多裝置)
//      - updated_at (timestamptz)
//      - RLS：使用者只能讀寫自己的 row
// 2. 在 SessionProvider 拿到 user 之後（或登入成功 callback）呼叫 registerPushToken(userId)
// 3. 在登出流程呼叫 unregisterPushToken(userId)（避免推到舊裝置）
// 4. 監聽 token refresh：Notifications.addPushTokenListener
// 5. Edge Function 推播時從這張表撈 token，call Expo Push API
//    https://docs.expo.dev/push-notifications/sending-notifications/

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// TODO: 真機才能拿到 token，模擬器會 throw —— 已用 try/catch 包住
async function getExpoPushToken(): Promise<string | null> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}

// TODO: 登入後呼叫。需要先確認通知權限已 granted（沿用 lib/notifications.ts 的 ensureNotificationPermission）
export async function registerPushToken(_userId: string): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;

  // TODO: upsert 進 supabase user_push_tokens（key: user_id + device_id）
  //   await supabase.from('user_push_tokens').upsert({
  //     user_id: _userId,
  //     token,
  //     platform: Platform.OS,
  //     device_id: await getDeviceId(),
  //   });
  void Platform.OS;
}

// TODO: 登出時呼叫，刪掉這台裝置對應的 token
export async function unregisterPushToken(_userId: string): Promise<void> {
  // TODO: delete from user_push_tokens where user_id = _userId and device_id = ...
}
