import {
  createAdminClient,
  errorResponse,
  getAuthenticatedUser,
  HttpError,
  jsonResponse,
} from '../_shared/billing.ts';

type CreateAnalysisBody = {
  imagePath?: unknown;
};

function parseImagePath(body: CreateAnalysisBody, userId: string) {
  if (typeof body.imagePath !== 'string' || !body.imagePath.trim()) {
    throw new HttpError(400, 'Missing image path', 'invalid_request');
  }

  const imagePath = body.imagePath.trim();
  const expectedPrefix = `${userId}/`;
  if (!imagePath.startsWith(expectedPrefix)) {
    throw new HttpError(403, 'Image does not belong to the authenticated user', 'forbidden');
  }

  const fileName = imagePath.slice(expectedPrefix.length);
  if (!fileName || fileName.includes('/')) {
    throw new HttpError(400, 'Invalid image path', 'invalid_request');
  }

  return { fileName, imagePath };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const adminClient = createAdminClient();
    const user = await getAuthenticatedUser(req, adminClient);
    const body = await req.json().catch(() => ({})) as CreateAnalysisBody;
    const { fileName, imagePath } = parseImagePath(body, user.id);

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
    console.error('create-analysis-log error:', error);
    return errorResponse(error);
  }
});
