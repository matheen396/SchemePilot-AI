import { describe, expect, it } from 'vitest';
import { relatedPercent } from './related-percent';

describe('relatedPercent', () => {
  it('bounds and rounds similarity for display', () => {
    expect(relatedPercent(0.814)).toBe(81);
    expect(relatedPercent(4)).toBe(99);
    expect(relatedPercent(-1)).toBe(1);
    expect(relatedPercent(Number.NaN)).toBe(1);
  });
});
