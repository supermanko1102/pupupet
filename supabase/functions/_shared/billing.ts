import { createClient, type User } from 'npm:@supabase/supabase-js@2';

export const PLUS_ENTITLEMENT_ID = 'plus';
const LEGACY_PLUS_ENTITLEMENT_ID = 'entlabef9aca35';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

type AdminClient = ReturnType<typeof createClient>;

type BillingAccount = {
  current_period_end: string | null;
  free_analysis_remaining: number;
  monthly_analysis_limit: number;
  monthly_analysis_used: number;
  subscription_status: string;
  user_id: string;
};

type RevenueCatEntitlement = {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string | null;
  purchase_date?: string | null;
};

type RevenueCatSubscriberResponse = {
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlement | undefined>;
  };
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'error'
  ) {
    super(message);
  }
}

export function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

export function errorResponse(error: unknown) {
  const status = error instanceof HttpError ? error.status : 500;
  const code = error instanceof HttpError ? error.code : 'internal_error';
  const message = error instanceof Error ? error.message : 'Internal server error';
  return jsonResponse({ code, error: message }, { status });
}

function readJsonSecretMap(name: string): Record<string, string> | null {
  const value = Deno.env.get(name);
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : null;
  } catch {
    return null;
  }
}

function getServiceRoleKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;

  const secretKeys = readJsonSecretMap('SUPABASE_SECRET_KEYS');
  const defaultKey = secretKeys?.default ?? Object.values(secretKeys ?? {})[0];
  if (defaultKey) return defaultKey;

  throw new Error('Missing Supabase service role key');
}

export function createAdminClient(): AdminClient {
  return createClient(supabaseUrl, getServiceRoleKey());
}

export function getBearerToken(req: Request) {
  const authorization = req.headers.get('Authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    throw new HttpError(401, 'Missing bearer token', 'not_authenticated');
  }

  return match[1];
}

export async function getAuthenticatedUser(req: Request, adminClient: AdminClient): Promise<User> {
  const token = getBearerToken(req);
  const { data, error } = await adminClient.auth.getUser(token);

  if (error || !data.user) {
    throw new HttpError(401, 'Invalid user token', 'not_authenticated');
  }

  return data.user;
}

export async function fetchBillingAccount(adminClient: AdminClient, userId: string): Promise<BillingAccount> {
  const { data, error } = await adminClient
    .from('billing_accounts')
    .select('user_id, subscription_status, current_period_end, monthly_analysis_limit, monthly_analysis_used, free_analysis_remaining')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data[0] : data) as BillingAccount;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function isFuture(value: Date | null) {
  return !!value && value.getTime() > Date.now();
}

function getRevenueCatApiKey() {
  const key = Deno.env.get('REVENUECAT_API_KEY');
  if (!key) {
    throw new HttpError(500, 'Missing REVENUECAT_API_KEY secret', 'billing_not_configured');
  }
  return key;
}

function getPlusEntitlementCandidates() {
  const configured = Deno.env.get('REVENUECAT_PLUS_ENTITLEMENT_ID')?.trim();
  return [
    configured,
    PLUS_ENTITLEMENT_ID,
    LEGACY_PLUS_ENTITLEMENT_ID,
  ].filter((value, index, values): value is string => !!value && values.indexOf(value) === index);
}

function findPlusEntitlement(entitlements: Record<string, RevenueCatEntitlement | undefined> | undefined) {
  if (!entitlements) return { entitlement: null, entitlementId: null };

  for (const entitlementId of getPlusEntitlementCandidates()) {
    const entitlement = entitlements[entitlementId];
    if (entitlement) {
      return { entitlement, entitlementId };
    }
  }

  return { entitlement: null, entitlementId: null };
}

async function fetchRevenueCatSubscriber(appUserId: string): Promise<RevenueCatSubscriberResponse | null> {
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${getRevenueCatApiKey()}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new HttpError(502, `RevenueCat sync failed with ${response.status}`, 'revenuecat_sync_failed');
  }

  return await response.json() as RevenueCatSubscriberResponse;
}

export async function syncBillingFromRevenueCat(
  adminClient: AdminClient,
  appUserId: string,
  eventAt?: Date | null
) {
  const subscriber = await fetchRevenueCatSubscriber(appUserId);
  const { entitlement, entitlementId } = findPlusEntitlement(subscriber?.subscriber?.entitlements);
  const expiresAt = parseDate(entitlement?.expires_date ?? null);
  const graceExpiresAt = parseDate(entitlement?.grace_period_expires_date ?? null);
  const effectiveEnd = isFuture(expiresAt) ? expiresAt : graceExpiresAt;
  const isActive = !!entitlement && (!entitlement.expires_date || isFuture(effectiveEnd));
  const status = isActive ? 'active' : 'inactive';

  const { data, error } = await adminClient.rpc('sync_billing_account', {
    p_user_id: appUserId,
    p_subscription_status: status,
    p_entitlement_id: isActive ? entitlementId : null,
    p_product_id: isActive ? entitlement?.product_identifier ?? null : null,
    p_store: null,
    p_environment: null,
    p_period_start: isActive ? toIso(parseDate(entitlement?.purchase_date ?? null)) : null,
    p_period_end: isActive ? toIso(effectiveEnd) : null,
    p_event_at: toIso(eventAt ?? null),
  });

  if (error) {
    throw error;
  }

  return data as BillingAccount;
}

export function subscriptionRemaining(account: BillingAccount) {
  const isSubscribed =
    ['active', 'billing_issue', 'cancelled'].includes(account.subscription_status)
    && !!account.current_period_end
    && new Date(account.current_period_end).getTime() > Date.now();

  return {
    freeRemaining: account.free_analysis_remaining,
    isSubscribed,
    subscriptionRemaining: Math.max(account.monthly_analysis_limit - account.monthly_analysis_used, 0),
  };
}
