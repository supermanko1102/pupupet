export type UploadAssetFileInfo = {
  fileName?: string | null;
  mimeType?: string | null;
};

export function getUploadFileExtension(asset: UploadAssetFileInfo) {
  if (asset.fileName?.includes('.')) {
    const extension = asset.fileName.split('.').pop()?.trim().toLowerCase();
    if (extension) return extension;
  }

  if (asset.mimeType?.includes('/')) {
    const extension = asset.mimeType.split('/')[1]?.trim().toLowerCase();
    if (extension) return extension;
  }

  return 'jpg';
}
