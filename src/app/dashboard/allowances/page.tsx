import AllowanceForm from "./AllowanceForm";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatDate } from "@/lib/date-format";

type Employee = {
  id: string;
  employee_number: string;
  first_name: string;
  surname: string;
};

type AllowanceType = {
  id: string;
  name: string;
  code: string;
  calculation_type: string;
  taxable: boolean;
  recurring: boolean;
};

type EmployeeAllowance = {
  id: string;
  employee_number: string;
  first_name: string;
  surname: string;
  allowance_name: string;
  allowance_code: string;
  calculation_type: string;
  amount: string | number;
  percentage: string | number;
  taxable: boolean;
  recurring: boolean;
  effective_from: Date | string;
  effective_to: Date | string | null;
  status: string;
};

export const dynamic = "force-dynamic";

export default async function AllowancesPage() {
  const user = await requireRole(["Administrator", "Salaries Officer"]);

  let employees: Employee[] = [];
  let allowanceTypes: AllowanceType[] = [];
  let employeeAllowances: EmployeeAllowance[] = [];
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
          taxable,
          recurring
        FROM allowance_types
        WHERE status = 'active'
        ORDER BY name
      `,

      sql`
        SELECT
          employee_allowances.id,
          employee_allowances.amount,
          employee_allowances.percentage,
          employee_allowances.effective_from,
          employee_allowances.effective_to,
          employee_allowances.status,

          employees.employee_number,
          employees.first_name,
          employees.surname,

          allowance_types.name AS allowance_name,
          allowance_types.code AS allowance_code,
          allowance_types.calculation_type,
          allowance_types.taxable,
          allowance_types.recurring

        FROM employee_allowances

        INNER JOIN employees
          ON employees.id =
             employee_allowances.employee_id

        INNER JOIN allowance_types
          ON allowance_types.id =
             employee_allowances.allowance_type_id

        ORDER BY
          employees.surname,
          employees.first_name,
          employee_allowances.effective_from DESC
      `,
    ]);

    employees = results[0] as Employee[];
    allowanceTypes = results[1] as AllowanceType[];
    employeeAllowances =
      results[2] as EmployeeAllowance[];
  } catch (error) {
    databaseAvailable = false;
    console.error(
      "Allowances page database error:",
      error,
    );
  }

  const canManage =
    user.role === "Administrator" ||
    user.role === "Salaries Officer";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">
          Employee Allowances
        </h1>

        <p className="mt-2 text-slate-500">
          Assign and review recurring and once-off employee
          allowances.
        </p>
      </div>

      {!databaseAvailable && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          The system could not connect to the payroll database.
          Check your connection and refresh the page.
        </section>
      )}

      {databaseAvailable &&
        canManage &&
        employees.length > 0 &&
        allowanceTypes.length > 0 && (
          <AllowanceForm
            employees={employees}
            allowanceTypes={allowanceTypes}
          />
        )}

      {databaseAvailable &&
        canManage &&
        employees.length === 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            Register an active employee before assigning an
            allowance.
          </section>
        )}

      {databaseAvailable &&
        canManage &&
        allowanceTypes.length === 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            No active allowance types were found.
          </section>
        )}

      {databaseAvailable && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-black text-slate-900">
              Allowance History
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-slate-50 text-sm text-slate-600">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Allowance</th>
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4">Taxable</th>
                  <th className="px-6 py-4">Recurring</th>
                  <th className="px-6 py-4">
                    Effective Period
                  </th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {employeeAllowances.map((allowance) => (
                  <tr
                    key={allowance.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">
                        {allowance.first_name}{" "}
                        {allowance.surname}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-blue-700">
                        {allowance.employee_number}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-semibold">
                        {allowance.allowance_name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {allowance.allowance_code}
                      </p>
                    </td>

                    <td className="px-6 py-4 font-bold">
                      {allowance.calculation_type ===
                      "percentage"
                        ? `${Number(
                            allowance.percentage,
                          ).toFixed(2)}%`
                        : Number(
                            allowance.amount,
                          ).toFixed(2)}
                    </td>

                    <td className="px-6 py-4">
                      {allowance.taxable ? "Yes" : "No"}
                    </td>

                    <td className="px-6 py-4">
                      {allowance.recurring ? "Yes" : "No"}
                    </td>

                    <td className="px-6 py-4">
                      <p>
                        {formatDate(
                          allowance.effective_from,
                        )}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        to{" "}
                        {allowance.effective_to
                          ? formatDate(
                              allowance.effective_to,
                            )
                          : "Current"}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                          allowance.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {allowance.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {employeeAllowances.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      No employee allowances have been assigned.
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