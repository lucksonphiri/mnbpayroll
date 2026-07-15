export function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function cleanInteger(value: unknown): number {
  const result = Number(value);

  if (!Number.isInteger(result)) {
    return 0;
  }

  return result;
}

export function cleanDate(value: unknown): string | null {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  const parsed = new Date(`${text}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return text;
}

export function money(value: unknown): number {
  const result = Number(value);

  if (!Number.isFinite(result)) {
    return 0;
  }

  return Math.round((result + Number.EPSILON) * 100) / 100;
}

export function calculatePercentage(
  value: number,
  percentage: number,
): number {
  return money(value * (percentage / 100));
}

export function createPayrollPeriodName(
  month: number,
  year: number,
): string {
  const date = new Date(year, month - 1, 1);

  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}