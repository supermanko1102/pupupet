import {
  createAdminClient,
  errorResponse,
  getAuthenticatedUser,
  HttpError,
  jsonResponse,
} from '../_shared/billing.ts';

const PHOTO_BUCKET = 'poop-photos';

type DeletePoopLogBody = {
  logId?: unknown;
};

type PoopLogRow = {
  id: string;
  image_path: string | null;
  status: string;
  user_id: string;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const adminClient = createAdminClient();
    const user = await getAuthenticatedUser(req, adminClient);
    const body = await req.json().catch(() => ({})) as DeletePoopLogBody;

    if (typeof body.logId !== 'string' || !body.logId.trim()) {
      throw new HttpError(400, 'Missing log id', 'invalid_request');
    }

    const logId = body.logId.trim();
    const { data, error } = await adminClient
      .from('poop_logs')
      .select('id, user_id, image_path, status')
      .eq('id', logId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new HttpError(404, 'Log was not found', 'not_found');
    }

    const log = data as PoopLogRow;
    if (log.user_id !== user.id) {
      throw new HttpError(404, 'Log was not found', 'not_found');
    }

    if (log.status !== 'done' && log.status !== 'failed') {
      throw new HttpError(409, '分析中暫時無法刪除。', 'log_not_deletable');
    }

    if (log.image_path) {
      const { error: removeError } = await adminClient.storage
        .from(PHOTO_BUCKET)
        .remove([log.image_path]);

      if (removeError) throw removeError;
    }

    const { error: deleteError } = await adminClient
      .from('poop_logs')
      .delete()
      .eq('id', log.id)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('delete-poop-log error:', error);
    return errorResponse(error);
  }
});
