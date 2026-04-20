import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppleSignInCard } from '@/components/apple-sign-in-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSupabaseConfigDiagnostics } from '@/lib/env';
import { uploadPoopPhoto } from '@/lib/uploads';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import type { Database } from '@/types/database';

type Pet = Database['public']['Tables']['pets']['Row'];
type RiskLevel = Database['public']['Tables']['poop_logs']['Row']['risk_level'];

type RecentLog = {
  bristolScore: number | null;
  capturedAt: string;
  id: string;
  imageUrl: string | null;
  petName: string;
  riskLevel: RiskLevel;
  status: string;
  summary: string | null;
};

export default function LogScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { authError, debugLog, isReady, user } = useSession();
  const palette = Colors[colorScheme];
  const diagnostics = getSupabaseConfigDiagnostics();

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [petName, setPetName] = useState('Pupu');
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingPet, setIsSavingPet] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async (isPullToRefresh = false) => {
      if (!supabase || !user) {
        return;
      }

      const client = supabase;

      if (isPullToRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setBanner(null);

      const [{ data: petsData, error: petsError }, { data: logRows, error: logsError }] =
        await Promise.all([
          client.from('pets').select('*').order('created_at', { ascending: false }),
          client
            .from('poop_logs')
            .select(
              'id, captured_at, image_path, status, summary, risk_level, bristol_score, pets(name)'
            )
            .order('captured_at', { ascending: false })
            .limit(8),
        ]);

      if (petsError || logsError) {
        setBanner(petsError?.message ?? logsError?.message ?? '讀取資料失敗。');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const nextPets = petsData ?? [];
      setPets(nextPets);

      setSelectedPetId((current) => {
        if (current && nextPets.some((pet) => pet.id === current)) {
          return current;
        }

        return nextPets[0]?.id ?? null;
      });

      const nextLogs = await Promise.all(
        (logRows ?? []).map(async (row) => {
          const petNameValue =
            row.pets && typeof row.pets === 'object' && 'name' in row.pets
              ? row.pets.name
              : '未命名寵物';

          const { data } = await client.storage
            .from('poop-photos')
            .createSignedUrl(row.image_path, 60 * 60);

          return {
            bristolScore: row.bristol_score,
            capturedAt: row.captured_at,
            id: row.id,
            imageUrl: data?.signedUrl ?? null,
            petName: petNameValue,
            riskLevel: row.risk_level,
            status: row.status,
            summary: row.summary,
          } satisfies RecentLog;
        })
      );

      setRecentLogs(nextLogs);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [user]
  );

  useEffect(() => {
    if (!isReady || !user || !supabase) {
      return;
    }

    void loadDashboard();
  }, [isReady, loadDashboard, user, user?.id]);

  async function createPet() {
    if (!supabase) {
      return;
    }

    const name = petName.trim();

    if (!name) {
      Alert.alert('請先輸入寵物名稱');
      return;
    }

    setIsSavingPet(true);
    setBanner(null);

    const { data, error } = await supabase
      .from('pets')
      .insert({
        name,
        species: 'dog',
      })
      .select()
      .single();

    setIsSavingPet(false);

    if (error) {
      setBanner(error.message);
      return;
    }

    setPets((current) => [data, ...current]);
    setSelectedPetId(data.id);
    setPetName('');
    setBanner(`已建立寵物：${data.name}`);
  }

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('需要相簿權限', '請先允許 App 存取相簿，才能上傳便便照片。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (result.canceled) {
      return;
    }

    setSelectedAsset(result.assets[0] ?? null);
    setBanner(null);
  }

  async function uploadLog() {
    if (!supabase || !user) {
      return;
    }

    if (!selectedPetId) {
      Alert.alert('先建立寵物', '至少先建立一隻寵物，才能綁定便便紀錄。');
      return;
    }

    if (!selectedAsset) {
      Alert.alert('先選照片', '先從相簿挑一張照片，再上傳。');
      return;
    }

    setIsUploading(true);
    setBanner(null);

    try {
      const imagePath = await uploadPoopPhoto(user.id, selectedAsset);
      const { error } = await supabase.from('poop_logs').insert({
        pet_id: selectedPetId,
        image_path: imagePath,
        status: 'uploaded',
        summary: summary.trim() || '等待 AI 分析',
      });

      if (error) {
        throw error;
      }

      setSelectedAsset(null);
      setSummary('');
      setBanner('照片已上傳，資料已寫入 Supabase。');
      await loadDashboard();
    } catch (error) {
      setBanner(error instanceof Error ? error.message : '上傳失敗。');
    } finally {
      setIsUploading(false);
    }
  }

  function selectedPetName() {
    return pets.find((pet) => pet.id === selectedPetId)?.name ?? '尚未選擇';
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colorScheme === 'dark' ? '#111317' : '#F7F1E8' },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => (user ? void loadDashboard(true) : undefined)}
        />
      }>
      <ThemedView style={[styles.hero, { backgroundColor: colorScheme === 'dark' ? '#1E2430' : '#F2D6B3' }]}>
        <ThemedText style={[styles.eyebrow, { color: colorScheme === 'dark' ? '#F4C27B' : '#7A3B00' }]}>
          PupuPet MVP
        </ThemedText>
        <ThemedText type="title" style={[styles.heroTitle, { fontFamily: Fonts.rounded }]}>
          先用 Apple 登入，再留下第一筆便便紀錄
        </ThemedText>
        <ThemedText style={styles.heroBody}>
          這一版已經接上 Supabase Auth、Storage 與 Postgres。先把登入和資料流走通，再接 AI 分析。
        </ThemedText>
      </ThemedView>

      {!user ? <AppleSignInCard /> : null}

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">連線狀態</ThemedText>
        {!isReady ? (
          <ActivityIndicator style={styles.loader} color={palette.tint} />
        ) : (
          <View style={styles.statusStack}>
            <StatusPill
              label={authError ? '設定錯誤' : user ? '已登入' : '待登入'}
              tone={authError ? 'danger' : user ? 'success' : 'warning'}
            />
            <ThemedText style={styles.helperText}>
              {authError ?? (user ? `Apple 使用者：${user.id}` : '請先用 Apple 登入')}
            </ThemedText>
          </View>
        )}
        {banner ? <ThemedText style={[styles.banner, { color: '#8A3B12' }]}>{banner}</ThemedText> : null}
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Debug Log</ThemedText>
        <ThemedText style={styles.helperText}>
          這裡顯示目前這個 build 實際讀到的 Supabase 設定與 auth 狀態。
        </ThemedText>
        <View style={styles.debugBlock}>
          <DebugRow label="supabase client" value={supabase ? 'ready' : 'missing'} />
          <DebugRow
            label="EXPO_PUBLIC_SUPABASE_URL"
            value={diagnostics.urlPresent ? diagnostics.urlPreview : '(missing)'}
          />
          <DebugRow
            label="EXPO_PUBLIC_SUPABASE_ANON_KEY"
            value={diagnostics.anonKeyPresent ? diagnostics.anonKeyPreview : '(missing)'}
          />
          <DebugRow label="auth user" value={user?.id ?? '(none)'} />
          {debugLog.map((line) => (
            <DebugRow key={line} label="state" value={line} />
          ))}
        </View>
      </ThemedView>

      {user ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">1. 建立寵物</ThemedText>
          <TextInput
            value={petName}
            onChangeText={setPetName}
            placeholder="例如：Pupu"
            placeholderTextColor="#8B8478"
            style={styles.input}
          />
          <Pressable
            style={[styles.button, styles.primaryButton, isSavingPet && styles.buttonDisabled]}
            onPress={() => void createPet()}
            disabled={isSavingPet || !isReady || Boolean(authError)}>
            <ThemedText style={styles.primaryButtonText}>
              {isSavingPet ? '建立中...' : '新增寵物'}
            </ThemedText>
          </Pressable>
          {pets.length > 0 ? (
            <View style={styles.petChipRow}>
              {pets.map((pet) => {
                const isActive = pet.id === selectedPetId;

                return (
                  <Pressable
                    key={pet.id}
                    style={[
                      styles.chip,
                      isActive && { backgroundColor: '#1D6B57', borderColor: '#1D6B57' },
                    ]}
                    onPress={() => setSelectedPetId(pet.id)}>
                    <ThemedText style={[styles.chipText, isActive && { color: '#FFF7F0' }]}>
                      {pet.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <ThemedText style={styles.helperText}>還沒有寵物資料，先建立一隻。</ThemedText>
          )}
        </ThemedView>
      ) : null}

      {user ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">2. 上傳便便照片</ThemedText>
          <ThemedText style={styles.helperText}>目前綁定寵物：{selectedPetName()}</ThemedText>

          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => void choosePhoto()}
            disabled={!isReady || Boolean(authError)}>
            <ThemedText style={styles.secondaryButtonText}>
              {selectedAsset ? '重新選擇照片' : '從相簿選照片'}
            </ThemedText>
          </Pressable>

          {selectedAsset ? (
            <Image source={{ uri: selectedAsset.uri }} style={styles.preview} contentFit="cover" />
          ) : null}

          <TextInput
            value={summary}
            onChangeText={setSummary}
            placeholder="先寫一句觀察，例如：今天偏軟、顏色較深"
            placeholderTextColor="#8B8478"
            multiline
            style={[styles.input, styles.textArea]}
          />

          <Pressable
            style={[styles.button, styles.primaryButton, isUploading && styles.buttonDisabled]}
            onPress={() => void uploadLog()}
            disabled={isUploading || !selectedAsset || Boolean(authError)}>
            <ThemedText style={styles.primaryButtonText}>
              {isUploading ? '上傳中...' : '寫入 Supabase'}
            </ThemedText>
          </Pressable>
        </ThemedView>
      ) : null}

      {user ? (
        <ThemedView style={styles.card}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">最近紀錄</ThemedText>
            {isLoading ? <ActivityIndicator color={palette.tint} /> : null}
          </View>

          {recentLogs.length === 0 ? (
            <ThemedText style={styles.helperText}>目前還沒有紀錄，先上傳一張照片測試。</ThemedText>
          ) : (
            recentLogs.map((log) => (
              <View key={log.id} style={styles.logCard}>
                {log.imageUrl ? (
                  <Image source={{ uri: log.imageUrl }} style={styles.logImage} contentFit="cover" />
                ) : (
                  <View style={[styles.logImage, styles.logImageFallback]}>
                    <ThemedText style={styles.helperText}>無預覽</ThemedText>
                  </View>
                )}
                <View style={styles.logMeta}>
                  <View style={styles.logRow}>
                    <ThemedText type="defaultSemiBold">{log.petName}</ThemedText>
                    <StatusPill label={riskLabel(log.riskLevel, log.status)} tone={riskTone(log.riskLevel)} />
                  </View>
                  <ThemedText style={styles.helperText}>
                    {new Date(log.capturedAt).toLocaleString()}
                  </ThemedText>
                  <ThemedText numberOfLines={2}>{log.summary ?? '等待分析結果'}</ThemedText>
                  <ThemedText style={styles.helperText}>
                    Bristol：{log.bristolScore ? String(log.bristolScore) : '尚未分析'}
                  </ThemedText>
                </View>
              </View>
            ))
          )}
        </ThemedView>
      ) : null}
    </ScrollView>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.debugRow}>
      <ThemedText style={styles.debugLabel}>{label}</ThemedText>
      <ThemedText style={styles.debugValue}>{value}</ThemedText>
    </View>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'danger' | 'neutral' | 'success' | 'warning';
}) {
  const tones = {
    danger: { backgroundColor: '#FDE2DC', color: '#9A3412' },
    neutral: { backgroundColor: '#E8E3DA', color: '#54473F' },
    success: { backgroundColor: '#D8F3E8', color: '#166534' },
    warning: { backgroundColor: '#FCE7BF', color: '#92400E' },
  };

  return (
    <View style={[styles.pill, { backgroundColor: tones[tone].backgroundColor }]}>
      <ThemedText style={[styles.pillText, { color: tones[tone].color }]}>{label}</ThemedText>
    </View>
  );
}

