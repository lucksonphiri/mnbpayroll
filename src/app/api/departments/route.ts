import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { requireRole } from "@/lib/auth";

type DepartmentRow = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  created_at: string;
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    await requireRole(["Administrator", "HR Officer"]);

    const departments = (await sql`
      SELECT
        departments.id,
        departments.name,
        departments.code,
        departments.description,
        departments.status,
        departments.created_at,
        COUNT(positions.id)::int AS position_count,
        COUNT(DISTINCT employees.id)::int AS employee_count
      FROM departments
      LEFT JOIN positions
        ON positions.department_id = departments.id
      LEFT JOIN employees
        ON employees.department_id = departments.id
      GROUP BY departments.id
      ORDER BY departments.name ASC
    `) as DepartmentRow[];

    return NextResponse.json({
      success: true,
      departments,
    });
  } catch (error) {
    console.error("Get departments error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load departments.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole([
      "Administrator",
      "HR Officer",
    ]);

    const body = await request.json();

    const name = cleanText(body.name);
    const code = cleanText(body.code).toUpperCase();
    const description = cleanText(body.description);

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Department name is required.",
        },
        { status: 400 },
      );
    }

    const existing = await sql`
      SELECT id
      FROM departments
      WHERE LOWER(name) = LOWER(${name})
         OR (
           ${code} <> ''
           AND UPPER(code) = UPPER(${code})
         )
      LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A department with this name or code already exists.",
        },
        { status: 409 },
      );
    }

    const rows = await sql`
      INSERT INTO departments (
        name,
        code,
        description,
        status
      )
      VALUES (
        ${name},
        ${code || null},
        ${description || null},
        'active'
      )
      RETURNING
        id,
        name,
        code,
        description,
        status,
        created_at
    `;

    const department = rows[0];

    await sql`
      INSERT INTO audit_logs (
        user_id,
        action,
        module_name,
        record_id,
        new_values
      )
      VALUES (
        ${user.userId},
        'Created department',
        'Departments',
        ${department.id},
        ${JSON.stringify(department)}::jsonb
      )
    `;

    return NextResponse.json(
      {
        success: true,
        message: "Department created successfully.",
        department,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create department error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "The department could not be created.",
      },
      { status: 500 },
    );
  }
}