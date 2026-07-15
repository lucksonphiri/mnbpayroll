import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole([
      "Administrator",
      "Accounts Officer",
    ]);

    const body = await request.json();
    const payrollRunId = cleanText(body.payrollRunId);

    if (!payrollRunId) {
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
        payroll_runs.status,
        payroll_periods.name AS period_name,
        payroll_periods.payroll_month,
        payroll_periods.payroll_year
      FROM payroll_runs
      INNER JOIN payroll_periods
        ON payroll_periods.id =
           payroll_runs.payroll_period_id
      WHERE payroll_runs.id = ${payrollRunId}::uuid
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

    if (payrollRun.status !== "approved") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payslips can only be generated from an approved payroll.",
        },
        { status: 409 },
      );
    }

    const employeePayrollRows = await sql`
      SELECT
        id,
        employee_number
      FROM employee_payrolls
      WHERE payroll_run_id = ${payrollRunId}::uuid
      ORDER BY employee_number
    `;

    if (employeePayrollRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No employee payroll records were found.",
        },
        { status: 404 },
      );
    }

    let createdCount = 0;
    let existingCount = 0;

    for (const employeePayroll of employeePayrollRows) {
      const existingRows = await sql`
        SELECT id
        FROM payslips
        WHERE employee_payroll_id =
              ${String(employeePayroll.id)}::uuid
        LIMIT 1
      `;

      if (existingRows.length > 0) {
        existingCount += 1;
        continue;
      }

      const payslipNumber = [
        "PS",
        String(payrollRun.payroll_year),
        String(payrollRun.payroll_month).padStart(2, "0"),
        String(employeePayroll.employee_number),
      ].join("-");

      await sql`
        INSERT INTO payslips (
          employee_payroll_id,
          payslip_number,
          generated_by,
          generated_at
        )
        VALUES (
          ${String(employeePayroll.id)}::uuid,
          ${payslipNumber},
          ${user.userId}::uuid,
          CURRENT_TIMESTAMP
        )
      `;

      createdCount += 1;
    }

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
        'Generated payslips',
        'Payslips',
        ${payrollRunId},
        ${JSON.stringify({
          periodName: payrollRun.period_name,
          createdCount,
          existingCount,
        })}::jsonb
      )
    `;

    return NextResponse.json({
      success: true,
      message:
        createdCount > 0
          ? `${createdCount} payslip(s) generated successfully.`
          : "All payslips for this payroll had already been generated.",
      createdCount,
      existingCount,
    });
  } catch (error) {
    console.error("Generate payslips error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Payslips could not be generated.",
      },
      { status: 500 },
    );
  }
}