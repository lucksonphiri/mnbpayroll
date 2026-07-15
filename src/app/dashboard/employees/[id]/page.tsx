import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

function displayValue(
  value: string | null | undefined,
): string {
  return value || "Not provided";
}

export default async function EmployeeProfilePage({
  params,
}: PageProps) {
  const user = await requireRole([
    "Administrator",
    "Human Resources",
    "Accounts Officer",
  ]);

  const { id } = await params;

  const rows = await sql`
    SELECT
      employees.*,
      departments.name AS department_name,
      positions.title AS position_title,
      CONCAT(
        supervisors.first_name,
        ' ',
        supervisors.surname
      ) AS supervisor_name,
      supervisors.employee_number
        AS supervisor_employee_number
    FROM employees
    LEFT JOIN departments
      ON departments.id = employees.department_id
    LEFT JOIN positions
      ON positions.id = employees.position_id
    LEFT JOIN employees AS supervisors
      ON supervisors.id = employees.supervisor_id
    WHERE employees.id = ${id}
    LIMIT 1
  `;

  if (rows.length === 0) {
    notFound();
  }

  const employee = rows[0];

  const salaryRows = await sql`
    SELECT
      basic_salary,
      currency,
      payment_frequency,
      effective_from
    FROM employee_salaries
    WHERE employee_id = ${id}
      AND status = 'active'
    ORDER BY effective_from DESC
    LIMIT 1
  `;

  const salary = salaryRows[0] ?? null;

  const canEdit =
    user.role === "Administrator" ||
    user.role === "Human Resources";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-bold text-blue-700">
            {String(employee.employee_number)}
          </p>

          <h1 className="mt-1 text-3xl font-black text-slate-900">
            {employee.title
              ? `${String(employee.title)} `
              : ""}
            {String(employee.first_name)}{" "}
            {String(employee.surname)}
          </h1>

          <p className="mt-2 text-slate-500">
            {displayValue(
              employee.position_title
                ? String(employee.position_title)
                : null,
            )}
            {" · "}
            {displayValue(
              employee.department_name
                ? String(employee.department_name)
                : null,
            )}
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/dashboard/employees"
            className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700"
          >
            Back
          </Link>

          {canEdit && (
            <Link
              href={`/dashboard/employees/${id}/edit`}
              className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white"
            >
              Edit Employee
            </Link>
          )}
        </div>
      </div>

      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Status
          </p>
          <p className="mt-2 text-xl font-black capitalize">
            {String(employee.status)}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Employment Type
          </p>
          <p className="mt-2 text-xl font-black capitalize">
            {String(employee.employment_type)}
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Current Basic Salary
          </p>

          <p className="mt-2 text-xl font-black">
            {salary
              ? `${String(salary.currency)} ${Number(
                  salary.basic_salary,
                ).toFixed(2)}`
              : "Not assigned"}
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">
            Personal Information
          </h2>

          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">
                National ID
              </dt>
              <dd className="mt-1 font-semibold">
                {displayValue(
                  employee.national_id
                    ? String(employee.national_id)
                    : null,
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Date of Birth
              </dt>
              <dd className="mt-1 font-semibold">
                {displayValue(
                  employee.date_of_birth
                    ? String(employee.date_of_birth)
                    : null,
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Gender
              </dt>
              <dd className="mt-1 font-semibold">
                {displayValue(
                  employee.gender
                    ? String(employee.gender)
                    : null,
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Employment Date
              </dt>
              <dd className="mt-1 font-semibold">
                {String(employee.employment_date)}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">
            Contact Information
          </h2>

          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">
                Email
              </dt>
              <dd className="mt-1 font-semibold">
                {displayValue(
                  employee.email
                    ? String(employee.email)
                    : null,
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Phone
              </dt>
              <dd className="mt-1 font-semibold">
                {displayValue(
                  employee.phone_number
                    ? String(employee.phone_number)
                    : null,
                )}
              </dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-sm text-slate-500">
                Residential Address
              </dt>
              <dd className="mt-1 font-semibold">
                {displayValue(
                  employee.residential_address
                    ? String(
                        employee.residential_address,
                      )
                    : null,
                )}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">
            Statutory Information
          </h2>

          <dl className="mt-5 grid gap-5 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-500">
                Tax Number
              </dt>
              <dd className="mt-1 font-semibold">
                {displayValue(
                  employee.tax_number
                    ? String(employee.tax_number)
                    : null,
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                NSSA Number
              </dt>
              <dd className="mt-1 font-semibold">
                {displayValue(
                  employee.nssa_number
                    ? String(employee.nssa_number)
                    : null,
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Pension Number
              </dt>
              <dd className="mt-1 font-semibold">
                {displayValue(
                  employee.pension_number
                    ? String(employee.pension_number)
                    : null,
                )}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">
            Banking Information
          </h2>

          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">
                Payment Method
              </dt>
              <dd className="mt-1 font-semibold capitalize">
                {String(employee.payment_method)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Bank
              </dt>
              <dd className="mt-1 font-semibold">
                {displayValue(
                  employee.bank_name
                    ? String(employee.bank_name)
                    : null,
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Account Name
              </dt>
              <dd className="mt-1 font-semibold">
                {displayValue(
                  employee.bank_account_name
                    ? String(
                        employee.bank_account_name,
                      )
                    : null,
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Account Number
              </dt>
              <dd className="mt-1 font-semibold">
                {displayValue(
                  employee.bank_account_number
                    ? String(
                        employee.bank_account_number,
                      )
                    : null,
                )}
              </dd>
            </div>
          </dl>
        </article>
      </section>
    </div>
  );
}