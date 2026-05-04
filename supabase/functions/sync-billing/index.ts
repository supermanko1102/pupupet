import {
  createAdminClient,
  errorResponse,
  getAuthenticatedUser,
  jsonResponse,
  subscriptionRemaining,
  syncBillingFromRevenueCat,
} from '../_shared/billing.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const adminClient = createAdminClient();
    const user = await getAuthenticatedUser(req, adminClient);

    const account = await syncBillingFromRevenueCat(adminClient, user.id);
    return jsonResponse({
      account,
      remaining: subscriptionRemaining(account),
    });
  } catch (error) {
    console.error('sync-billing error:', error);
    return errorResponse(error);
  }
});
