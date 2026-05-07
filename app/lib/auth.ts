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

type FunctionErrorBody = {
  code?: string;
  error?: string;
};

async function readFunctionError(error: unknown) {
  const context =
    error && typeof error === 'object' && 'context' in error
      ? (error as { context?: unknown }).context
      : null;

  if (typeof Response !== 'undefined' && context instanceof Response) {
    const body = (await context
      .clone()
      .json()
      .catch(() => null)) as FunctionErrorBody | null;

    if (body?.error) {
      return new Error(body.error);
    }
  }

  return error instanceof Error ? error : new Error('請求失敗。');
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

export async function deleteCurrentAccount(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase 尚未設定完成。');
  }

  const { error } = await supabase.functions.invoke('delete-account', {
    body: {},
  });

  if (error) {
    throw await readFunctionError(error);
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
  if (signOutError) {
    console.warn('Local sign out after account deletion failed:', signOutError);
  }
}
