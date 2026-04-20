import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import { env, isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';

export default function SetupScreen() {
  const { authError, user } = useSession();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={[styles.card, styles.hero]}>
        <ThemedText style={styles.eyebrow}>Supabase Setup</ThemedText>
        <ThemedText type="title" style={[styles.title, { fontFamily: Fonts.rounded }]}>
          下一步把 AI 分析串進來
        </ThemedText>
        <ThemedText style={styles.body}>
          目前 app 已經完成 Apple 登入、建立寵物、圖片上傳與 poop log 寫入。接下來只差把分析 worker
          接到 `uploaded` 紀錄上。
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">目前狀態</ThemedText>
        <Item label="Env" value={isSupabaseConfigured ? '已設定' : '未設定'} />
        <Item label="Apple Auth" value={authError ? '設定未完成' : '可登入'} />
        <Item label="Current User" value={user?.id ?? '尚未登入'} />
        <Item label="Project URL" value={env.supabaseUrl || '請填 EXPO_PUBLIC_SUPABASE_URL'} />
        {user ? (
          <Pressable style={styles.signOutButton} onPress={() => void supabase?.auth.signOut()}>
            <ThemedText style={styles.signOutText}>登出</ThemedText>
          </Pressable>
        ) : null}
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">你現在要做的事</ThemedText>
        <ChecklistStep
          number="01"
          title="貼上環境變數"
          body="把 .env.example 複製成 .env，填入 EXPO_PUBLIC_SUPABASE_URL 與 EXPO_PUBLIC_SUPABASE_ANON_KEY。"
        />
        <ChecklistStep
          number="02"
          title="執行 schema.sql"
          body="到 Supabase SQL Editor 執行 app/supabase/schema.sql，建立 tables、bucket 與 RLS。"
        />
        <ChecklistStep
          number="03"
          title="設定 Apple Provider"
          body="到 Supabase Auth > Sign In / Providers 開啟 Apple，填 Apple Developer Console 的設定。原生 iOS 走的是 Apple credential + Supabase signInWithIdToken。"
        />
        <ChecklistStep
          number="04"
          title="做一個 iOS build"
          body="app.json 已經加上 usesAppleSignIn 與 expo-apple-authentication。接下來用 EAS Build 或 expo run:ios 測試，不要只靠 web。"
        />
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">建議的下一個資料流</ThemedText>
        <ThemedText style={styles.body}>
          {'upload -> poop_logs.status = uploaded -> Edge Function 撈待分析紀錄 -> 呼叫 Vision model -> update poop_logs(done)'}
        </ThemedText>
        <ThemedText style={styles.note}>
          先別把 AI 直接放在 App 端呼叫。模型金鑰應該留在 server 端。
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.itemRow}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <ThemedText style={styles.value}>{value}</ThemedText>
    </View>
  );
}

function ChecklistStep({
  body,
  number,
  title,
}: {
  body: string;
  number: string;
  title: string;
}) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <ThemedText style={styles.stepBadgeText}>{number}</ThemedText>
      </View>
      <View style={styles.stepContent}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText style={styles.body}>{body}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: '#594D43',
    marginTop: 8,
  },
  card: {
    borderRadius: 28,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
  },
  container: {
    backgroundColor: '#F7F1E8',
    paddingBottom: 40,
    paddingTop: 20,
  },
  eyebrow: {
    color: '#7A3B00',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  hero: {
    backgroundColor: '#DDECD8',
  },
  itemRow: {
    borderBottomColor: '#E6DCCE',
    borderBottomWidth: 1,
    gap: 6,
    paddingVertical: 12,
  },
  label: {
    color: '#6A5E55',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  note: {
    color: '#8A3B12',
    marginTop: 12,
  },
  signOutButton: {
    alignItems: 'center',
    backgroundColor: '#1F1A14',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 46,
  },
  signOutText: {
    color: '#FFF9F0',
    fontSize: 15,
    fontWeight: '700',
  },
  stepBadge: {
    alignItems: 'center',
    backgroundColor: '#F2D6B3',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  stepBadgeText: {
    color: '#7A3B00',
    fontSize: 12,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 16,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    marginTop: 8,
  },
  value: {
    color: '#1F1A14',
    fontSize: 15,
    lineHeight: 22,
  },
});
