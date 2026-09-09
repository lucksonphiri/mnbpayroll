import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

type PayrollRunRow = {
  id: string;
  run_number: number;
  status: string;
  total_employees: number;
  total_gross_salary: string | number;
  total_deductions: string | number;
  total_net_salary: string | number;
  processed_at: Date | string | null;
  approved_at: Date | string | null;
  period_name: string;
  payroll_month: number;
  payroll_year: number;
  payment_date: Date | string | null;
  processed_by_name: string | null;
  approved_by_name: string | null;
};

type PayrollRun = {
  id: string;
  run_number: number;
  status: string;
  total_employees: number;
  total_gross_salary: string | number;
  total_deductions: string | number;
  total_net_salary: string | number;
  processed_at: string | null;
  approved_at: string | null;
  period_name: string;
  payroll_month: number;
  payroll_year: number;
  payment_date: string | null;
  processed_by_name: string | null;
  approved_by_name: string | null;
};

function serializeDate(
  value: Date | string | null,
): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function displayDate(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const dynamic = "force-dynamic";

export default async function PayrollReviewPage() {
  await requireRole(["Administrator", "Salaries Officer"]);

  let payrollRuns: PayrollRun[] = [];
  let databaseAvailable = true;

  try {
    const rows = (await sql`
      SELECT
        payroll_runs.id,
        payroll_runs.run_number,
        payroll_runs.status,
        payroll_runs.total_employees,
        payroll_runs.total_gross_salary,
        payroll_runs.total_deductions,
        payroll_runs.total_net_salary,
        payroll_runs.processed_at,
        payroll_runs.approved_at,

        payroll_periods.name AS period_name,
        payroll_periods.payroll_month,
        payroll_periods.payroll_year,
        payroll_periods.payment_date,

        processor.full_name AS processed_by_name,
        approver.full_name AS approved_by_name

      FROM payroll_runs

      INNER JOIN payroll_periods
        ON payroll_periods.id =
           payroll_runs.payroll_period_id

      LEFT JOIN users AS processor
        ON processor.id = payroll_runs.processed_by

      LEFT JOIN users AS approver
        ON approver.id = payroll_runs.approved_by

      WHERE payroll_runs.status IN (
        'completed',
        'approved'
      )

      ORDER BY
        payroll_periods.payroll_year DESC,
        payroll_periods.payroll_month DESC,
        payroll_runs.run_number DESC
    `) as PayrollRunRow[];

    payrollRuns = rows.map((row) => ({
      id: row.id,
      run_number: Number(row.run_number),
      status: row.status,
      total_employees: Number(
        row.total_employees ?? 0,
      ),
      total_gross_salary:
        row.total_gross_salary ?? 0,
      total_deductions: row.total_deductions ?? 0,
      total_net_salary: row.total_net_salary ?? 0,
      processed_at: serializeDate(row.processed_at),
      approved_at: serializeDate(row.approved_at),
      period_name: row.period_name,
      payroll_month: Number(row.payroll_month),
      payroll_year: Number(row.payroll_year),
      payment_date: serializeDate(row.payment_date),
      processed_by_name: row.processed_by_name,
      approved_by_name: row.approved_by_name,
    }));
  } catch (error) {
    databaseAvailable = false;
    console.error("Payroll review page error:", error);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">
          Payroll Review and Approval
        </h1>

        <p className="mt-2 text-slate-500">
          Review completed payroll runs before approval and
          payslip generation.
        </p>
      </div>

      {!databaseAvailable ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          The system could not connect to the payroll database.
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left">
              <thead className="bg-slate-50 text-sm text-slate-600">
                <tr>
                  <th className="px-6 py-4">Payroll Period</th>
                  <th className="px-6 py-4">Employees</th>
                  <th className="px-6 py-4">Gross Salary</th>
                  <th className="px-6 py-4">Deductions</th>
                  <th className="px-6 py-4">Net Salary</th>
                  <th className="px-6 py-4">Processed By</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {payrollRuns.map((run) => (
                  <tr
                    key={run.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">
                        {run.period_name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Run {run.run_number}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Processed:{" "}
                        {displayDate(run.processed_at)}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      {run.total_employees}
                    </td>

                    <td className="px-6 py-4">
                      {Number(
                        run.total_gross_salary,
                      ).toFixed(2)}
                    </td>

                    <td className="px-6 py-4">
                      {Number(
                        run.total_deductions,
                      ).toFixed(2)}
                    </td>

                    <td className="px-6 py-4 font-bold">
                      {Number(
                        run.total_net_salary,
                      ).toFixed(2)}
                    </td>

                    <td className="px-6 py-4">
                      {run.processed_by_name || "Unknown"}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                          run.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {run.status}
                      </span>

                      {run.status === "approved" && (
                        <p className="mt-2 text-xs text-slate-500">
                          By{" "}
                          {run.approved_by_name ||
                            "Administrator"}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/payroll-review/${run.id}`}
                        className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}

                {payrollRuns.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      No completed payroll runs are available
                      for review.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}