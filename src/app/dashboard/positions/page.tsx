import Link from "next/link";
import PositionForm from "./PositionForm";

import { sql } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { hasEditAccess } from "@/lib/permissions";

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
    "HR Officer",
  ]);

  const departments = (await sql`
    SELECT
      id,
      name
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
      positions.title,
      positions.code,
      positions.description,
      positions.minimum_salary,
      positions.maximum_salary,
      positions.status,
      departments.name

    ORDER BY
      departments.name,
      positions.title
  `) as Position[];

  const canCreate =
    user.role === "Administrator" ||
    user.role === "HR Officer";

  /*
   * Administrator:
   * Can edit every position.
   *
   * HR Officer:
   * Can only edit positions where temporary edit access
   * has been approved by the Administrator.
   */
  const editablePositionIds = new Set<string>();

  if (user.role === "Administrator") {
    for (const position of positions) {
      editablePositionIds.add(position.id);
    }
  } else if (user.role === "HR Officer") {
    const permissionResults = await Promise.all(
      positions.map(async (position) => {
        const allowed = await hasEditAccess(
          user,
          "Job Positions",
          position.id
        );

        return allowed ? position.id : null;
      })
    );

    for (const positionId of permissionResults) {
      if (positionId) {
        editablePositionIds.add(positionId);
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-3xl font-black text-slate-900">
          Job Positions
        </h1>

        <p className="mt-2 text-slate-500">
          Manage job positions and salary ranges under each
          department.
        </p>
      </div>

      {/* ADD POSITION */}
      {canCreate && (
        <PositionForm departments={departments} />
      )}

      {/* POSITION LIST */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-black text-slate-900">
            Position List
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Existing job positions and their assigned departments.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-700">
                  Position
                </th>

                <th className="px-6 py-4 text-sm font-bold text-slate-700">
                  Department
                </th>

                <th className="px-6 py-4 text-sm font-bold text-slate-700">
                  Code
                </th>

                <th className="px-6 py-4 text-sm font-bold text-slate-700">
                  Salary Range
                </th>

                <th className="px-6 py-4 text-sm font-bold text-slate-700">
                  Employees
                </th>

                <th className="px-6 py-4 text-sm font-bold text-slate-700">
                  Status
                </th>

                <th className="px-6 py-4 text-sm font-bold text-slate-700">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {positions.map((position) => {
                const canEdit =
                  editablePositionIds.has(position.id);

                return (
                  <tr
                    key={position.id}
                    className="border-t border-slate-100 transition hover:bg-slate-50"
                  >
                    {/* POSITION */}
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">
                        {position.title}
                      </p>

                      <p className="mt-1 max-w-md text-sm text-slate-500">
                        {position.description ||
                          "No description"}
                      </p>
                    </td>

                    {/* DEPARTMENT */}
                    <td className="px-6 py-4 text-slate-700">
                      {position.department_name}
                    </td>

                    {/* CODE */}
                    <td className="px-6 py-4">
                      {position.code ? (
                        <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                          {position.code}
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          —
                        </span>
                      )}
                    </td>

                    {/* SALARY RANGE */}
                    <td className="px-6 py-4 text-slate-700">
                      <div className="font-semibold">
                        USD{" "}
                        {Number(
                          position.minimum_salary || 0
                        ).toFixed(2)}
                      </div>

                      <div className="text-sm text-slate-500">
                        to USD{" "}
                        {Number(
                          position.maximum_salary || 0
                        ).toFixed(2)}
                      </div>
                    </td>

                    {/* EMPLOYEE COUNT */}
                    <td className="px-6 py-4">
                      <span className="inline-flex min-w-9 justify-center rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-700">
                        {position.employee_count}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-4">
                      {position.status === "active" ? (
                        <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600">
                          {position.status}
                        </span>
                      )}
                    </td>

                    {/* ACTION */}
                    <td className="px-6 py-4">
                      {canEdit ? (
                        <Link
                          href={`/dashboard/positions/${position.id}/edit`}
                          className="inline-flex rounded-lg border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                        >
                          Edit
                        </Link>
                      ) : user.role === "HR Officer" ? (
                        <Link
                          href="/dashboard/edit-access"
                          className="inline-flex rounded-lg bg-amber-50 px-4 py-2 text-sm font-black text-amber-700 transition hover:bg-amber-100"
                        >
                          Request Edit
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })}

              {positions.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No job positions have been added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* HR INFORMATION */}
      {user.role === "HR Officer" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-bold text-amber-900">
            Editing Existing Records
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            HR Officers can create new job positions but cannot
            directly modify previously captured records. If a
            correction is required, click{" "}
            <strong>Request Edit</strong> and wait for
            Administrator approval.
          </p>
        </div>
      )}
    </div>
  );
}