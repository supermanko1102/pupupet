import { describe, expect, it } from 'vitest';

import { getUploadFileExtension } from '@/lib/photos/upload-path';

describe('upload helpers', () => {
  it('uses a lowercase extension from the asset file name', () => {
    expect(getUploadFileExtension({
      fileName: 'poop-photo.PNG',
      mimeType: 'image/jpeg',
    })).toBe('png');
  });

  it('falls back to the mime type subtype', () => {
    expect(getUploadFileExtension({
      fileName: null,
      mimeType: 'image/webp',
    })).toBe('webp');
  });

  it('uses jpg when file name and mime type are missing', () => {
    expect(getUploadFileExtension({
      fileName: null,
      mimeType: null,
    })).toBe('jpg');
  });

  it('ignores empty file name extensions', () => {
    expect(getUploadFileExtension({
      fileName: 'photo.',
      mimeType: 'image/heic',
    })).toBe('heic');
  });
});
