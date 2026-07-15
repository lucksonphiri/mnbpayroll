import DepartmentManager from "./DepartmentManager";

import { sql } from "@/lib/db";
import { requireRole } from "@/lib/auth";

type Department = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  position_count: number;
  employee_count: number;
};

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const user = await requireRole([
    "Administrator",
    "Human Resources",
    "Accounts Officer",
  ]);

  const departments = (await sql`
    SELECT
      departments.id,
      departments.name,
      departments.code,
      departments.description,
      departments.status,
      COUNT(DISTINCT positions.id)::int AS position_count,
      COUNT(DISTINCT employees.id)::int AS employee_count
    FROM departments
    LEFT JOIN positions
      ON positions.department_id = departments.id
    LEFT JOIN employees
      ON employees.department_id = departments.id
    GROUP BY departments.id
    ORDER BY departments.name ASC
  `) as Department[];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900">
          Departments
        </h1>

        <p className="mt-2 text-slate-500">
          Create and manage organisational departments.
        </p>
      </div>

      {user.role === "Accounts Officer" ? (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Positions</th>
                  <th className="px-6 py-4">Employees</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {departments.map((department) => (
                  <tr
                    key={department.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-6 py-4 font-bold">
                      {department.name}
                    </td>
                    <td className="px-6 py-4">
                      {department.code || "—"}
                    </td>
                    <td className="px-6 py-4">
                      {department.position_count}
                    </td>
                    <td className="px-6 py-4">
                      {department.employee_count}
                    </td>
                    <td className="px-6 py-4 capitalize">
                      {department.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <DepartmentManager
          initialDepartments={departments}
          canDelete={user.role === "Administrator"}
        />
      )}
    </div>
  );
}