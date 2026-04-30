import {
  createAdminClient,
  errorResponse,
  HttpError,
  jsonResponse,
  syncBillingFromRevenueCat,
} from '../_shared/billing.ts';

type RevenueCatWebhook = {
  api_version?: string;
  event?: {
    aliases?: string[];
    app_user_id?: string;
    event_timestamp_ms?: number;
    id?: string;
    original_app_user_id?: string;
    type?: string;
  };
};

function assertWebhookAuthorized(req: Request) {
  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  if (!expected) {
    throw new HttpError(500, 'Missing REVENUECAT_WEBHOOK_AUTH secret', 'billing_not_configured');
  }

  if (req.headers.get('Authorization') !== expected) {
    throw new HttpError(401, 'Unauthorized webhook', 'not_authenticated');
  }
}

function isUuid(value: string | null | undefined) {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function findAppUserId(event: NonNullable<RevenueCatWebhook['event']>) {
  const candidates = [
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
  ];

  return candidates.find(isUuid) ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    assertWebhookAuthorized(req);

    const payload = await req.json() as RevenueCatWebhook;
    const event = payload.event;
    if (!event?.type) {
      throw new HttpError(400, 'Invalid RevenueCat webhook payload', 'invalid_request');
    }

    if (event.type === 'TEST') {
      return jsonResponse({ received: true, test: true });
    }

    const eventId = event.id ?? crypto.randomUUID();
    const adminClient = createAdminClient();

    const { data: existing, error: existingError } = await adminClient
      .from('billing_events')
      .select('event_id, processed_at')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing?.processed_at) {
      return jsonResponse({ duplicate: true, received: true });
    }

    if (!existing) {
      const { error: insertError } = await adminClient.from('billing_events').insert({
        app_user_id: event.app_user_id ?? null,
        event_id: eventId,
        event_type: event.type,
        raw_event: payload,
      });

      if (insertError) {
        throw insertError;
      }
    }

    const appUserId = findAppUserId(event);
    if (!appUserId) {
      const { error: markIgnoredError } = await adminClient
        .from('billing_events')
        .update({
          processed_at: new Date().toISOString(),
          processing_error: 'ignored: no matching Supabase user id',
        })
        .eq('event_id', eventId);

      if (markIgnoredError) {
        throw markIgnoredError;
      }

      return jsonResponse({ ignored: true, received: true });
    }

    const eventAt = event.event_timestamp_ms ? new Date(event.event_timestamp_ms) : null;
    await syncBillingFromRevenueCat(adminClient, appUserId, eventAt);

    const { error: markProcessedError } = await adminClient
      .from('billing_events')
      .update({
        app_user_id: appUserId,
        processed_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq('event_id', eventId);

    if (markProcessedError) {
      throw markProcessedError;
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error('revenuecat-webhook error:', error);

    return errorResponse(error);
  }
});
