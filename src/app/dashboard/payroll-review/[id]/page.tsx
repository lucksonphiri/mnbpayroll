import Link from "next/link";
import { notFound } from "next/navigation";

import ApprovePayrollButton from "./ApprovePayrollButton";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type EmployeePayroll = {
  id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department_name: string | null;
  position_name: string | null;
  currency: string;
  basic_salary: string | number;
  total_allowances: string | number;
  gross_salary: string | number;
  paye_amount: string | number;
  statutory_deductions: string | number;
  voluntary_deductions: string | number;
  total_deductions: string | number;
  net_salary: string | number;
  payment_status: string;
};

export const dynamic = "force-dynamic";

export default async function PayrollReviewDetailsPage({
  params,
}: PageProps) {
  const user = await requireRole([
    "Administrator",
    "Human Resources",
    "Accounts Officer",
  ]);

  const { id } = await params;

  const runRows = await sql`
    SELECT
      payroll_runs.id,
      payroll_runs.run_number,
      payroll_runs.status,
      payroll_runs.total_employees,
      payroll_runs.total_basic_salary,
      payroll_runs.total_gross_salary,
      payroll_runs.total_deductions,
      payroll_runs.total_net_salary,
      payroll_runs.notes,
      payroll_runs.processed_at,
      payroll_runs.approved_at,

      payroll_periods.name AS period_name,
      payroll_periods.start_date,
      payroll_periods.end_date,
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

    WHERE payroll_runs.id = ${id}::uuid
    LIMIT 1
  `;

  if (runRows.length === 0) {
    notFound();
  }

  const payrollRun = runRows[0];

  const employees = (await sql`
    SELECT
      id,
      employee_id,
      employee_number,
      employee_name,
      department_name,
      position_name,
      currency,
      basic_salary,
      total_allowances,
      gross_salary,
      paye_amount,
      statutory_deductions,
      voluntary_deductions,
      total_deductions,
      net_salary,
      payment_status
    FROM employee_payrolls
    WHERE payroll_run_id = ${id}::uuid
    ORDER BY employee_name
  `) as EmployeePayroll[];

  const canApprove =
    user.role === "Administrator" &&
    payrollRun.status === "completed";

  const warnings = payrollRun.notes
    ? String(payrollRun.notes)
        .split("\n")
        .filter(Boolean)
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-bold text-blue-700">
            Payroll Run {String(payrollRun.run_number)}
          </p>

          <h1 className="mt-1 text-3xl font-black text-slate-900">
            {String(payrollRun.period_name)}
          </h1>

          <p className="mt-2 text-slate-500">
            Review payroll values before approval.
          </p>
        </div>

        <Link
          href="/dashboard/payroll-review"
          className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-white"
        >
          Back to Payroll Review
        </Link>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Employees
          </p>

          <p className="mt-3 text-3xl font-black">
            {Number(payrollRun.total_employees)}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Gross Salary
          </p>

          <p className="mt-3 text-3xl font-black">
            {Number(
              payrollRun.total_gross_salary,
            ).toFixed(2)}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Deductions
          </p>

          <p className="mt-3 text-3xl font-black text-red-700">
            {Number(
              payrollRun.total_deductions,
            ).toFixed(2)}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Net Salary
          </p>

          <p className="mt-3 text-3xl font-black text-green-700">
            {Number(
              payrollRun.total_net_salary,
            ).toFixed(2)}
          </p>
        </article>
      </section>

      {warnings.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-black text-amber-800">
            Payroll Warnings
          </h2>

          <div className="mt-4 space-y-2 text-sm text-amber-800">
            {warnings.map((warning, index) => (
              <p key={`${warning}-${index}`}>
                {index + 1}. {warning}
              </p>
            ))}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-black">
            Employee Payroll Details
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] text-left">
            <thead className="bg-slate-50 text-sm text-slate-600">
              <tr>
                <th className="px-5 py-4">Employee</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Basic Salary</th>
                <th className="px-5 py-4">Allowances</th>
                <th className="px-5 py-4">Gross Salary</th>
                <th className="px-5 py-4">PAYE</th>
                <th className="px-5 py-4">Statutory</th>
                <th className="px-5 py-4">Other Deductions</th>
                <th className="px-5 py-4">Total Deductions</th>
                <th className="px-5 py-4">Net Salary</th>
              </tr>
            </thead>

            <tbody>
              {employees.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-t border-slate-100"
                >
                  <td className="px-5 py-4">
                    <p className="font-bold">
                      {employee.employee_name}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-blue-700">
                      {employee.employee_number}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {employee.position_name || "No position"}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    {employee.department_name || "—"}
                  </td>

                  <td className="px-5 py-4">
                    {employee.currency}{" "}
                    {Number(
                      employee.basic_salary,
                    ).toFixed(2)}
                  </td>

                  <td className="px-5 py-4">
                    {Number(
                      employee.total_allowances,
                    ).toFixed(2)}
                  </td>

                  <td className="px-5 py-4 font-bold">
                    {Number(
                      employee.gross_salary,
                    ).toFixed(2)}
                  </td>

                  <td className="px-5 py-4">
                    {Number(
                      employee.paye_amount,
                    ).toFixed(2)}
                  </td>

                  <td className="px-5 py-4">
                    {Number(
                      employee.statutory_deductions,
                    ).toFixed(2)}
                  </td>

                  <td className="px-5 py-4">
                    {Number(
                      employee.voluntary_deductions,
                    ).toFixed(2)}
                  </td>

                  <td className="px-5 py-4 text-red-700">
                    {Number(
                      employee.total_deductions,
                    ).toFixed(2)}
                  </td>

                  <td className="px-5 py-4 font-black text-green-700">
                    {Number(
                      employee.net_salary,
                    ).toFixed(2)}
                  </td>
                </tr>
              ))}

              {employees.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No employee payroll records were found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              Payroll Status
            </p>

            <p className="mt-2 text-xl font-black capitalize">
              {String(payrollRun.status)}
            </p>

            {payrollRun.approved_by_name && (
              <p className="mt-1 text-sm text-slate-500">
                Approved by{" "}
                {String(payrollRun.approved_by_name)}
              </p>
            )}
          </div>

          {canApprove && (
            <ApprovePayrollButton payrollRunId={id} />
          )}

          {payrollRun.status === "approved" && (
            <p className="rounded-xl bg-green-100 px-5 py-3 font-bold text-green-700">
              Payroll Approved
            </p>
          )}
        </div>
      </section>
    </div>
  );
}