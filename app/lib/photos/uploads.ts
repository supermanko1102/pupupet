import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

const MAX_LONG_EDGE = 2048;
const COMPRESS_QUALITY = 0.85;

async function compressForUpload(asset: ImagePickerAsset) {
  const context = ImageManipulator.manipulate(asset.uri);
  const longEdge = Math.max(asset.width ?? 0, asset.height ?? 0);
  if (longEdge > MAX_LONG_EDGE) {
    const isPortrait = (asset.height ?? 0) > (asset.width ?? 0);
    context.resize(isPortrait ? { height: MAX_LONG_EDGE } : { width: MAX_LONG_EDGE });
  }
  const image = await context.renderAsync();
  return image.saveAsync({ compress: COMPRESS_QUALITY, format: SaveFormat.JPEG });
}

export async function uploadPoopPhoto(userId: string, asset: ImagePickerAsset) {
  if (!supabase) {
    throw new Error('Supabase 尚未設定完成。');
  }

  const compressed = await compressForUpload(asset);
  const response = await fetch(compressed.uri);
  const file = await response.arrayBuffer();
  const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error } = await supabase.storage.from('poop-photos').upload(filePath, file, {
    contentType: 'image/jpeg',
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
