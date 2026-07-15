import Link from "next/link";
import { notFound } from "next/navigation";

import PrintPayslipButton from "./PrintPayslipButton";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type PayrollItem = {
  id: string;
  item_type: string;
  item_code: string | null;
  item_name: string;
  amount: string | number;
};

function formatDate(value: Date | string | null): string {
  if (!value) {
    return "Not provided";
  }

  const date =
    value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export const dynamic = "force-dynamic";

export default async function PayslipDetailsPage({
  params,
}: PageProps) {
  await requireRole([
    "Administrator",
    "Human Resources",
    "Accounts Officer",
  ]);

  const { id } = await params;

  const payslipRows = await sql`
    SELECT
      payslips.id,
      payslips.payslip_number,
      payslips.generated_at,

      employee_payrolls.id AS employee_payroll_id,
      employee_payrolls.employee_number,
      employee_payrolls.employee_name,
      employee_payrolls.department_name,
      employee_payrolls.position_name,
      employee_payrolls.currency,
      employee_payrolls.basic_salary,
      employee_payrolls.total_allowances,
      employee_payrolls.gross_salary,
      employee_payrolls.taxable_income,
      employee_payrolls.paye_amount,
      employee_payrolls.statutory_deductions,
      employee_payrolls.voluntary_deductions,
      employee_payrolls.total_deductions,
      employee_payrolls.net_salary,
      employee_payrolls.payment_status,

      payroll_periods.name AS period_name,
      payroll_periods.start_date,
      payroll_periods.end_date,
      payroll_periods.payment_date,

      employees.bank_name,
      employees.bank_account_number,

      generator.full_name AS generated_by_name

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

    INNER JOIN employees
      ON employees.id =
         employee_payrolls.employee_id

    LEFT JOIN users AS generator
      ON generator.id = payslips.generated_by

    WHERE payslips.id = ${id}::uuid
    LIMIT 1
  `;

  if (payslipRows.length === 0) {
    notFound();
  }

  const payslip = payslipRows[0];

  const payrollItems = (await sql`
    SELECT
      id,
      item_type,
      item_code,
      item_name,
      amount
    FROM payroll_items
    WHERE employee_payroll_id =
          ${String(payslip.employee_payroll_id)}::uuid
    ORDER BY
      CASE
        WHEN item_type = 'basic-salary' THEN 1
        WHEN item_type = 'allowance' THEN 2
        WHEN item_type = 'bonus' THEN 3
        WHEN item_type = 'overtime' THEN 4
        ELSE 5
      END,
      item_name
  `) as PayrollItem[];

  const earnings = payrollItems.filter((item) =>
    [
      "basic-salary",
      "allowance",
      "bonus",
      "overtime",
    ].includes(item.item_type),
  );

  const deductions = payrollItems.filter((item) =>
    [
      "tax",
      "deduction",
      "employee-contribution",
    ].includes(item.item_type),
  );

  const settingsRows = await sql`
    SELECT setting_key, setting_value
    FROM system_settings
    WHERE setting_key IN (
      'company_name',
      'company_address',
      'company_email',
      'company_phone'
    )
  `;

  const settings = Object.fromEntries(
    settingsRows.map((row) => [
      String(row.setting_key),
      String(row.setting_value ?? ""),
    ]),
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          href="/dashboard/payslips"
          className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700"
        >
          Back to Payslips
        </Link>

        <PrintPayslipButton />
      </div>

      <article className="mx-auto max-w-5xl bg-white p-8 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="border-b-2 border-slate-900 pb-6 text-center">
          <h1 className="text-3xl font-black text-slate-900">
            {settings.company_name ||
              "Payroll Management System"}
          </h1>

          {settings.company_address && (
            <p className="mt-2 text-sm text-slate-600">
              {settings.company_address}
            </p>
          )}

          <p className="mt-1 text-sm text-slate-600">
            {[settings.company_email, settings.company_phone]
              .filter(Boolean)
              .join(" | ")}
          </p>

          <h2 className="mt-5 text-2xl font-black">
            Employee Payslip
          </h2>

          <p className="mt-1 font-semibold text-blue-700">
            {String(payslip.period_name)}
          </p>
        </header>

        <section className="mt-6 grid gap-5 border-b border-slate-300 pb-6 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">
              Employee Name
            </p>
            <p className="font-bold">
              {String(payslip.employee_name)}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Employee Number
            </p>
            <p className="font-bold">
              {String(payslip.employee_number)}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Department
            </p>
            <p className="font-bold">
              {String(
                payslip.department_name || "Not provided",
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Position
            </p>
            <p className="font-bold">
              {String(
                payslip.position_name || "Not provided",
              )}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Payslip Number
            </p>
            <p className="font-bold">
              {String(payslip.payslip_number)}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Payment Date
            </p>
            <p className="font-bold">
              {formatDate(payslip.payment_date)}
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="border-b border-slate-300 pb-2 text-lg font-black">
              Earnings
            </h3>

            <table className="mt-3 w-full">
              <tbody>
                {earnings.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100"
                  >
                    <td className="py-3">
                      {item.item_name}
                    </td>
                    <td className="py-3 text-right">
                      {String(payslip.currency)}{" "}
                      {Number(item.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="font-black">
                  <td className="pt-4">Gross Salary</td>
                  <td className="pt-4 text-right">
                    {String(payslip.currency)}{" "}
                    {Number(
                      payslip.gross_salary,
                    ).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div>
            <h3 className="border-b border-slate-300 pb-2 text-lg font-black">
              Deductions
            </h3>

            <table className="mt-3 w-full">
              <tbody>
                {deductions.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100"
                  >
                    <td className="py-3">
                      {item.item_name}
                    </td>
                    <td className="py-3 text-right">
                      {String(payslip.currency)}{" "}
                      {Number(item.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}

                {deductions.length === 0 && (
                  <tr>
                    <td className="py-3 text-slate-500">
                      No deductions
                    </td>
                    <td className="py-3 text-right">
                      {String(payslip.currency)} 0.00
                    </td>
                  </tr>
                )}
              </tbody>

              <tfoot>
                <tr className="font-black">
                  <td className="pt-4">
                    Total Deductions
                  </td>
                  <td className="pt-4 text-right text-red-700">
                    {String(payslip.currency)}{" "}
                    {Number(
                      payslip.total_deductions,
                    ).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="mt-10 rounded-2xl bg-slate-900 p-6 text-white print:border print:border-slate-900 print:bg-white print:text-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">
              Net Salary
            </span>

            <span className="text-3xl font-black">
              {String(payslip.currency)}{" "}
              {Number(payslip.net_salary).toFixed(2)}
            </span>
          </div>
        </section>

        <section className="mt-8 grid gap-5 text-sm md:grid-cols-2">
          <div>
            <p className="text-slate-500">
              Bank
            </p>
            <p className="font-semibold">
              {String(payslip.bank_name || "Not provided")}
            </p>
          </div>

          <div>
            <p className="text-slate-500">
              Account Number
            </p>
            <p className="font-semibold">
              {String(
                payslip.bank_account_number ||
                  "Not provided",
              )}
            </p>
          </div>
        </section>

        <footer className="mt-12 border-t border-slate-300 pt-5 text-center text-xs text-slate-500">
          <p>
            This is a computer-generated payslip.
          </p>

          <p className="mt-1">
            Generated on{" "}
            {formatDate(payslip.generated_at)}
          </p>
        </footer>
      </article>
    </div>
  );
}