function riskLabel(riskLevel: RiskLevel, status: string) {
  if (status !== 'done') {
    return '待分析';
  }

  if (riskLevel === 'normal') {
    return '正常';
  }

  if (riskLevel === 'observe') {
    return '觀察';
  }

  if (riskLevel === 'vet') {
    return '就醫';
  }

  return '待補資料';
}

function riskTone(riskLevel: RiskLevel): 'danger' | 'neutral' | 'success' | 'warning' {
  if (riskLevel === 'normal') {
    return 'success';
  }

  if (riskLevel === 'observe') {
    return 'warning';
  }

  if (riskLevel === 'vet') {
    return 'danger';
  }

  return 'neutral';
}

const styles = StyleSheet.create({
  banner: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignItems: 'center',
    borderRadius: 16,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  card: {
    borderRadius: 28,
    gap: 14,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
  },
  chip: {
    borderColor: '#D7C7B3',
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  chipText: {
    fontSize: 14,
  },
  container: {
    paddingBottom: 40,
    paddingTop: 20,
  },
  debugBlock: {
    backgroundColor: '#FBF8F2',
    borderRadius: 20,
    gap: 10,
    padding: 14,
  },
  debugLabel: {
    color: '#6C655C',
    fontFamily: Fonts.mono,
    fontSize: 12,
    width: 160,
  },
  debugRow: {
    flexDirection: 'row',
    gap: 12,
  },
  debugValue: {
    color: '#2C241C',
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 13,
    lineHeight: 18,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  helperText: {
    color: '#6C655C',
    fontSize: 14,
    lineHeight: 20,
  },
  hero: {
    borderRadius: 32,
    marginHorizontal: 16,
    minHeight: 180,
    padding: 24,
  },
  heroBody: {
    color: '#4A4339',
    marginTop: 10,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#FFF9F1',
    borderColor: '#E1D3C3',
    borderRadius: 16,
    borderWidth: 1,
    color: '#2C241C',
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  loader: {
    marginTop: 12,
  },
  logCard: {
    backgroundColor: '#FBF8F2',
    borderRadius: 22,
    gap: 14,
    overflow: 'hidden',
    padding: 12,
  },
  logImage: {
    borderRadius: 16,
    height: 180,
    width: '100%',
  },
  logImageFallback: {
    alignItems: 'center',
    backgroundColor: '#ECE4D8',
    justifyContent: 'center',
  },
  logMeta: {
    gap: 6,
  },
  logRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  petChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  preview: {
    borderRadius: 24,
    height: 240,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#1E5E4F',
  },
  primaryButtonText: {
    color: '#FFF9F0',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#EFE4D5',
  },
  secondaryButtonText: {
    color: '#5E4632',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusStack: {
    gap: 10,
    marginTop: 8,
  },
  textArea: {
    minHeight: 112,
    textAlignVertical: 'top',
  },
});
