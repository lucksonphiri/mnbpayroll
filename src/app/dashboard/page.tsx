import { requireCompletedPasswordChange } from "@/lib/auth";
import { sql } from "@/lib/db";

type DashboardTotals = {
  employee_count: string | number;
  department_count: string | number;
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireCompletedPasswordChange();

  let employeeCount = 0;
  let departmentCount = 0;
  let databaseAvailable = true;

  try {
    const rows = (await sql`
      SELECT
        (
          SELECT COUNT(*)
          FROM employees
          WHERE status = 'active'
        ) AS employee_count,

        (
          SELECT COUNT(*)
          FROM departments
          WHERE status = 'active'
        ) AS department_count
    `) as DashboardTotals[];

    employeeCount = Number(rows[0]?.employee_count ?? 0);
    departmentCount = Number(
      rows[0]?.department_count ?? 0,
    );
  } catch (error) {
    console.error("Dashboard database error:", error);
    databaseAvailable = false;
  }

  return (
    <div>
      <div>
        <h1 className="text-3xl font-black text-slate-900">
          Dashboard
        </h1>

        <p className="mt-2 text-slate-500">
          Welcome back, {user.fullName}.
        </p>
      </div>

      {!databaseAvailable && (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
          The system could not connect to the payroll database.
          Check your internet connection and refresh the page.
        </section>
      )}

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Active Employees
          </p>

          <p className="mt-3 text-4xl font-black text-slate-900">
            {employeeCount}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Departments
          </p>

          <p className="mt-3 text-4xl font-black text-slate-900">
            {departmentCount}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Current Payroll
          </p>

          <p className="mt-3 text-lg font-black text-amber-600">
            Not processed
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Your Role
          </p>

          <p className="mt-3 text-lg font-black text-blue-700">
            {user.role}
          </p>
        </article>
      </section>
    </div>
  );
}