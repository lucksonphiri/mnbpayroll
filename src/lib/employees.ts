export const EMPLOYMENT_TYPES = [
  "permanent",
  "contract",
  "part-time",
  "temporary",
  "casual",
  "intern",
] as const;

export const EMPLOYEE_STATUSES = [
  "active",
  "suspended",
  "terminated",
  "retired",
  "resigned",
  "deceased",
] as const;

export const PAYMENT_METHODS = [
  "bank",
  "cash",
  "mobile-money",
] as const;

export type EmploymentType =
  (typeof EMPLOYMENT_TYPES)[number];

export type EmployeeStatus =
  (typeof EMPLOYEE_STATUSES)[number];

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[number];

export function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function cleanOptionalText(
  value: unknown,
): string | null {
  const result = cleanText(value);
  return result || null;
}

export function cleanDate(value: unknown): string | null {
  const result = cleanText(value);

  if (!result) {
    return null;
  }

  const date = new Date(`${result}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return result;
}

export function isEmploymentType(
  value: string,
): value is EmploymentType {
  return EMPLOYMENT_TYPES.includes(
    value as EmploymentType,
  );
}

export function isEmployeeStatus(
  value: string,
): value is EmployeeStatus {
  return EMPLOYEE_STATUSES.includes(
    value as EmployeeStatus,
  );
}

export function isPaymentMethod(
  value: string,
): value is PaymentMethod {
  return PAYMENT_METHODS.includes(
    value as PaymentMethod,
  );
}