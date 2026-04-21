import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
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

  const isIos = Platform.OS === 'ios';
  const canUseApple = isIos && isAvailable === true;
  const showCheckingState = isIos && isAvailable === null;

  return (
    <View style={styles.wrapper}>
      <Pressable
        disabled={!canUseApple || isLoading}
        style={({ pressed }) => [
          styles.button,
          (pressed || isLoading) && canUseApple ? styles.buttonPressed : null,
          !canUseApple ? styles.buttonDisabled : null,
        ]}
        onPress={() => void signInWithApple()}>
        <MaterialCommunityIcons color="#171D1D" name="apple" size={24} />
        <Text style={styles.buttonText}>
          {showCheckingState ? 'Checking Apple Sign In' : 'Continue with Apple'}
        </Text>
        {isLoading ? (
          <View pointerEvents="none" style={styles.loadingOverlay}>
            <ActivityIndicator color="#171D1D" />
          </View>
        ) : null}
      </Pressable>

      {message ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      {!canUseApple ? (
        <Text style={styles.helperText}>
          {showCheckingState
            ? '正在檢查 Apple Sign In 是否可用。'
            : 'Apple Sign In 只會在 iOS 實機或有 capability 的 build 上啟用。'}
        </Text>
      ) : null}

      <Text style={styles.legalText}>
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#DEE3E3',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 12,
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 24,
    position: 'relative',
    shadowColor: 'rgba(23,29,29,0.06)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 32,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    color: '#171D1D',
    fontFamily: Fonts.sans,
    fontSize: 18,
    fontWeight: '700',
  },
  helperText: {
    color: '#6C7A78',
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
    textAlign: 'center',
  },
  legalText: {
    color: 'rgba(60, 73, 72, 0.7)',
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 32,
    textAlign: 'center',
  },
  loadingOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 250, 250, 0.65)',
    borderRadius: 24,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  messageBox: {
    backgroundColor: '#FFDAD6',
    borderRadius: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  messageText: {
    color: '#93000A',
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  wrapper: {
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
});
