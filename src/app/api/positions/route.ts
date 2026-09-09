import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { requireRole } from "@/lib/auth";

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanMoney(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : 0;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole([
      "Administrator",
      "HR Officer",
    ]);

    const body = await request.json();

    const departmentId = cleanText(body.departmentId);
    const title = cleanText(body.title);
    const code = cleanText(body.code).toUpperCase();
    const description = cleanText(body.description);
    const minimumSalary = cleanMoney(body.minimumSalary);
    const maximumSalary = cleanMoney(body.maximumSalary);

    if (!departmentId || !title) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Department and position title are required.",
        },
        { status: 400 },
      );
    }

    if (
      maximumSalary > 0 &&
      maximumSalary < minimumSalary
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Maximum salary cannot be lower than minimum salary.",
        },
        { status: 400 },
      );
    }

    const departmentRows = await sql`
      SELECT id
      FROM departments
      WHERE id = ${departmentId}
        AND status = 'active'
      LIMIT 1
    `;

    if (departmentRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Select a valid active department.",
        },
        { status: 400 },
      );
    }

    const duplicateRows = await sql`
      SELECT id
      FROM positions
      WHERE (
          department_id = ${departmentId}
          AND LOWER(title) = LOWER(${title})
        )
        OR (
          ${code} <> ''
          AND UPPER(code) = UPPER(${code})
        )
      LIMIT 1
    `;

    if (duplicateRows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This position title or code already exists.",
        },
        { status: 409 },
      );
    }

    const rows = await sql`
      INSERT INTO positions (
        department_id,
        title,
        code,
        description,
        minimum_salary,
        maximum_salary,
        status
      )
      VALUES (
        ${departmentId},
        ${title},
        ${code || null},
        ${description || null},
        ${minimumSalary},
        ${maximumSalary},
        'active'
      )
      RETURNING *
    `;

    const position = rows[0];

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
        'Created job position',
        'Positions',
        ${position.id},
        ${JSON.stringify(position)}::jsonb
      )
    `;

    return NextResponse.json(
      {
        success: true,
        message: "Job position created successfully.",
        position,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create position error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "The job position could not be created.",
      },
      { status: 500 },
    );
  }
}