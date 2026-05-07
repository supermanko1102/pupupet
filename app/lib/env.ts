const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
const revenueCatIosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? '';

export const env = {
  revenueCatIosApiKey,
  supabaseUrl,
  supabasePublishableKey,
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export function getSupabaseConfigError() {
  if (isSupabaseConfigured) {
    return null;
  }

  return '缺少 EXPO_PUBLIC_SUPABASE_URL 或 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY。';
}
