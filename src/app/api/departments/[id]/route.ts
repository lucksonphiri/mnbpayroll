import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { requireRole } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const user = await requireRole([
      "Administrator",
      "Human Resources",
    ]);

    const { id } = await context.params;
    const body = await request.json();

    const name = cleanText(body.name);
    const code = cleanText(body.code).toUpperCase();
    const description = cleanText(body.description);
    const status = cleanText(body.status);

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Department name is required.",
        },
        { status: 400 },
      );
    }

    if (!["active", "inactive"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid department status.",
        },
        { status: 400 },
      );
    }

    const oldRows = await sql`
      SELECT *
      FROM departments
      WHERE id = ${id}
      LIMIT 1
    `;

    if (oldRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Department not found.",
        },
        { status: 404 },
      );
    }

    const duplicate = await sql`
      SELECT id
      FROM departments
      WHERE id <> ${id}
        AND (
          LOWER(name) = LOWER(${name})
          OR (
            ${code} <> ''
            AND UPPER(code) = UPPER(${code})
          )
        )
      LIMIT 1
    `;

    if (duplicate.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another department already uses this name or code.",
        },
        { status: 409 },
      );
    }

    const updatedRows = await sql`
      UPDATE departments
      SET
        name = ${name},
        code = ${code || null},
        description = ${description || null},
        status = ${status}
      WHERE id = ${id}
      RETURNING *
    `;

    const department = updatedRows[0];

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
        ${user.userId},
        'Updated department',
        'Departments',
        ${id},
        ${JSON.stringify(oldRows[0])}::jsonb,
        ${JSON.stringify(department)}::jsonb
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Department updated successfully.",
      department,
    });
  } catch (error) {
    console.error("Update department error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "The department could not be updated.",
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

    const employeeCountRows = await sql`
      SELECT COUNT(*)::int AS total
      FROM employees
      WHERE department_id = ${id}
    `;

    const employeeCount = Number(
      employeeCountRows[0]?.total ?? 0,
    );

    if (employeeCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This department cannot be deleted because employees are assigned to it. Deactivate it instead.",
        },
        { status: 409 },
      );
    }

    const oldRows = await sql`
      SELECT *
      FROM departments
      WHERE id = ${id}
      LIMIT 1
    `;

    if (oldRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Department not found.",
        },
        { status: 404 },
      );
    }

    await sql`
      DELETE FROM departments
      WHERE id = ${id}
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
        ${user.userId},
        'Deleted department',
        'Departments',
        ${id},
        ${JSON.stringify(oldRows[0])}::jsonb
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Department deleted successfully.",
    });
  } catch (error) {
    console.error("Delete department error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "The department could not be deleted. Remove its job positions first.",
      },
      { status: 500 },
    );
  }
}