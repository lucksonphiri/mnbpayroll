import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  cleanDate,
  cleanInteger,
  createPayrollPeriodName,
} from "@/lib/payroll";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole(["Administrator", "Salaries Officer"]);

    const periods = await sql`
      SELECT
        payroll_periods.id,
        payroll_periods.name,
        payroll_periods.payroll_month,
        payroll_periods.payroll_year,
        payroll_periods.start_date,
        payroll_periods.end_date,
        payroll_periods.payment_date,
        payroll_periods.status,
        payroll_periods.created_at,

        COUNT(DISTINCT payroll_runs.id)::int AS run_count,

        COALESCE(
          MAX(payroll_runs.total_employees),
          0
        )::int AS total_employees,

        COALESCE(
          MAX(payroll_runs.total_gross_salary),
          0
        ) AS total_gross_salary,

        COALESCE(
          MAX(payroll_runs.total_deductions),
          0
        ) AS total_deductions,

        COALESCE(
          MAX(payroll_runs.total_net_salary),
          0
        ) AS total_net_salary

      FROM payroll_periods

      LEFT JOIN payroll_runs
        ON payroll_runs.payroll_period_id =
           payroll_periods.id

      GROUP BY payroll_periods.id

      ORDER BY
        payroll_periods.payroll_year DESC,
        payroll_periods.payroll_month DESC
    `;

    return NextResponse.json({
      success: true,
      periods,
    });
  } catch (error) {
    console.error("Get payroll periods error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load payroll periods.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole([
      "Administrator",
      "Salaries Officer",
    ]);

    const body = await request.json();

    const month = cleanInteger(body.month);
    const year = cleanInteger(body.year);
    const startDate = cleanDate(body.startDate);
    const endDate = cleanDate(body.endDate);
    const paymentDate = cleanDate(body.paymentDate);

    if (month < 1 || month > 12) {
      return NextResponse.json(
        {
          success: false,
          message: "Select a valid payroll month.",
        },
        { status: 400 },
      );
    }

    if (year < 2000 || year > 2200) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid payroll year.",
        },
        { status: 400 },
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payroll start date and end date are required.",
        },
        { status: 400 },
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payroll end date cannot be before the start date.",
        },
        { status: 400 },
      );
    }

    const existing = await sql`
      SELECT id
      FROM payroll_periods
      WHERE payroll_month = ${month}
        AND payroll_year = ${year}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A payroll period already exists for this month and year.",
        },
        { status: 409 },
      );
    }

    const name = createPayrollPeriodName(month, year);

    const rows = await sql`
      INSERT INTO payroll_periods (
        name,
        payroll_month,
        payroll_year,
        start_date,
        end_date,
        payment_date,
        status,
        created_by
      )
      VALUES (
        ${name},
        ${month},
        ${year},
        ${startDate}::date,
        ${endDate}::date,
        ${paymentDate}::date,
        'open',
        ${user.userId}::uuid
      )
      RETURNING *
    `;

    const period = rows[0];

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
        'Created payroll period',
        'Payroll',
        ${period.id},
        ${JSON.stringify(period)}::jsonb
      )
    `;

    return NextResponse.json(
      {
        success: true,
        message: `${name} payroll period created successfully.`,
        period,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create payroll period error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "The payroll period could not be created.",
      },
      { status: 500 },
    );
  }
}