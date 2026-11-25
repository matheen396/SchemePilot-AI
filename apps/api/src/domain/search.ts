export type SearchFilter = { state?: string; category?: string; profile?: { age?: number; annualIncome?: number; employment?: string } };
export type SearchRecord = { id: string; title: string; summary: string; benefits: string; eligibility: Record<string, unknown>; state: string; category: string; source_url: string; reviewed_at: string | null; demo_only: boolean; similarity: number; lexical_rank: number };

export function eligibleForProfile(record: Pick<SearchRecord, 'eligibility'>, profile?: SearchFilter['profile']): boolean {
  if (!profile) return true;
  const e = record.eligibility as { ageMin?: number; ageMax?: number; incomeMax?: number; employment?: string };
  if (profile.age !== undefined && e.ageMin !== undefined && profile.age < e.ageMin) return false;
  if (profile.age !== undefined && e.ageMax !== undefined && profile.age > e.ageMax) return false;
  if (profile.annualIncome !== undefined && e.incomeMax !== undefined && profile.annualIncome > e.incomeMax) return false;
  if (profile.employment && e.employment && profile.employment !== e.employment) return false;
  return true;
}

export function hybridScore(similarity: number, lexicalRank: number): number {
  return 0.8 * similarity + 0.2 * (lexicalRank / (1 + lexicalRank));
}

export function percentile(values: number[], fraction: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)];
}
