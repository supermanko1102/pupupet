import {
  createAdminClient,
  errorResponse,
  fetchBillingAccount,
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

    let account;
    try {
      account = await syncBillingFromRevenueCat(adminClient, user.id);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing REVENUECAT_API_KEY')) {
        account = await fetchBillingAccount(adminClient, user.id);
      } else {
        throw error;
      }
    }

    return jsonResponse({
      account,
      remaining: subscriptionRemaining(account),
    });
  } catch (error) {
    console.error('sync-billing error:', error);
    return errorResponse(error);
  }
});
