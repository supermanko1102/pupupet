import { describe, expect, it } from 'vitest';

import {
  AnalysisInputError,
  parseAnalysisImagePath,
} from '../../supabase/functions/_shared/analysis-input';

describe('analysis image path parsing', () => {
  it('returns the storage file name and normalized path for a user-owned image', () => {
    expect(parseAnalysisImagePath(' user-id/photo.jpg ', 'user-id')).toEqual({
      fileName: 'photo.jpg',
      imagePath: 'user-id/photo.jpg',
    });
  });

  it('rejects missing image paths', () => {
    expect(() => parseAnalysisImagePath('', 'user-id')).toThrow(AnalysisInputError);

    try {
      parseAnalysisImagePath('', 'user-id');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'invalid_request',
        status: 400,
      });
    }
  });

  it('rejects images outside of the authenticated user folder', () => {
    expect(() => parseAnalysisImagePath('other-user/photo.jpg', 'user-id')).toThrow(
      expect.objectContaining({
        code: 'forbidden',
        status: 403,
      })
    );
  });

  it('rejects nested paths inside the user folder', () => {
    expect(() => parseAnalysisImagePath('user-id/nested/photo.jpg', 'user-id')).toThrow(
      expect.objectContaining({
        code: 'invalid_request',
        status: 400,
      })
    );
  });
});
