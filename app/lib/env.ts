const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export const env = {
  supabaseUrl,
  supabaseAnonKey,
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function maskValue(value: string, visibleLength = 10) {
  if (!value) {
    return '(missing)';
  }

  if (value.length <= visibleLength) {
    return value;
  }

  return `${value.slice(0, visibleLength)}...`;
}

export function getSupabaseConfigError() {
  if (isSupabaseConfigured) {
    return null;
  }

  return '缺少 EXPO_PUBLIC_SUPABASE_URL 或 EXPO_PUBLIC_SUPABASE_ANON_KEY。';
}

export function getSupabaseConfigDiagnostics() {
  return {
    anonKeyPresent: Boolean(supabaseAnonKey),
    anonKeyPreview: maskValue(supabaseAnonKey, 14),
    urlPresent: Boolean(supabaseUrl),
    urlPreview: maskValue(supabaseUrl, 36),
  };
}
