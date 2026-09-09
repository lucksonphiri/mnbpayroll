import Link from "next/link";

import EmployeeForm from "../EmployeeForm";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

type Department = {
  id: string;
  name: string;
};

type Position = {
  id: string;
  department_id: string;
  title: string;
};

type Supervisor = {
  id: string;
  employee_number: string;
  first_name: string;
  surname: string;
};

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  await requireRole([
    "Administrator",
    "HR Officer",
  ]);

  const departments = (await sql`
    SELECT id, name
    FROM departments
    WHERE status = 'active'
    ORDER BY name ASC
  `) as Department[];

  const positions = (await sql`
    SELECT id, department_id, title
    FROM positions
    WHERE status = 'active'
    ORDER BY title ASC
  `) as Position[];

  const supervisors = (await sql`
    SELECT
      id,
      employee_number,
      first_name,
      surname
    FROM employees
    WHERE status = 'active'
    ORDER BY surname, first_name
  `) as Supervisor[];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Register Employee
          </h1>

          <p className="mt-2 text-slate-500">
            Add personal, employment and payment information.
          </p>
        </div>

        <Link
          href="/dashboard/employees"
          className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-white"
        >
          Back to Employees
        </Link>
      </div>

      {departments.length === 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <p className="font-bold">No active department was found.</p>
          <p className="mt-2">Create a department before registering an employee.</p>
          <Link
            href="/dashboard/departments"
            className="mt-4 inline-flex rounded-xl bg-amber-700 px-5 py-3 font-bold text-white hover:bg-amber-800"
          >
            Add Department
          </Link>
        </section>
      ) : positions.length === 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <p className="font-bold">No active job position was found.</p>
          <p className="mt-2">Create a job position under an active department before registering an employee.</p>
          <Link
            href="/dashboard/positions"
            className="mt-4 inline-flex rounded-xl bg-amber-700 px-5 py-3 font-bold text-white hover:bg-amber-800"
          >
            Add Job Position
          </Link>
        </section>
      ) : (
        <EmployeeForm
          departments={departments}
          positions={positions}
          supervisors={supervisors}
        />
      )}
    </div>
  );
}