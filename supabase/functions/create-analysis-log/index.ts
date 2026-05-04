import {
  createAdminClient,
  errorResponse,
  getAuthenticatedUser,
  HttpError,
  jsonResponse,
} from '../_shared/billing.ts';
import { AnalysisInputError, parseAnalysisImagePath } from '../_shared/analysis-input.ts';

type CreateAnalysisBody = {
  imagePath?: unknown;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const adminClient = createAdminClient();
    const user = await getAuthenticatedUser(req, adminClient);
    const body = await req.json().catch(() => ({})) as CreateAnalysisBody;
    const { fileName, imagePath } = parseAnalysisImagePath(body.imagePath, user.id);

    const { data: objects, error: listError } = await adminClient.storage
      .from('poop-photos')
      .list(user.id, {
        limit: 1,
        search: fileName,
      });

    if (listError) {
      throw listError;
    }

    if (!objects?.some((object) => object.name === fileName)) {
      throw new HttpError(404, 'Uploaded image was not found', 'image_not_found');
    }

    const { data, error } = await adminClient.rpc('create_photo_analysis_log', {
      p_user_id: user.id,
      p_image_path: imagePath,
    });

    if (error) {
      if (error.message.includes('analysis quota exceeded')) {
        throw new HttpError(402, '本月 AI 分析額度已用完。', 'quota_exceeded');
      }
      throw error;
    }

    const log = Array.isArray(data) ? data[0] : data;
    return jsonResponse({ log });
  } catch (error) {
    if (error instanceof AnalysisInputError) {
      return errorResponse(new HttpError(error.status, error.message, error.code));
    }

    console.error('create-analysis-log error:', error);
    return errorResponse(error);
  }
});
