import type { ImagePickerAsset } from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

function getFileExtension(asset: ImagePickerAsset) {
  if (asset.fileName?.includes('.')) {
    return asset.fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  }

  if (asset.mimeType?.includes('/')) {
    return asset.mimeType.split('/')[1] ?? 'jpg';
  }

  return 'jpg';
}

export async function uploadPoopPhoto(userId: string, asset: ImagePickerAsset) {
  if (!supabase) {
    throw new Error('Supabase 尚未設定完成。');
  }

  const response = await fetch(asset.uri);
  const file = await response.arrayBuffer();
  const extension = getFileExtension(asset);
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
