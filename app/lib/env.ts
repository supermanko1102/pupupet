const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

export const env = {
  supabaseUrl,
  supabasePublishableKey,
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

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

  return '缺少 EXPO_PUBLIC_SUPABASE_URL 或 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY。';
}

export function getSupabaseConfigDiagnostics() {
  return {
    publishableKeyPresent: Boolean(supabasePublishableKey),
    publishableKeyPreview: maskValue(supabasePublishableKey, 14),
    urlPresent: Boolean(supabaseUrl),
    urlPreview: maskValue(supabaseUrl, 36),
  };
}
