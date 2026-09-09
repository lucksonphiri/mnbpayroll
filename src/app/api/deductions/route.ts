import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown): number {
  const result = Number(value);

  return Number.isFinite(result) && result >= 0
    ? result
    : -1;
}

function cleanDate(value: unknown): string | null {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  const date = new Date(`${text}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : text;
}

export async function GET() {
  try {
    await requireRole(["Administrator", "Salaries Officer"]);

    const deductions = await sql`
      SELECT
        employee_deductions.id,
        employee_deductions.employee_id,
        employee_deductions.deduction_type_id,
        employee_deductions.amount,
        employee_deductions.percentage,
        employee_deductions.original_balance,
        employee_deductions.remaining_balance,
        employee_deductions.effective_from,
        employee_deductions.effective_to,
        employee_deductions.status,

        employees.employee_number,
        employees.first_name,
        employees.surname,

        deduction_types.name AS deduction_name,
        deduction_types.code AS deduction_code,
        deduction_types.calculation_type,
        deduction_types.statutory,
        deduction_types.pre_tax,
        deduction_types.recurring

      FROM employee_deductions

      INNER JOIN employees
        ON employees.id = employee_deductions.employee_id

      INNER JOIN deduction_types
        ON deduction_types.id =
           employee_deductions.deduction_type_id

      ORDER BY
        employees.surname,
        employees.first_name,
        employee_deductions.effective_from DESC
    `;

    return NextResponse.json({
      success: true,
      deductions,
    });
  } catch (error) {
    console.error("Get deductions error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load employee deductions.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(["Administrator", "Salaries Officer"]);

    const body = await request.json();

    const employeeId = cleanText(body.employeeId);
    const deductionTypeId = cleanText(
      body.deductionTypeId,
    );

    const amount = cleanNumber(body.amount || 0);
    const percentage = cleanNumber(body.percentage || 0);
    const originalBalance = cleanNumber(
      body.originalBalance || 0,
    );

    const effectiveFrom = cleanDate(body.effectiveFrom);
    const effectiveTo = cleanDate(body.effectiveTo);

    if (!employeeId || !deductionTypeId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Select an employee and deduction type.",
        },
        { status: 400 },
      );
    }

    if (!effectiveFrom) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter the deduction start date.",
        },
        { status: 400 },
      );
    }

    if (effectiveTo && effectiveTo < effectiveFrom) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The deduction end date cannot be before the start date.",
        },
        { status: 400 },
      );
    }

    const results = await sql.transaction([
      sql`
        SELECT
          id,
          first_name,
          surname,
          status
        FROM employees
        WHERE id = ${employeeId}::uuid
        LIMIT 1
      `,

      sql`
        SELECT
          id,
          name,
          code,
          calculation_type,
          recurring,
          status
        FROM deduction_types
        WHERE id = ${deductionTypeId}::uuid
        LIMIT 1
      `,
    ]);

    const employee = results[0][0];
    const deductionType = results[1][0];

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected employee was not found.",
        },
        { status: 404 },
      );
    }

    if (employee.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Deductions can only be assigned to active employees.",
        },
        { status: 400 },
      );
    }

    if (!deductionType || deductionType.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          message:
            "The selected deduction type is unavailable.",
        },
        { status: 400 },
      );
    }

    const calculationType = String(
      deductionType.calculation_type,
    );

    if (calculationType === "fixed" && amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter a deduction amount greater than zero.",
        },
        { status: 400 },
      );
    }

    if (
      calculationType === "percentage" &&
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
      calculationType === "balance" &&
      (originalBalance <= 0 || amount <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter the total balance and monthly repayment amount.",
        },
        { status: 400 },
      );
    }

    if (
      calculationType === "balance" &&
      amount > originalBalance
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The monthly repayment cannot exceed the total balance.",
        },
        { status: 400 },
      );
    }

    const overlapping = await sql`
      SELECT id
      FROM employee_deductions
      WHERE employee_id = ${employeeId}::uuid
        AND deduction_type_id = ${deductionTypeId}::uuid
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

    if (overlapping.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This employee already has this deduction for the selected period.",
        },
        { status: 409 },
      );
    }

    const rows = await sql`
      INSERT INTO employee_deductions (
        employee_id,
        deduction_type_id,
        amount,
        percentage,
        original_balance,
        remaining_balance,
        effective_from,
        effective_to,
        status,
        created_by
      )
      VALUES (
        ${employeeId}::uuid,
        ${deductionTypeId}::uuid,
        ${Math.max(amount, 0)},
        ${Math.max(percentage, 0)},
        ${Math.max(originalBalance, 0)},
        ${Math.max(originalBalance, 0)},
        ${effectiveFrom}::date,
        ${effectiveTo}::date,
        'active',
        ${user.userId}::uuid
      )
      RETURNING *
    `;

    const deduction = rows[0];

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
        'Assigned employee deduction',
        'Employee Deductions',
        ${deduction.id},
        ${JSON.stringify(deduction)}::jsonb
      )
    `;

    return NextResponse.json(
      {
        success: true,
        message: `${String(
          deductionType.name,
        )} assigned successfully to ${String(
          employee.first_name,
        )} ${String(employee.surname)}.`,
        deduction,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Assign deduction error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "The employee deduction could not be assigned.",
      },
      { status: 500 },
    );
  }
}