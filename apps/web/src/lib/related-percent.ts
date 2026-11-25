export function relatedPercent(similarity: number): number {
  if (!Number.isFinite(similarity)) return 1;
  return Math.max(1, Math.min(99, Math.round(similarity * 100)));
}
