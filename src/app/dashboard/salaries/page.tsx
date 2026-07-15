import SalaryForm from "./SalaryForm";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatDate } from "@/lib/date-format";

type Employee = {
  id: string;
  employee_number: string;
  first_name: string;
  surname: string;
  department_name: string | null;
  position_title: string | null;
};

type Salary = {
  id: string;
  employee_id: string;
  employee_number: string;
  first_name: string;
  surname: string;
  department_name: string | null;
  position_title: string | null;
  basic_salary: string | number;
  currency: string;
  payment_frequency: string;
  effective_from: Date | string;
  effective_to: Date | string | null;
  status: string;
};

export const dynamic = "force-dynamic";

export default async function SalariesPage() {
  const user = await requireRole([
    "Administrator",
    "Human Resources",
    "Accounts Officer",
  ]);

  let employees: Employee[] = [];
  let salaries: Salary[] = [];
  let databaseAvailable = true;

  try {
    const results = await sql.transaction([
      sql`
        SELECT
          employees.id,
          employees.employee_number,
          employees.first_name,
          employees.surname,
          departments.name AS department_name,
          positions.title AS position_title
        FROM employees
        LEFT JOIN departments
          ON departments.id = employees.department_id
        LEFT JOIN positions
          ON positions.id = employees.position_id
        WHERE employees.status = 'active'
        ORDER BY
          employees.surname,
          employees.first_name
      `,

      sql`
        SELECT
          employee_salaries.id,
          employee_salaries.employee_id,
          employee_salaries.basic_salary,
          employee_salaries.currency,
          employee_salaries.payment_frequency,
          employee_salaries.effective_from,
          employee_salaries.effective_to,
          employee_salaries.status,

          employees.employee_number,
          employees.first_name,
          employees.surname,

          departments.name AS department_name,
          positions.title AS position_title

        FROM employee_salaries

        INNER JOIN employees
          ON employees.id =
             employee_salaries.employee_id

        LEFT JOIN departments
          ON departments.id =
             employees.department_id

        LEFT JOIN positions
          ON positions.id =
             employees.position_id

        ORDER BY
          employees.surname,
          employees.first_name,
          employee_salaries.effective_from DESC
      `,
    ]);

    employees = results[0] as Employee[];
    salaries = results[1] as Salary[];
  } catch (error) {
    databaseAvailable = false;
    console.error(
      "Salary management database error:",
      error,
    );
  }

  const canManage =
    user.role === "Administrator" ||
    user.role === "Human Resources";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">
          Salary Management
        </h1>

        <p className="mt-2 text-slate-500">
          Assign employee salaries and review salary history.
        </p>
      </div>

      {!databaseAvailable && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          The system could not connect to the payroll database.
          Check your internet connection and refresh the page.
        </section>
      )}

      {databaseAvailable &&
        canManage &&
        employees.length > 0 && (
          <SalaryForm employees={employees} />
        )}

      {databaseAvailable &&
        canManage &&
        employees.length === 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            No active employees are available. Register an
            employee before assigning a salary.
          </section>
        )}

      {databaseAvailable && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-black text-slate-900">
              Employee Salary History
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-slate-50 text-sm text-slate-600">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Position</th>
                  <th className="px-6 py-4">Basic Salary</th>
                  <th className="px-6 py-4">Frequency</th>
                  <th className="px-6 py-4">
                    Effective Period
                  </th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {salaries.map((salary) => (
                  <tr
                    key={salary.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">
                        {salary.first_name} {salary.surname}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-blue-700">
                        {salary.employee_number}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      {salary.department_name || "—"}
                    </td>

                    <td className="px-6 py-4">
                      {salary.position_title || "—"}
                    </td>

                    <td className="px-6 py-4 font-bold">
                      {salary.currency}{" "}
                      {Number(
                        salary.basic_salary,
                      ).toFixed(2)}
                    </td>

                    <td className="px-6 py-4 capitalize">
                      {salary.payment_frequency}
                    </td>

                    <td className="px-6 py-4">
                      <p>
                        {formatDate(
                          salary.effective_from,
                        )}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        to{" "}
                        {salary.effective_to
                          ? formatDate(
                              salary.effective_to,
                            )
                          : "Current"}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                          salary.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {salary.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {salaries.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      No employee salaries have been assigned.
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