import type { ImagePickerAsset } from 'expo-image-picker';

import { supabase } from '@/lib/supabase';
import { getUploadFileExtension } from '@/lib/photos/upload-path';

export async function uploadPoopPhoto(userId: string, asset: ImagePickerAsset) {
  if (!supabase) {
    throw new Error('Supabase 尚未設定完成。');
  }

  const response = await fetch(asset.uri);
  const file = await response.arrayBuffer();
  const extension = getUploadFileExtension(asset);
  const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error } = await supabase.storage.from('poop-photos').upload(filePath, file, {
    contentType: asset.mimeType ?? 'image/jpeg',
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return filePath;
}

export async function deletePoopPhoto(filePath: string) {
  if (!supabase) {
    return;
  }

  await supabase.storage.from('poop-photos').remove([filePath]);
}
