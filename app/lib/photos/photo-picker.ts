import type { ImagePickerOptions } from 'expo-image-picker';

export const PHOTO_PICKER_OPTIONS: ImagePickerOptions = {
  allowsEditing: false,
  mediaTypes: ['images'],
  quality: 1,
};

export function firstPickedAsset<TAsset>(result: { canceled: boolean; assets?: TAsset[] | null }) {
  if (result.canceled) return null;
  return result.assets?.[0] ?? null;
}
