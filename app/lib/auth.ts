import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { supabase } from '@/lib/supabase';

function createRawNonce(byteLength = 32) {
  return Array.from(Crypto.getRandomBytes(byteLength))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export class AppleSignInCanceledError extends Error {
  constructor() {
    super('Apple sign in canceled.');
    this.name = 'AppleSignInCanceledError';
  }
}

export async function signInWithApple(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase 尚未設定完成。');
  }

  const rawNonce = createRawNonce();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      nonce: hashedNonce,
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
      throw new AppleSignInCanceledError();
    }
    throw error;
  }

  if (!credential.identityToken) {
    throw new Error('Apple 沒有回傳 identity token。');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });

  if (error) throw error;

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
}
