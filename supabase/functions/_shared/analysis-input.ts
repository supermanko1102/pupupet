export class AnalysisInputError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string
  ) {
    super(message);
  }
}

export function parseAnalysisImagePath(imagePathValue: unknown, userId: string) {
  if (typeof imagePathValue !== 'string' || !imagePathValue.trim()) {
    throw new AnalysisInputError(400, 'Missing image path', 'invalid_request');
  }

  const imagePath = imagePathValue.trim();
  const expectedPrefix = `${userId}/`;
  if (!imagePath.startsWith(expectedPrefix)) {
    throw new AnalysisInputError(403, 'Image does not belong to the authenticated user', 'forbidden');
  }

  const fileName = imagePath.slice(expectedPrefix.length);
  if (!fileName || fileName.includes('/')) {
    throw new AnalysisInputError(400, 'Invalid image path', 'invalid_request');
  }

  return { fileName, imagePath };
}
