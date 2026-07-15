import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

type Employee = {
  id: string;
  employee_number: string;
  title: string | null;
  first_name: string;
  surname: string;
  email: string | null;
  phone_number: string | null;
  employment_type: string;
  status: string;
  department_name: string | null;
  position_title: string | null;
};

type PageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    departmentId?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: PageProps) {
  const user = await requireRole([
    "Administrator",
    "Human Resources",
    "Accounts Officer",
  ]);

  const filters = await searchParams;

  const search = filters.search?.trim() ?? "";
  const status = filters.status?.trim() ?? "";
  const departmentId =
  filters.departmentId?.trim() || null;

  const employees = (await sql`
    SELECT
      employees.id,
      employees.employee_number,
      employees.title,
      employees.first_name,
      employees.surname,
      employees.email,
      employees.phone_number,
      employees.employment_type,
      employees.status,
      departments.name AS department_name,
      positions.title AS position_title
    FROM employees
    LEFT JOIN departments
      ON departments.id = employees.department_id
    LEFT JOIN positions
      ON positions.id = employees.position_id
    WHERE (
      ${search} = ''
      OR employees.employee_number ILIKE ${`%${search}%`}
      OR employees.first_name ILIKE ${`%${search}%`}
      OR employees.surname ILIKE ${`%${search}%`}
      OR COALESCE(employees.email, '') ILIKE ${`%${search}%`}
    )
    AND (
      ${status} = ''
      OR employees.status = ${status}
    )
    AND (
  ${departmentId}::uuid IS NULL
  OR employees.department_id = ${departmentId}::uuid
)
    ORDER BY employees.surname, employees.first_name
  `) as Employee[];

  const departments = await sql`
    SELECT id, name
    FROM departments
    ORDER BY name ASC
  `;

  const canCreate =
    user.role === "Administrator" ||
    user.role === "Human Resources";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Employees
          </h1>

          <p className="mt-2 text-slate-500">
            View and manage employee records.
          </p>
        </div>

        {canCreate && (
          <Link
            href="/dashboard/employees/new"
            className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800"
          >
            Add Employee
          </Link>
        )}
      </div>

      <form className="mt-8 grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-4">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search employee..."
          className="rounded-xl border border-slate-300 px-4 py-3"
        />

        <select
          name="departmentId"
          defaultValue={departmentId ?? ""}
          className="rounded-xl border border-slate-300 px-4 py-3"
        >
          <option value="">All departments</option>

          {departments.map((department) => (
            <option
              key={String(department.id)}
              value={String(department.id)}
            >
              {String(department.name)}
            </option>
          ))}
        </select>

        <select
          name="status"
          defaultValue={status}
          className="rounded-xl border border-slate-300 px-4 py-3"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="terminated">Terminated</option>
          <option value="resigned">Resigned</option>
          <option value="retired">Retired</option>
        </select>

        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white"
        >
          Apply Filters
        </button>
      </form>

      <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-slate-50 text-sm text-slate-600">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Position</th>
                <th className="px-6 py-4">Employment</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {employees.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-t border-slate-100"
                >
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">
                      {employee.title
                        ? `${employee.title} `
                        : ""}
                      {employee.first_name}{" "}
                      {employee.surname}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-blue-700">
                      {employee.employee_number}
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    {employee.department_name || "—"}
                  </td>

                  <td className="px-6 py-4">
                    {employee.position_title || "—"}
                  </td>

                  <td className="px-6 py-4 capitalize">
                    {employee.employment_type}
                  </td>

                  <td className="px-6 py-4">
                    <p>{employee.email || "—"}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {employee.phone_number || "—"}
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                        employee.status === "active"
                          ? "bg-green-100 text-green-700"
                          : employee.status === "suspended"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {employee.status}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/employees/${employee.id}`}
                      className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}

              {employees.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No employees matched the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}