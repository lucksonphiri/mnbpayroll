import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { hasEditAccess } from "@/lib/permissions";
import { sql } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanAmount(value: unknown): number {
  const amount = Number(value);

  return Number.isFinite(amount) && amount >= 0
    ? amount
    : 0;
}

function cleanDate(value: unknown): string | null {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  const date = new Date(`${text}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : text;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const user = await requireRole(["Administrator", "Salaries Officer"]);

    const { id } = await context.params;
    if (!(await hasEditAccess(user, "Employee Allowances", id))) {
      return NextResponse.json({success:false,message:"Editing is locked. Request temporary edit access from the Administrator."},{status:403});
    }
    const body = await request.json();

    const amount = cleanAmount(body.amount);
    const percentage = cleanAmount(body.percentage);
    const effectiveFrom = cleanDate(body.effectiveFrom);
    const effectiveTo = cleanDate(body.effectiveTo);
    const status = cleanText(body.status);

    if (!effectiveFrom) {
      return NextResponse.json(
        {
          success: false,
          message: "Effective start date is required.",
        },
        { status: 400 },
      );
    }

    if (effectiveTo && effectiveTo < effectiveFrom) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Effective end date cannot be before the start date.",
        },
        { status: 400 },
      );
    }

    if (!["active", "inactive"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid allowance status.",
        },
        { status: 400 },
      );
    }

    const oldRows = await sql`
      SELECT
        employee_allowances.*,
        allowance_types.calculation_type
      FROM employee_allowances
      INNER JOIN allowance_types
        ON allowance_types.id =
           employee_allowances.allowance_type_id
      WHERE employee_allowances.id = ${id}::uuid
      LIMIT 1
    `;

    if (oldRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee allowance not found.",
        },
        { status: 404 },
      );
    }

    const oldAllowance = oldRows[0];

    if (
      oldAllowance.calculation_type === "fixed" &&
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
      oldAllowance.calculation_type === "percentage" &&
      (percentage <= 0 || percentage > 100)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Percentage must be greater than zero and not above 100.",
        },
        { status: 400 },
      );
    }

    const updatedRows = await sql`
      UPDATE employee_allowances
      SET
        amount = ${amount},
        percentage = ${percentage},
        effective_from = ${effectiveFrom}::date,
        effective_to = ${effectiveTo}::date,
        status = ${status}
      WHERE id = ${id}::uuid
      RETURNING *
    `;

    const allowance = updatedRows[0];

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
        'Updated employee allowance',
        'Employee Allowances',
        ${id},
        ${JSON.stringify(oldAllowance)}::jsonb,
        ${JSON.stringify(allowance)}::jsonb
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Employee allowance updated successfully.",
      allowance,
    });
  } catch (error) {
    console.error("Update allowance error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "The employee allowance could not be updated.",
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
      FROM employee_allowances
      WHERE id = ${id}::uuid
      LIMIT 1
    `;

    if (oldRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee allowance not found.",
        },
        { status: 404 },
      );
    }

    const payrollItemRows = await sql`
      SELECT payroll_items.id
      FROM payroll_items
      INNER JOIN employee_payrolls
        ON employee_payrolls.id =
           payroll_items.employee_payroll_id
      WHERE payroll_items.item_type = 'allowance'
        AND payroll_items.description =
            ${`employee_allowance:${id}`}
      LIMIT 1
    `;

    if (payrollItemRows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This allowance has already been processed in payroll. Deactivate it instead of deleting it.",
        },
        { status: 409 },
      );
    }

    await sql`
      DELETE FROM employee_allowances
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
        'Deleted employee allowance',
        'Employee Allowances',
        ${id},
        ${JSON.stringify(oldRows[0])}::jsonb
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Employee allowance deleted successfully.",
    });
  } catch (error) {
    console.error("Delete allowance error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "The employee allowance could not be deleted.",
      },
      { status: 500 },
    );
  }
}