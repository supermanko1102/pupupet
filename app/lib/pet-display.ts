export function petSpeciesEmoji(species: string | null | undefined): string {
  if (species === 'dog') return '🐶';
  if (species === 'cat') return '🐱';
  return '🐾';
}
