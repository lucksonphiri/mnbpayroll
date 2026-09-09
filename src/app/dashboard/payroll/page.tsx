import PayrollManager from "./PayrollManager";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

type PayrollPeriod = {
  id: string;
  name: string;
  payroll_month: number;
  payroll_year: number;
  start_date: string;
  end_date: string;
  payment_date: string | null;
  status: string;
  run_count: number;
  total_employees: number;
  total_gross_salary: string | number;
  total_deductions: string | number;
  total_net_salary: string | number;
};

type PayrollPeriodRow = {
  id: string;
  name: string;
  payroll_month: number;
  payroll_year: number;
  start_date: Date | string;
  end_date: Date | string;
  payment_date: Date | string | null;
  status: string;
  run_count: number;
  total_employees: number;
  total_gross_salary: string | number;
  total_deductions: string | number;
  total_net_salary: string | number;
};

function formatDatabaseDate(
  value: Date | string,
): string {
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  return String(value).split("T")[0];
}

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const user = await requireRole(["Administrator", "Salaries Officer"]);

  let periods: PayrollPeriod[] = [];
  let databaseAvailable = true;

  try {
    const periodRows = (await sql`
      SELECT
        payroll_periods.id,
        payroll_periods.name,
        payroll_periods.payroll_month,
        payroll_periods.payroll_year,
        payroll_periods.start_date,
        payroll_periods.end_date,
        payroll_periods.payment_date,
        payroll_periods.status,

        COUNT(DISTINCT payroll_runs.id)::int
          AS run_count,

        COALESCE(
          MAX(payroll_runs.total_employees),
          0
        )::int AS total_employees,

        COALESCE(
          MAX(payroll_runs.total_gross_salary),
          0
        ) AS total_gross_salary,

        COALESCE(
          MAX(payroll_runs.total_deductions),
          0
        ) AS total_deductions,

        COALESCE(
          MAX(payroll_runs.total_net_salary),
          0
        ) AS total_net_salary

      FROM payroll_periods

      LEFT JOIN payroll_runs
        ON payroll_runs.payroll_period_id =
           payroll_periods.id

      GROUP BY payroll_periods.id

      ORDER BY
        payroll_periods.payroll_year DESC,
        payroll_periods.payroll_month DESC
    `) as PayrollPeriodRow[];

    periods = periodRows.map((period) => ({
      id: period.id,
      name: period.name,
      payroll_month: Number(period.payroll_month),
      payroll_year: Number(period.payroll_year),
      start_date: formatDatabaseDate(
        period.start_date,
      ),
      end_date: formatDatabaseDate(period.end_date),
      payment_date: period.payment_date
        ? formatDatabaseDate(period.payment_date)
        : null,
      status: period.status,
      run_count: Number(period.run_count ?? 0),
      total_employees: Number(
        period.total_employees ?? 0,
      ),
      total_gross_salary:
        period.total_gross_salary ?? 0,
      total_deductions:
        period.total_deductions ?? 0,
      total_net_salary:
        period.total_net_salary ?? 0,
    }));
  } catch (error) {
    databaseAvailable = false;
    console.error("Payroll page error:", error);
  }

  const canManage = [
    "Administrator",
    "Salaries Officer",
  ].includes(user.role);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">
          Payroll Processing
        </h1>

        <p className="mt-2 text-slate-500">
          Create payroll periods and calculate employee
          earnings and deductions.
        </p>
      </div>

      {!databaseAvailable ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          The system could not connect to the payroll
          database. Check the connection and refresh the page.
        </section>
      ) : (
        <PayrollManager
          periods={periods}
          canManage={canManage}
        />
      )}
    </div>
  );
}