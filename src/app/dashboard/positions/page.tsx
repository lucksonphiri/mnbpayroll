import PositionForm from "./PositionForm";

import { sql } from "@/lib/db";
import { requireRole } from "@/lib/auth";

type Department = {
  id: string;
  name: string;
};

type Position = {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  minimum_salary: string | number;
  maximum_salary: string | number;
  status: string;
  department_name: string;
  employee_count: number;
};

export const dynamic = "force-dynamic";

export default async function PositionsPage() {
  const user = await requireRole([
    "Administrator",
    "Human Resources",
    "Accounts Officer",
  ]);

  const departments = (await sql`
    SELECT id, name
    FROM departments
    WHERE status = 'active'
    ORDER BY name ASC
  `) as Department[];

  const positions = (await sql`
    SELECT
      positions.id,
      positions.title,
      positions.code,
      positions.description,
      positions.minimum_salary,
      positions.maximum_salary,
      positions.status,
      departments.name AS department_name,
      COUNT(employees.id)::int AS employee_count
    FROM positions
    INNER JOIN departments
      ON departments.id = positions.department_id
    LEFT JOIN employees
      ON employees.position_id = positions.id
    GROUP BY
      positions.id,
      departments.name
    ORDER BY
      departments.name,
      positions.title
  `) as Position[];

  const canManage =
    user.role === "Administrator" ||
    user.role === "Human Resources";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">
          Job Positions
        </h1>

        <p className="mt-2 text-slate-500">
          Manage positions and salary ranges under each
          department.
        </p>
      </div>

      {canManage && (
        <PositionForm departments={departments} />
      )}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4">Position</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Salary Range</th>
                <th className="px-6 py-4">Employees</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {positions.map((position) => (
                <tr
                  key={position.id}
                  className="border-t border-slate-100"
                >
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">
                      {position.title}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {position.description ||
                        "No description"}
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    {position.department_name}
                  </td>

                  <td className="px-6 py-4">
                    {position.code || "—"}
                  </td>

                  <td className="px-6 py-4">
                    USD{" "}
                    {Number(
                      position.minimum_salary,
                    ).toFixed(2)}
                    {" – "}
                    USD{" "}
                    {Number(
                      position.maximum_salary,
                    ).toFixed(2)}
                  </td>

                  <td className="px-6 py-4">
                    {position.employee_count}
                  </td>

                  <td className="px-6 py-4 capitalize">
                    {position.status}
                  </td>
                </tr>
              ))}

              {positions.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No job positions have been added.
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