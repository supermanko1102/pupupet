import * as Notifications from 'expo-notifications';

// 設定通知顯示方式（在前景也顯示）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ios.status >= 2 means AUTHORIZED / PROVISIONAL / EPHEMERAL
function isPermissionGranted(result: Notifications.NotificationPermissionsStatus): boolean {
  if (result.ios) return result.ios.status >= 2;
  return true; // Android grants by default
}

async function ensureNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (isPermissionGranted(existing)) return true;

  const result = await Notifications.requestPermissionsAsync();
  return isPermissionGranted(result);
}

// 排程異常追蹤提醒（次日早上 9:00）
export async function scheduleAbnormalFollowUp(logId: string): Promise<void> {
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  // 取消同一筆 log 的舊提醒（避免重複）
  await cancelFollowUp(logId);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  await Notifications.scheduleNotificationAsync({
    identifier: followUpId(logId),
    content: {
      title: '記得追蹤昨天的異常',
      body: '昨天有記錄到異常狀況，今天排便後記得再記錄一次，確認是否恢復正常。',
      data: { logId, type: 'abnormal_follow_up' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: tomorrow,
    },
  });
}

// 取消特定 log 的追蹤提醒
export async function cancelFollowUp(logId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(followUpId(logId));
}

function followUpId(logId: string): string {
  return `follow_up_${logId}`;
}
