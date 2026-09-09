import "server-only";

import { sql } from "@/lib/db";
import type { SessionPayload } from "@/lib/session";

export const HR_MODULES = ["Departments", "Job Positions", "Employees"] as const;
export const SALARIES_MODULES = [
  "Salary Management",
  "Employee Allowances",
  "Employee Deductions",
  "Payroll Processing",
  "Payroll Review",
  "Payslips",
  "Payments",
] as const;

export function modulesForRole(role: string): readonly string[] {
  if (role === "HR Officer") return HR_MODULES;
  if (role === "Salaries Officer") return SALARIES_MODULES;
  return [];
}

export async function hasEditAccess(
  user: SessionPayload,
  moduleName: string,
  recordId?: string | null,
): Promise<boolean> {
  if (user.role === "Administrator") return true;
  if (!modulesForRole(user.role).includes(moduleName)) return false;

  const rows = await sql`
    SELECT id
    FROM edit_access_requests
    WHERE requester_id = ${user.userId}::uuid
      AND module_name = ${moduleName}
      AND status = 'approved'
      AND grant_expires_at > CURRENT_TIMESTAMP
      AND (
        record_id IS NULL
        OR record_id = ${recordId || null}::uuid
      )
    ORDER BY grant_expires_at DESC
    LIMIT 1
  `;

  return rows.length > 0;
}
