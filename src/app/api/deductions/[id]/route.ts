import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown): number {
  const result = Number(value);

  return Number.isFinite(result) && result >= 0
    ? result
    : 0;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const user = await requireRole([
      "Administrator",
      "Human Resources",
      "Accounts Officer",
    ]);

    const { id } = await context.params;
    const body = await request.json();

    const amount = cleanNumber(body.amount);
    const percentage = cleanNumber(body.percentage);
    const remainingBalance = cleanNumber(
      body.remainingBalance,
    );
    const status = cleanText(body.status);

    if (
      !["active", "inactive", "completed"].includes(
        status,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid deduction status.",
        },
        { status: 400 },
      );
    }

    const oldRows = await sql`
      SELECT
        employee_deductions.*,
        deduction_types.calculation_type
      FROM employee_deductions
      INNER JOIN deduction_types
        ON deduction_types.id =
           employee_deductions.deduction_type_id
      WHERE employee_deductions.id = ${id}::uuid
      LIMIT 1
    `;

    if (oldRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee deduction not found.",
        },
        { status: 404 },
      );
    }

    const oldDeduction = oldRows[0];

    let finalStatus = status;
    let finalBalance = remainingBalance;

    if (
      oldDeduction.calculation_type === "balance" &&
      remainingBalance <= 0
    ) {
      finalBalance = 0;
      finalStatus = "completed";
    }

    const updatedRows = await sql`
      UPDATE employee_deductions
      SET
        amount = ${amount},
        percentage = ${percentage},
        remaining_balance = ${finalBalance},
        status = ${finalStatus}
      WHERE id = ${id}::uuid
      RETURNING *
    `;

    const deduction = updatedRows[0];

    await sql`
      INSERT INTO audit_logs (
        user_id,
        action,
        module_name,
        record_id,
        old_values,
        new_values
      )
      VALUES (
        ${user.userId}::uuid,
        'Updated employee deduction',
        'Employee Deductions',
        ${id},
        ${JSON.stringify(oldDeduction)}::jsonb,
        ${JSON.stringify(deduction)}::jsonb
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Employee deduction updated successfully.",
      deduction,
    });
  } catch (error) {
    console.error("Update deduction error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "The employee deduction could not be updated.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const user = await requireRole(["Administrator"]);
    const { id } = await context.params;

    const oldRows = await sql`
      SELECT *
      FROM employee_deductions
      WHERE id = ${id}::uuid
      LIMIT 1
    `;

    if (oldRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee deduction not found.",
        },
        { status: 404 },
      );
    }

    await sql`
      DELETE FROM employee_deductions
      WHERE id = ${id}::uuid
    `;

    await sql`
      INSERT INTO audit_logs (
        user_id,
        action,
        module_name,
        record_id,
        old_values
      )
      VALUES (
        ${user.userId}::uuid,
        'Deleted employee deduction',
        'Employee Deductions',
        ${id},
        ${JSON.stringify(oldRows[0])}::jsonb
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Employee deduction deleted successfully.",
    });
  } catch (error) {
    console.error("Delete deduction error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "The deduction could not be deleted. Deactivate it instead.",
      },
      { status: 500 },
    );
  }
}