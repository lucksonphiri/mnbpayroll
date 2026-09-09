import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const user = await requireRole(["Administrator", "Salaries Officer"]);
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Payroll run ID is required.",
        },
        { status: 400 },
      );
    }

    const runRows = await sql`
      SELECT
        payroll_runs.id,
        payroll_runs.payroll_period_id,
        payroll_runs.status,
        payroll_runs.total_employees,
        payroll_runs.total_gross_salary,
        payroll_runs.total_deductions,
        payroll_runs.total_net_salary,
        payroll_periods.name AS period_name,
        payroll_periods.status AS period_status
      FROM payroll_runs
      INNER JOIN payroll_periods
        ON payroll_periods.id =
           payroll_runs.payroll_period_id
      WHERE payroll_runs.id = ${id}::uuid
      LIMIT 1
    `;

    if (runRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Payroll run was not found.",
        },
        { status: 404 },
      );
    }

    const payrollRun = runRows[0];

    if (payrollRun.status === "approved") {
      return NextResponse.json(
        {
          success: false,
          message: "This payroll has already been approved.",
        },
        { status: 409 },
      );
    }

    if (payrollRun.status !== "completed") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only a completed payroll run can be approved.",
        },
        { status: 409 },
      );
    }

    const employeeCountRows = await sql`
      SELECT COUNT(*)::int AS total
      FROM employee_payrolls
      WHERE payroll_run_id = ${id}::uuid
    `;

    const actualEmployeeCount = Number(
      employeeCountRows[0]?.total ?? 0,
    );

    if (actualEmployeeCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This payroll has no employee payroll records.",
        },
        { status: 409 },
      );
    }

    if (
      actualEmployeeCount !==
      Number(payrollRun.total_employees)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The payroll employee count does not match the payroll summary.",
        },
        { status: 409 },
      );
    }

    const result = await sql.transaction([
      sql`
        UPDATE payroll_runs
        SET
          status = 'approved',
          approved_by = ${user.userId}::uuid,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}::uuid
          AND status = 'completed'
        RETURNING *
      `,

      sql`
        UPDATE payroll_periods
        SET
          status = 'approved',
          approved_by = ${user.userId}::uuid,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${String(
          payrollRun.payroll_period_id,
        )}::uuid
        RETURNING *
      `,
    ]);

    const approvedRun = result[0][0];

    if (!approvedRun) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payroll approval failed because its status changed.",
        },
        { status: 409 },
      );
    }

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
        'Approved payroll',
        'Payroll Approval',
        ${id},
        ${JSON.stringify({
          status: payrollRun.status,
        })}::jsonb,
        ${JSON.stringify({
          status: "approved",
          periodName: payrollRun.period_name,
          totalEmployees:
            payrollRun.total_employees,
          totalGrossSalary:
            payrollRun.total_gross_salary,
          totalDeductions:
            payrollRun.total_deductions,
          totalNetSalary:
            payrollRun.total_net_salary,
        })}::jsonb
      )
    `;

    return NextResponse.json({
      success: true,
      message: `${String(
        payrollRun.period_name,
      )} payroll approved successfully.`,
    });
  } catch (error) {
    console.error("Payroll approval error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "The payroll could not be approved.",
      },
      { status: 500 },
    );
  }
}