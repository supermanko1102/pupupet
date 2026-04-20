import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

function createRawNonce(byteLength = 32) {
  return Array.from(Crypto.getRandomBytes(byteLength))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export function AppleSignInCard() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(Platform.OS === 'ios' ? null : false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    AppleAuthentication.isAvailableAsync()
      .then(setIsAvailable)
      .catch(() => setIsAvailable(false));
  }, []);

  async function signInWithApple() {
    if (!supabase) {
      setMessage('Supabase 尚未設定完成。');
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);

      const rawNonce = createRawNonce();
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

      const credential = await AppleAuthentication.signInAsync({
        nonce: hashedNonce,
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('Apple 沒有回傳 identity token。');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) {
        throw error;
      }

      if (credential.fullName?.givenName || credential.fullName?.familyName) {
        const fullName = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ');

        await supabase.auth.updateUser({
          data: {
            family_name: credential.fullName.familyName,
            full_name: fullName,
            given_name: credential.fullName.givenName,
          },
        });
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
        setMessage('你已取消 Apple 登入。');
      } else {
        setMessage(error instanceof Error ? error.message : 'Apple 登入失敗。');
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.card}>
        <ThemedText type="subtitle">Apple 登入目前只開 iOS</ThemedText>
        <ThemedText style={styles.body}>
          Expo 官方的 `expo-apple-authentication` 目前只支援 iOS / tvOS。這版先以 iPhone 為主。
        </ThemedText>
      </View>
    );
  }

  if (isAvailable === null) {
    return (
      <View style={styles.card}>
        <ThemedText style={styles.body}>正在檢查 Apple 登入能力…</ThemedText>
      </View>
    );
  }

  if (isAvailable === false) {
    return (
      <View style={styles.card}>
        <ThemedText type="subtitle">這台裝置目前不能用 Apple 登入</ThemedText>
        <ThemedText style={styles.body}>
          請在實機或已啟用 Apple Sign In capability 的 iOS build 上測試。
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <ThemedText type="subtitle">先登入再記錄</ThemedText>
      <ThemedText style={styles.body}>
        用 Apple 登入之後，寵物資料、照片和便便紀錄都會綁定到你的 Supabase 使用者。
      </ThemedText>
      <AppleAuthentication.AppleAuthenticationButton
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        cornerRadius={16}
        style={styles.button}
        onPress={() => void signInWithApple()}
      />
      <ThemedText style={styles.caption}>
        {isLoading ? '登入中…' : '第一次授權時 Apple 才會回傳姓名。'}
      </ThemedText>
      {message ? <ThemedText style={styles.error}>{message}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: '#594D43',
    marginTop: 8,
  },
  button: {
    height: 52,
    marginTop: 18,
    width: '100%',
  },
  caption: {
    color: '#6C655C',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  card: {
    backgroundColor: '#FBF8F2',
    borderRadius: 28,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
  },
  error: {
    color: '#9A3412',
    marginTop: 10,
  },
});
