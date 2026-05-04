import type { ImagePickerOptions } from 'expo-image-picker';

export const PHOTO_PICKER_OPTIONS: ImagePickerOptions = {
  allowsEditing: true,
  aspect: [4, 3],
  mediaTypes: ['images'],
  quality: 0.85,
};

export function firstPickedAsset<TAsset>(result: { canceled: boolean; assets?: TAsset[] | null }) {
  if (result.canceled) return null;
  return result.assets?.[0] ?? null;
}
