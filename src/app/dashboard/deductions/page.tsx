import DeductionForm from "./DeductionForm";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatDate } from "@/lib/date-format";

type Employee = {
  id: string;
  employee_number: string;
  first_name: string;
  surname: string;
};

type DeductionType = {
  id: string;
  name: string;
  code: string;
  calculation_type: string;
  statutory: boolean;
  pre_tax: boolean;
  recurring: boolean;
};

type EmployeeDeduction = {
  id: string;
  employee_number: string;
  first_name: string;
  surname: string;
  deduction_name: string;
  deduction_code: string;
  calculation_type: string;
  amount: string | number;
  percentage: string | number;
  original_balance: string | number;
  remaining_balance: string | number;
  effective_from: Date | string;
  effective_to: Date | string | null;
  status: string;
};

export const dynamic = "force-dynamic";

export default async function DeductionsPage() {
  const user = await requireRole([
    "Administrator",
    "Human Resources",
    "Accounts Officer",
  ]);

  let employees: Employee[] = [];
  let deductionTypes: DeductionType[] = [];
  let deductions: EmployeeDeduction[] = [];
  let databaseAvailable = true;

  try {
    const results = await sql.transaction([
      sql`
        SELECT
          id,
          employee_number,
          first_name,
          surname
        FROM employees
        WHERE status = 'active'
        ORDER BY surname, first_name
      `,

      sql`
        SELECT
          id,
          name,
          code,
          calculation_type,
          statutory,
          pre_tax,
          recurring
        FROM deduction_types
        WHERE status = 'active'
        ORDER BY name
      `,

      sql`
        SELECT
          employee_deductions.id,
          employee_deductions.amount,
          employee_deductions.percentage,
          employee_deductions.original_balance,
          employee_deductions.remaining_balance,
          employee_deductions.effective_from,
          employee_deductions.effective_to,
          employee_deductions.status,

          employees.employee_number,
          employees.first_name,
          employees.surname,

          deduction_types.name AS deduction_name,
          deduction_types.code AS deduction_code,
          deduction_types.calculation_type

        FROM employee_deductions

        INNER JOIN employees
          ON employees.id =
             employee_deductions.employee_id

        INNER JOIN deduction_types
          ON deduction_types.id =
             employee_deductions.deduction_type_id

        ORDER BY
          employees.surname,
          employees.first_name,
          employee_deductions.effective_from DESC
      `,
    ]);

    employees = results[0] as Employee[];
    deductionTypes = results[1] as DeductionType[];
    deductions = results[2] as EmployeeDeduction[];
  } catch (error) {
    databaseAvailable = false;
    console.error(
      "Deductions page database error:",
      error,
    );
  }

  const canManage = [
    "Administrator",
    "Human Resources",
    "Accounts Officer",
  ].includes(user.role);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">
          Employee Deductions
        </h1>

        <p className="mt-2 text-slate-500">
          Manage statutory deductions, loans, salary advances
          and other employee deductions.
        </p>
      </div>

      {!databaseAvailable && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          The system could not connect to the payroll database.
          Check the connection and refresh the page.
        </section>
      )}

      {databaseAvailable &&
        canManage &&
        employees.length > 0 &&
        deductionTypes.length > 0 && (
          <DeductionForm
            employees={employees}
            deductionTypes={deductionTypes}
          />
        )}

      {databaseAvailable && employees.length === 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          Register an active employee before assigning a
          deduction.
        </section>
      )}

      {databaseAvailable &&
        deductionTypes.length === 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            No active deduction types were found.
          </section>
        )}

      {databaseAvailable && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-black text-slate-900">
              Deduction History
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left">
              <thead className="bg-slate-50 text-sm text-slate-600">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Deduction</th>
                  <th className="px-6 py-4">Monthly Value</th>
                  <th className="px-6 py-4">
                    Original Balance
                  </th>
                  <th className="px-6 py-4">
                    Remaining Balance
                  </th>
                  <th className="px-6 py-4">
                    Effective Period
                  </th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {deductions.map((deduction) => (
                  <tr
                    key={deduction.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">
                        {deduction.first_name}{" "}
                        {deduction.surname}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-blue-700">
                        {deduction.employee_number}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-semibold">
                        {deduction.deduction_name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {deduction.deduction_code}
                      </p>
                    </td>

                    <td className="px-6 py-4 font-bold">
                      {deduction.calculation_type ===
                      "percentage"
                        ? `${Number(
                            deduction.percentage,
                          ).toFixed(2)}%`
                        : deduction.calculation_type ===
                            "tax-band"
                          ? "Calculated by tax table"
                          : Number(
                              deduction.amount,
                            ).toFixed(2)}
                    </td>

                    <td className="px-6 py-4">
                      {deduction.calculation_type ===
                      "balance"
                        ? Number(
                            deduction.original_balance,
                          ).toFixed(2)
                        : "—"}
                    </td>

                    <td className="px-6 py-4">
                      {deduction.calculation_type ===
                      "balance"
                        ? Number(
                            deduction.remaining_balance,
                          ).toFixed(2)
                        : "—"}
                    </td>

                    <td className="px-6 py-4">
                      <p>
                        {formatDate(
                          deduction.effective_from,
                        )}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        to{" "}
                        {deduction.effective_to
                          ? formatDate(
                              deduction.effective_to,
                            )
                          : "Current"}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                          deduction.status === "active"
                            ? "bg-green-100 text-green-700"
                            : deduction.status === "completed"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {deduction.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {deductions.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      No employee deductions have been assigned.
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