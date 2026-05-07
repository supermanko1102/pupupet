import {
  createAdminClient,
  errorResponse,
  getAuthenticatedUser,
  jsonResponse,
} from '../_shared/billing.ts';

const PHOTO_BUCKET = 'poop-photos';
const STORAGE_LIST_LIMIT = 100;

type StorageObject = {
  id: string | null;
  name: string;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const adminClient = createAdminClient();
    const user = await getAuthenticatedUser(req, adminClient);
    const photoPaths = await listStoragePaths(adminClient, user.id);

    for (let index = 0; index < photoPaths.length; index += STORAGE_LIST_LIMIT) {
      const chunk = photoPaths.slice(index, index + STORAGE_LIST_LIMIT);
      const { error } = await adminClient.storage.from(PHOTO_BUCKET).remove(chunk);
      if (error) throw error;
    }

    const { error: billingEventsError } = await adminClient
      .from('billing_events')
      .delete()
      .eq('app_user_id', user.id);
    if (billingEventsError) throw billingEventsError;

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteUserError) throw deleteUserError;

    return jsonResponse({
      deleted: true,
      removedPhotoCount: photoPaths.length,
    });
  } catch (error) {
    console.error('delete-account error:', error);
    return errorResponse(error);
  }
});

async function listStoragePaths(
  adminClient: ReturnType<typeof createAdminClient>,
  prefix: string
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await adminClient.storage
      .from(PHOTO_BUCKET)
      .list(prefix, {
        limit: STORAGE_LIST_LIMIT,
        offset,
      });

    if (error) throw error;
    if (!data?.length) break;

    for (const object of data as StorageObject[]) {
      const path = `${prefix}/${object.name}`;
      if (object.id === null) {
        paths.push(...await listStoragePaths(adminClient, path));
      } else {
        paths.push(path);
      }
    }

    if (data.length < STORAGE_LIST_LIMIT) break;
    offset += STORAGE_LIST_LIMIT;
  }

  return paths;
}
