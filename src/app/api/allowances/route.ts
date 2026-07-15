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
  const valueText = cleanText(value);

  if (!valueText) {
    return null;
  }

  const date = new Date(`${valueText}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return valueText;
}

export async function GET() {
  try {
    await requireRole([
      "Administrator",
      "Human Resources",
      "Accounts Officer",
    ]);

    const allowances = await sql`
      SELECT
        employee_allowances.id,
        employee_allowances.employee_id,
        employee_allowances.allowance_type_id,
        employee_allowances.amount,
        employee_allowances.percentage,
        employee_allowances.effective_from,
        employee_allowances.effective_to,
        employee_allowances.status,
        employee_allowances.created_at,

        employees.employee_number,
        employees.first_name,
        employees.surname,

        allowance_types.name AS allowance_name,
        allowance_types.code AS allowance_code,
        allowance_types.calculation_type,
        allowance_types.taxable,
        allowance_types.recurring,

        departments.name AS department_name,
        positions.title AS position_title

      FROM employee_allowances

      INNER JOIN employees
        ON employees.id = employee_allowances.employee_id

      INNER JOIN allowance_types
        ON allowance_types.id =
           employee_allowances.allowance_type_id

      LEFT JOIN departments
        ON departments.id = employees.department_id

      LEFT JOIN positions
        ON positions.id = employees.position_id

      ORDER BY
        employees.surname,
        employees.first_name,
        employee_allowances.effective_from DESC
    `;

    return NextResponse.json({
      success: true,
      allowances,
    });
  } catch (error) {
    console.error("Get allowances error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load employee allowances.",
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
    const allowanceTypeId = cleanText(
      body.allowanceTypeId,
    );

    const amount = cleanAmount(body.amount || 0);
    const percentage = cleanAmount(body.percentage || 0);

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

    if (!allowanceTypeId) {
      return NextResponse.json(
        {
          success: false,
          message: "Select an allowance type.",
        },
        { status: 400 },
      );
    }

    if (!effectiveFrom) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter the effective start date.",
        },
        { status: 400 },
      );
    }

    if (effectiveTo && effectiveTo < effectiveFrom) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The allowance end date cannot be before its start date.",
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
            "Allowances can only be assigned to active employees.",
        },
        { status: 400 },
      );
    }

    const allowanceTypeRows = await sql`
      SELECT
        id,
        name,
        calculation_type,
        recurring,
        status
      FROM allowance_types
      WHERE id = ${allowanceTypeId}::uuid
      LIMIT 1
    `;

    if (allowanceTypeRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "The allowance type was not found.",
        },
        { status: 404 },
      );
    }

    const allowanceType = allowanceTypeRows[0];

    if (allowanceType.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          message:
            "The selected allowance type is inactive.",
        },
        { status: 400 },
      );
    }

    if (
      allowanceType.calculation_type === "fixed" &&
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter an allowance amount greater than zero.",
        },
        { status: 400 },
      );
    }

    if (
      allowanceType.calculation_type === "percentage" &&
      (percentage <= 0 || percentage > 100)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter a percentage greater than zero and not above 100.",
        },
        { status: 400 },
      );
    }

    if (
      ["hours", "days"].includes(
        String(allowanceType.calculation_type),
      ) &&
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter the rate or total allowance amount.",
        },
        { status: 400 },
      );
    }

    const overlappingRows = await sql`
      SELECT id
      FROM employee_allowances
      WHERE employee_id = ${employeeId}::uuid
        AND allowance_type_id = ${allowanceTypeId}::uuid
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
            "This employee already has the selected allowance for the same period.",
        },
        { status: 409 },
      );
    }

    const rows = await sql`
      INSERT INTO employee_allowances (
        employee_id,
        allowance_type_id,
        amount,
        percentage,
        effective_from,
        effective_to,
        status,
        created_by
      )
      VALUES (
        ${employeeId}::uuid,
        ${allowanceTypeId}::uuid,
        ${amount < 0 ? 0 : amount},
        ${percentage < 0 ? 0 : percentage},
        ${effectiveFrom}::date,
        ${effectiveTo}::date,
        'active',
        ${user.userId}::uuid
      )
      RETURNING *
    `;

    const allowance = rows[0];

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
        'Assigned employee allowance',
        'Employee Allowances',
        ${allowance.id},
        ${JSON.stringify(allowance)}::jsonb
      )
    `;

    return NextResponse.json(
      {
        success: true,
        message: `${String(
          allowanceType.name,
        )} assigned successfully to ${String(
          employee.first_name,
        )} ${String(employee.surname)}.`,
        allowance,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Assign allowance error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "The employee allowance could not be assigned.",
      },
      { status: 500 },
    );
  }
}