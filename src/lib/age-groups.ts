/**
 * Canonical age groups = the eight handbook chapters (identical in both editions).
 * Bounds are normalised to months for filtering; the source wording is stored
 * separately (age_groups.source_text_*) and is what the UI shows.
 *
 * Chapter 1 starts at six weeks. 6 weeks = 42 days = 1.380 months (42 / 30.4375),
 * kept as a decimal and with min_age_weeks = 6 — never rounded to "1 month" or "0".
 */
export interface AgeGroupDef {
  code: string;
  chapter: number;
  minAgeMonths: number;
  maxAgeMonths: number;
  minAgeWeeks: number | null;
  labelHe: string;
  labelAr: string;
}

const DAYS_PER_MONTH = 30.4375;
const weeksToMonths = (w: number) => Math.round(((w * 7) / DAYS_PER_MONTH) * 1000) / 1000;

export const AGE_GROUPS: AgeGroupDef[] = [
  { code: "6w-3m", chapter: 1, minAgeMonths: weeksToMonths(6), maxAgeMonths: 3, minAgeWeeks: 6, labelHe: "6 שבועות עד 3 חודשים", labelAr: "6 أسابيع حتى 3 أشهر" },
  { code: "3m-6m", chapter: 2, minAgeMonths: 3, maxAgeMonths: 6, minAgeWeeks: null, labelHe: "3 עד 6 חודשים", labelAr: "3 حتى 6 أشهر" },
  { code: "6m-9m", chapter: 3, minAgeMonths: 6, maxAgeMonths: 9, minAgeWeeks: null, labelHe: "6 עד 9 חודשים", labelAr: "6 حتى 9 أشهر" },
  { code: "9m-12m", chapter: 4, minAgeMonths: 9, maxAgeMonths: 12, minAgeWeeks: null, labelHe: "9 עד 12 חודשים", labelAr: "9 حتى 12 شهراً" },
  { code: "12m-18m", chapter: 5, minAgeMonths: 12, maxAgeMonths: 18, minAgeWeeks: null, labelHe: "12 עד 18 חודשים", labelAr: "12 حتى 18 شهراً" },
  { code: "18m-24m", chapter: 6, minAgeMonths: 18, maxAgeMonths: 24, minAgeWeeks: null, labelHe: "18 עד 24 חודשים", labelAr: "18 حتى 24 شهراً" },
  { code: "24m-36m", chapter: 7, minAgeMonths: 24, maxAgeMonths: 36, minAgeWeeks: null, labelHe: "24 עד 36 חודשים", labelAr: "24 حتى 36 شهراً" },
  { code: "36m-48m", chapter: 8, minAgeMonths: 36, maxAgeMonths: 48, minAgeWeeks: null, labelHe: "36 עד 48 חודשים", labelAr: "36 حتى 48 شهراً" },
];

export function ageGroupForMonths(months: number): AgeGroupDef | null {
  // Bands share boundaries (3 months ends chapter 1 and starts chapter 2): prefer the band that starts there.
  return AGE_GROUPS.find((g) => months >= g.minAgeMonths && months < g.maxAgeMonths) ?? (months === 48 ? AGE_GROUPS[7] : null);
}

export function ageGroupByChapter(chapter: number): AgeGroupDef | undefined {
  return AGE_GROUPS.find((g) => g.chapter === chapter);
}
