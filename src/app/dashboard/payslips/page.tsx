import Link from "next/link";

import GeneratePayslipsButton from "./GeneratePayslipsButton";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

type ApprovedRun = {
  id: string;
  period_name: string;
  run_number: number;
  total_employees: number;
  generated_payslips: number;
};

type Payslip = {
  id: string;
  payslip_number: string;
  generated_at: Date | string;
  employee_number: string;
  employee_name: string;
  department_name: string | null;
  position_name: string | null;
  currency: string;
  gross_salary: string | number;
  total_deductions: string | number;
  net_salary: string | number;
  period_name: string;
};

function displayDate(value: Date | string): string {
  const date =
    value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const dynamic = "force-dynamic";

export default async function PayslipsPage() {
  await requireRole(["Administrator", "Salaries Officer"]);

  let approvedRuns: ApprovedRun[] = [];
  let payslips: Payslip[] = [];
  let databaseAvailable = true;

  try {
  const results = await sql.transaction([
    sql`
      SELECT
        payroll_runs.id,
        payroll_runs.run_number,
        payroll_runs.total_employees,

        payroll_periods.name AS period_name,
        payroll_periods.payroll_month,
        payroll_periods.payroll_year,

        COUNT(payslips.id)::int AS generated_payslips

      FROM payroll_runs

      INNER JOIN payroll_periods
        ON payroll_periods.id =
           payroll_runs.payroll_period_id

      LEFT JOIN employee_payrolls
        ON employee_payrolls.payroll_run_id =
           payroll_runs.id

      LEFT JOIN payslips
        ON payslips.employee_payroll_id =
           employee_payrolls.id

      WHERE payroll_runs.status = 'approved'

      GROUP BY
        payroll_runs.id,
        payroll_runs.run_number,
        payroll_runs.total_employees,
        payroll_periods.id,
        payroll_periods.name,
        payroll_periods.payroll_month,
        payroll_periods.payroll_year

      ORDER BY
        payroll_periods.payroll_year DESC,
        payroll_periods.payroll_month DESC,
        payroll_runs.run_number DESC
    `,

    sql`
      SELECT
        payslips.id,
        payslips.payslip_number,
        payslips.generated_at,

        employee_payrolls.employee_number,
        employee_payrolls.employee_name,
        employee_payrolls.department_name,
        employee_payrolls.position_name,
        employee_payrolls.currency,
        employee_payrolls.gross_salary,
        employee_payrolls.total_deductions,
        employee_payrolls.net_salary,

        payroll_periods.name AS period_name

      FROM payslips

      INNER JOIN employee_payrolls
        ON employee_payrolls.id =
           payslips.employee_payroll_id

      INNER JOIN payroll_runs
        ON payroll_runs.id =
           employee_payrolls.payroll_run_id

      INNER JOIN payroll_periods
        ON payroll_periods.id =
           payroll_runs.payroll_period_id

      ORDER BY
        payroll_periods.payroll_year DESC,
        payroll_periods.payroll_month DESC,
        employee_payrolls.employee_name
    `,
  ]);

  approvedRuns = results[0] as ApprovedRun[];
  payslips = results[1] as Payslip[];
} catch (error) {
  databaseAvailable = false;
  console.error("Payslips page error:", error);
}

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">
          Payslips
        </h1>

        <p className="mt-2 text-slate-500">
          Generate, view and print employee payslips.
        </p>
      </div>

      {!databaseAvailable ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          The system could not connect to the payroll database.
        </section>
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-black">
                Approved Payroll Runs
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50 text-sm text-slate-600">
                  <tr>
                    <th className="px-6 py-4">Payroll Period</th>
                    <th className="px-6 py-4">Run</th>
                    <th className="px-6 py-4">Employees</th>
                    <th className="px-6 py-4">
                      Payslips Generated
                    </th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {approvedRuns.map((run) => (
                    <tr
                      key={run.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-6 py-4 font-bold">
                        {run.period_name}
                      </td>

                      <td className="px-6 py-4">
                        {run.run_number}
                      </td>

                      <td className="px-6 py-4">
                        {run.total_employees}
                      </td>

                      <td className="px-6 py-4">
                        {run.generated_payslips} of{" "}
                        {run.total_employees}
                      </td>

                      <td className="px-6 py-4">
                        <GeneratePayslipsButton
                          payrollRunId={run.id}
                        />
                      </td>
                    </tr>
                  ))}

                  {approvedRuns.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-slate-500"
                      >
                        No approved payroll runs are available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-black">
                Generated Payslips
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left">
                <thead className="bg-slate-50 text-sm text-slate-600">
                  <tr>
                    <th className="px-6 py-4">Payslip</th>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Period</th>
                    <th className="px-6 py-4">Gross</th>
                    <th className="px-6 py-4">Deductions</th>
                    <th className="px-6 py-4">Net Salary</th>
                    <th className="px-6 py-4">Generated</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {payslips.map((payslip) => (
                    <tr
                      key={payslip.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold">
                          {payslip.payslip_number}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold">
                          {payslip.employee_name}
                        </p>

                        <p className="mt-1 text-sm text-blue-700">
                          {payslip.employee_number}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        {payslip.period_name}
                      </td>

                      <td className="px-6 py-4">
                        {payslip.currency}{" "}
                        {Number(
                          payslip.gross_salary,
                        ).toFixed(2)}
                      </td>

                      <td className="px-6 py-4 text-red-700">
                        {Number(
                          payslip.total_deductions,
                        ).toFixed(2)}
                      </td>

                      <td className="px-6 py-4 font-black text-green-700">
                        {payslip.currency}{" "}
                        {Number(
                          payslip.net_salary,
                        ).toFixed(2)}
                      </td>

                      <td className="px-6 py-4">
                        {displayDate(payslip.generated_at)}
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/payslips/${payslip.id}`}
                          className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {payslips.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        No payslips have been generated.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}