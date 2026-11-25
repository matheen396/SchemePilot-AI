import { describe, expect, it } from 'vitest';
import { eligibleForProfile, hybridScore, percentile } from './search.js';

const row = { eligibility: { ageMin: 18, ageMax: 30, incomeMax: 300000, employment: 'student' } };
describe('search ranking and eligibility', () => {
  it('combines semantic and lexical relevance', () => {
    expect(hybridScore(0.9, 0)).toBeGreaterThan(hybridScore(0.7, 0));
    expect(hybridScore(0.5, 1)).toBeGreaterThan(0.4);
  });
  it('filters a profile only when it violates a known condition', () => {
    expect(eligibleForProfile(row, { age: 22, annualIncome: 250000, employment: 'student' })).toBe(true);
    expect(eligibleForProfile(row, { age: 35 })).toBe(false);
    expect(eligibleForProfile(row, { employment: 'employed' })).toBe(false);
    expect(eligibleForProfile(row)).toBe(true);
  });
  it('reports nearest-rank percentiles and empty samples', () => {
    expect(percentile([30, 10, 20, 40], 0.5)).toBe(20);
    expect(percentile([], 0.95)).toBe(0);
  });
});
