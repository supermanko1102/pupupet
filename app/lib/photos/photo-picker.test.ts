import { describe, expect, it } from 'vitest';

import { PHOTO_PICKER_OPTIONS, firstPickedAsset } from '@/lib/photos/photo-picker';

describe('photo picker helpers', () => {
  it('keeps a single shared picker configuration', () => {
    expect(PHOTO_PICKER_OPTIONS).toMatchObject({
      allowsEditing: false,
      mediaTypes: ['images'],
      quality: 1,
    });
  });

  it('returns the first picked asset', () => {
    expect(firstPickedAsset({
      assets: [{ uri: 'first' }, { uri: 'second' }],
      canceled: false,
    })).toEqual({ uri: 'first' });
  });

  it('returns null when the picker is cancelled or has no assets', () => {
    expect(firstPickedAsset({ assets: [{ uri: 'first' }], canceled: true })).toBe(null);
    expect(firstPickedAsset({ assets: [], canceled: false })).toBe(null);
    expect(firstPickedAsset({ canceled: false })).toBe(null);
  });
});
