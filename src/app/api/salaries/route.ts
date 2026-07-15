import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanAmount(value: unknown): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return -1;
  }

  return amount;
}

function cleanDate(value: unknown): string | null {
  const date = cleanText(value);

  if (!date) {
    return null;
  }

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return date;
}

const PAYMENT_FREQUENCIES = [
  "monthly",
  "weekly",
  "daily",
  "hourly",
];

export async function GET() {
  try {
    await requireRole([
      "Administrator",
      "Human Resources",
      "Accounts Officer",
    ]);

    const salaries = await sql`
      SELECT
        employee_salaries.id,
        employee_salaries.employee_id,
        employee_salaries.basic_salary,
        employee_salaries.currency,
        employee_salaries.payment_frequency,
        employee_salaries.hourly_rate,
        employee_salaries.daily_rate,
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
        ON employees.id = employee_salaries.employee_id

      LEFT JOIN departments
        ON departments.id = employees.department_id

      LEFT JOIN positions
        ON positions.id = employees.position_id

      ORDER BY
        employees.surname,
        employees.first_name,
        employee_salaries.effective_from DESC
    `;

    return NextResponse.json({
      success: true,
      salaries,
    });
  } catch (error) {
    console.error("Get salaries error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load employee salaries.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole([
      "Administrator",
      "Human Resources",
    ]);

    const body = await request.json();

    const employeeId = cleanText(body.employeeId);
    const basicSalary = cleanAmount(body.basicSalary);
    const currency = cleanText(body.currency).toUpperCase();
    const paymentFrequency = cleanText(
      body.paymentFrequency,
    ).toLowerCase();

    const hourlyRate = cleanAmount(body.hourlyRate || 0);
    const dailyRate = cleanAmount(body.dailyRate || 0);

    const effectiveFrom = cleanDate(body.effectiveFrom);
    const effectiveTo = cleanDate(body.effectiveTo);

    if (!employeeId) {
      return NextResponse.json(
        {
          success: false,
          message: "Select an employee.",
        },
        { status: 400 },
      );
    }

    if (basicSalary < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid basic salary.",
        },
        { status: 400 },
      );
    }

    if (!currency) {
      return NextResponse.json(
        {
          success: false,
          message: "Select a currency.",
        },
        { status: 400 },
      );
    }

    if (!PAYMENT_FREQUENCIES.includes(paymentFrequency)) {
      return NextResponse.json(
        {
          success: false,
          message: "Select a valid payment frequency.",
        },
        { status: 400 },
      );
    }

    if (!effectiveFrom) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter the salary effective date.",
        },
        { status: 400 },
      );
    }

    if (effectiveTo && effectiveTo < effectiveFrom) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The salary end date cannot be before its start date.",
        },
        { status: 400 },
      );
    }

    const employeeRows = await sql`
      SELECT
        id,
        employee_number,
        first_name,
        surname,
        status
      FROM employees
      WHERE id = ${employeeId}::uuid
      LIMIT 1
    `;

    if (employeeRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected employee was not found.",
        },
        { status: 404 },
      );
    }

    const employee = employeeRows[0];

    if (employee.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          message:
            "A salary can only be assigned to an active employee.",
        },
        { status: 400 },
      );
    }

    const overlappingRows = await sql`
      SELECT id
      FROM employee_salaries
      WHERE employee_id = ${employeeId}::uuid
        AND status = 'active'
        AND daterange(
          effective_from,
          COALESCE(effective_to, 'infinity'::date),
          '[]'
        ) &&
        daterange(
          ${effectiveFrom}::date,
          COALESCE(${effectiveTo}::date, 'infinity'::date),
          '[]'
        )
      LIMIT 1
    `;

    if (overlappingRows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This employee already has an active salary covering the selected period.",
        },
        { status: 409 },
      );
    }

    const salaryRows = await sql`
      INSERT INTO employee_salaries (
        employee_id,
        basic_salary,
        currency,
        payment_frequency,
        hourly_rate,
        daily_rate,
        effective_from,
        effective_to,
        status,
        approved_by
      )
      VALUES (
        ${employeeId}::uuid,
        ${basicSalary},
        ${currency},
        ${paymentFrequency},
        ${hourlyRate},
        ${dailyRate},
        ${effectiveFrom}::date,
        ${effectiveTo}::date,
        'active',
        ${user.userId}::uuid
      )
      RETURNING *
    `;

    const salary = salaryRows[0];

    await sql`
      INSERT INTO audit_logs (
        user_id,
        action,
        module_name,
        record_id,
        new_values
      )
      VALUES (
        ${user.userId}::uuid,
        'Assigned employee salary',
        'Salary Management',
        ${salary.id},
        ${JSON.stringify(salary)}::jsonb
      )
    `;

    return NextResponse.json(
      {
        success: true,
        message: `Salary assigned successfully to ${employee.first_name} ${employee.surname}.`,
        salary,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Assign salary error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "The employee salary could not be assigned.",
      },
      { status: 500 },
    );
  }
}