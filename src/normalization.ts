export const normalizeOptionalNumber = (
  value: number | null | undefined
): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export const normalizeRequiredNumber = (
  value: number | null | undefined,
  fallback: number
): number => normalizeOptionalNumber(value) ?? fallback;

export const normalizeNonNegative = (
  value: number | null | undefined,
  fallback: number
): number => Math.max(0, normalizeRequiredNumber(value, fallback));

export const normalizeOptionalNonNegative = (
  value: number | null | undefined
): number | undefined => {
  const normalized = normalizeOptionalNumber(value);
  return normalized === undefined ? undefined : Math.max(0, normalized);
};

export const normalizeOpacity = (
  value: number | null | undefined,
  fallback: number
): number => Math.min(1, Math.max(0, normalizeRequiredNumber(value, fallback)));
