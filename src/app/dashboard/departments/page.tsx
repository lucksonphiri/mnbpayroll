import DepartmentManager from "./DepartmentManager";

import { sql } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { hasEditAccess } from "@/lib/permissions";

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
  const user = await requireRole(["Administrator", "HR Officer"]);

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

      {user.role === "HR Officer" && !(await hasEditAccess(user, "Departments")) && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Existing departments are locked after capture. <a href="/dashboard/edit-access" className="font-black underline">Request edit access</a> to correct a mistake.</div>
      )}
      <DepartmentManager initialDepartments={departments} canDelete={user.role === "Administrator"} canEdit={await hasEditAccess(user, "Departments")} />

    </div>
  );
}