import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  calculatePercentage,
  cleanText,
  money,
} from "@/lib/payroll";

type PayrollPeriodRow = {
  id: string;
  name: string;
  payroll_month: number;
  payroll_year: number;
  start_date: Date | string;
  end_date: Date | string;
  payment_date: Date | string | null;
  status: string;
};

type EmployeeRow = {
  id: string;
  employee_number: string;
  first_name: string;
  middle_name: string | null;
  surname: string;
  department_name: string | null;
  position_name: string | null;
  basic_salary: string | number;
  currency: string;
};

type AllowanceRow = {
  id: string;
  employee_id: string;
  name: string;
  code: string;
  calculation_type: string;
  taxable: boolean;
  amount: string | number;
  percentage: string | number;
};

type DeductionRow = {
  id: string;
  employee_id: string;
  name: string;
  code: string;
  calculation_type: string;
  statutory: boolean;
  pre_tax: boolean;
  amount: string | number;
  percentage: string | number;
  remaining_balance: string | number;
};

type PayrollAllowanceItem = {
  id: string;
  code: string;
  name: string;
  amount: number;
  taxable: boolean;
};

type PayrollDeductionItem = {
  id: string;
  code: string;
  name: string;
  amount: number;
  statutory: boolean;
  calculationType: string;
};

function toDatabaseDate(
  value: Date | string | null | undefined,
): string {
  if (!value) {
    throw new Error("A required payroll date is missing.");
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid payroll date: ${text}`);
  }

  return parsed.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole([
      "Administrator",
      "Accounts Officer",
    ]);

    const body = await request.json();

    const payrollPeriodId = cleanText(
      body.payrollPeriodId,
    );

    if (!payrollPeriodId) {
      return NextResponse.json(
        {
          success: false,
          message: "Select a payroll period.",
        },
        { status: 400 },
      );
    }

    const periodRows = (await sql`
      SELECT
        id,
        name,
        payroll_month,
        payroll_year,
        start_date,
        end_date,
        payment_date,
        status
      FROM payroll_periods
      WHERE id = ${payrollPeriodId}::uuid
      LIMIT 1
    `) as PayrollPeriodRow[];

    if (periodRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Payroll period not found.",
        },
        { status: 404 },
      );
    }

    const period = periodRows[0];

    if (period.status !== "open") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only an open payroll period can be processed.",
        },
        { status: 409 },
      );
    }

    const periodStartDate = toDatabaseDate(
      period.start_date,
    );

    const periodEndDate = toDatabaseDate(
      period.end_date,
    );

    const existingRuns = await sql`
      SELECT id
      FROM payroll_runs
      WHERE payroll_period_id =
            ${payrollPeriodId}::uuid
        AND status IN (
          'processing',
          'completed',
          'approved'
        )
      LIMIT 1
    `;

    if (existingRuns.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This payroll period has already been processed.",
        },
        { status: 409 },
      );
    }

    const resultSets = await sql.transaction([
      sql`
        SELECT
          employees.id,
          employees.employee_number,
          employees.first_name,
          employees.middle_name,
          employees.surname,

          departments.name AS department_name,
          positions.title AS position_name,

          employee_salaries.basic_salary,
          employee_salaries.currency

        FROM employees

        INNER JOIN employee_salaries
          ON employee_salaries.employee_id =
             employees.id

        LEFT JOIN departments
          ON departments.id =
             employees.department_id

        LEFT JOIN positions
          ON positions.id =
             employees.position_id

        WHERE employees.status = 'active'
          AND employee_salaries.status = 'active'

          AND employee_salaries.effective_from <=
              ${periodEndDate}::date

          AND (
            employee_salaries.effective_to IS NULL
            OR employee_salaries.effective_to >=
               ${periodStartDate}::date
          )

          AND employee_salaries.effective_from = (
            SELECT MAX(salary2.effective_from)
            FROM employee_salaries AS salary2
            WHERE salary2.employee_id = employees.id
              AND salary2.status = 'active'
              AND salary2.effective_from <=
                  ${periodEndDate}::date
              AND (
                salary2.effective_to IS NULL
                OR salary2.effective_to >=
                   ${periodStartDate}::date
              )
          )

        ORDER BY
          employees.surname,
          employees.first_name
      `,

      sql`
        SELECT
          employee_allowances.id,
          employee_allowances.employee_id,
          employee_allowances.amount,
          employee_allowances.percentage,

          allowance_types.name,
          allowance_types.code,
          allowance_types.calculation_type,
          allowance_types.taxable

        FROM employee_allowances

        INNER JOIN allowance_types
          ON allowance_types.id =
             employee_allowances.allowance_type_id

        WHERE employee_allowances.status = 'active'
          AND allowance_types.status = 'active'

          AND employee_allowances.effective_from <=
              ${periodEndDate}::date

          AND (
            employee_allowances.effective_to IS NULL
            OR employee_allowances.effective_to >=
               ${periodStartDate}::date
          )
      `,

      sql`
        SELECT
          employee_deductions.id,
          employee_deductions.employee_id,
          employee_deductions.amount,
          employee_deductions.percentage,
          employee_deductions.remaining_balance,

          deduction_types.name,
          deduction_types.code,
          deduction_types.calculation_type,
          deduction_types.statutory,
          deduction_types.pre_tax

        FROM employee_deductions

        INNER JOIN deduction_types
          ON deduction_types.id =
             employee_deductions.deduction_type_id

        WHERE employee_deductions.status = 'active'
          AND deduction_types.status = 'active'

          AND employee_deductions.effective_from <=
              ${periodEndDate}::date

          AND (
            employee_deductions.effective_to IS NULL
            OR employee_deductions.effective_to >=
               ${periodStartDate}::date
          )
      `,
    ]);

    const employees =
      resultSets[0] as EmployeeRow[];

    const allowances =
      resultSets[1] as AllowanceRow[];

    const deductions =
      resultSets[2] as DeductionRow[];

    if (employees.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No active employees with a valid salary were found for this payroll period.",
        },
        { status: 400 },
      );
    }

    const runNumberRows = await sql`
      SELECT
        COALESCE(MAX(run_number), 0) + 1
          AS next_run
      FROM payroll_runs
      WHERE payroll_period_id =
            ${payrollPeriodId}::uuid
    `;

    const runNumber = Number(
      runNumberRows[0]?.next_run ?? 1,
    );

    const runRows = await sql`
      INSERT INTO payroll_runs (
        payroll_period_id,
        run_number,
        status,
        processed_by,
        processed_at
      )
      VALUES (
        ${payrollPeriodId}::uuid,
        ${runNumber},
        'processing',
        ${user.userId}::uuid,
        CURRENT_TIMESTAMP
      )
      RETURNING id
    `;

    const payrollRunId = String(runRows[0].id);

    let totalBasicSalary = 0;
    let totalGrossSalary = 0;
    let totalDeductions = 0;
    let totalNetSalary = 0;

    const warnings: string[] = [];

    for (const employee of employees) {
      const basicSalary = money(
        employee.basic_salary,
      );

      const employeeAllowances = allowances.filter(
        (allowance) =>
          String(allowance.employee_id) ===
          String(employee.id),
      );

      const employeeDeductions = deductions.filter(
        (deduction) =>
          String(deduction.employee_id) ===
          String(employee.id),
      );

      let allowanceTotal = 0;
      let taxableAllowanceTotal = 0;
      let overtimeAmount = 0;
      let bonusAmount = 0;

      const allowanceItems: PayrollAllowanceItem[] =
        [];

      for (const allowance of employeeAllowances) {
        let calculatedAmount = 0;

        if (
          allowance.calculation_type === "percentage"
        ) {
          calculatedAmount = calculatePercentage(
            basicSalary,
            money(allowance.percentage),
          );
        } else {
          calculatedAmount = money(allowance.amount);
        }

        allowanceTotal = money(
          allowanceTotal + calculatedAmount,
        );

        if (allowance.taxable) {
          taxableAllowanceTotal = money(
            taxableAllowanceTotal +
              calculatedAmount,
          );
        }

        if (
          String(allowance.code).toUpperCase() ===
          "OVERTIME"
        ) {
          overtimeAmount = money(
            overtimeAmount + calculatedAmount,
          );
        }

        if (
          String(allowance.code).toUpperCase() ===
          "BONUS"
        ) {
          bonusAmount = money(
            bonusAmount + calculatedAmount,
          );
        }

        allowanceItems.push({
          id: String(allowance.id),
          code: String(allowance.code),
          name: String(allowance.name),
          amount: calculatedAmount,
          taxable: Boolean(allowance.taxable),
        });
      }

      const grossSalary = money(
        basicSalary + allowanceTotal,
      );

      const taxableIncome = money(
        basicSalary + taxableAllowanceTotal,
      );

      let statutoryDeductions = 0;
      let voluntaryDeductions = 0;
      let payeAmount = 0;

      const deductionItems: PayrollDeductionItem[] =
        [];

      for (const deduction of employeeDeductions) {
        let calculatedAmount = 0;

        if (
          deduction.calculation_type === "percentage"
        ) {
          calculatedAmount = calculatePercentage(
            grossSalary,
            money(deduction.percentage),
          );
        } else if (
          deduction.calculation_type === "balance"
        ) {
          calculatedAmount = Math.min(
            money(deduction.amount),
            money(deduction.remaining_balance),
          );
        } else if (
          deduction.calculation_type === "tax-band"
        ) {
          calculatedAmount = 0;

          warnings.push(
            `${employee.employee_number}: PAYE was not calculated because the tax-band module has not yet been configured.`,
          );
        } else {
          calculatedAmount = money(deduction.amount);
        }

        const deductionCode = String(
          deduction.code,
        ).toUpperCase();

        if (deductionCode === "PAYE") {
          payeAmount = money(
            payeAmount + calculatedAmount,
          );
        } else if (deduction.statutory) {
          statutoryDeductions = money(
            statutoryDeductions +
              calculatedAmount,
          );
        } else {
          voluntaryDeductions = money(
            voluntaryDeductions +
              calculatedAmount,
          );
        }

        deductionItems.push({
          id: String(deduction.id),
          code: deductionCode,
          name: String(deduction.name),
          amount: calculatedAmount,
          statutory: Boolean(deduction.statutory),
          calculationType: String(
            deduction.calculation_type,
          ),
        });
      }

      let employeeTotalDeductions = money(
        payeAmount +
          statutoryDeductions +
          voluntaryDeductions,
      );

      if (employeeTotalDeductions > grossSalary) {
        warnings.push(
          `${employee.employee_number}: deductions were limited to the employee's gross salary.`,
        );

        employeeTotalDeductions = grossSalary;
      }

      const netSalary = money(
        grossSalary - employeeTotalDeductions,
      );

      const fullName = [
        employee.first_name,
        employee.middle_name,
        employee.surname,
      ]
        .filter(Boolean)
        .join(" ");

      const payrollRows = await sql`
        INSERT INTO employee_payrolls (
          payroll_run_id,
          employee_id,
          employee_number,
          employee_name,
          department_name,
          position_name,
          currency,
          basic_salary,
          total_allowances,
          overtime_amount,
          bonus_amount,
          gross_salary,
          taxable_income,
          paye_amount,
          statutory_deductions,
          voluntary_deductions,
          total_deductions,
          net_salary,
          employer_contributions,
          payment_status
        )
        VALUES (
          ${payrollRunId}::uuid,
          ${employee.id}::uuid,
          ${employee.employee_number},
          ${fullName},
          ${employee.department_name},
          ${employee.position_name},
          ${employee.currency},
          ${basicSalary},
          ${allowanceTotal},
          ${overtimeAmount},
          ${bonusAmount},
          ${grossSalary},
          ${taxableIncome},
          ${payeAmount},
          ${statutoryDeductions},
          ${voluntaryDeductions},
          ${employeeTotalDeductions},
          ${netSalary},
          0,
          'unpaid'
        )
        RETURNING id
      `;

      const employeePayrollId = String(
        payrollRows[0].id,
      );

      await sql`
        INSERT INTO payroll_items (
          employee_payroll_id,
          item_type,
          item_code,
          item_name,
          quantity,
          rate,
          amount,
          taxable,
          description
        )
        VALUES (
          ${employeePayrollId}::uuid,
          'basic-salary',
          'BASIC',
          'Basic Salary',
          1,
          ${basicSalary},
          ${basicSalary},
          TRUE,
          'Employee basic salary'
        )
      `;

      for (const allowance of allowanceItems) {
        await sql`
          INSERT INTO payroll_items (
            employee_payroll_id,
            source_id,
            item_type,
            item_code,
            item_name,
            quantity,
            rate,
            amount,
            taxable,
            description
          )
          VALUES (
            ${employeePayrollId}::uuid,
            ${allowance.id}::uuid,
            ${
              allowance.code.toUpperCase() ===
              "BONUS"
                ? "bonus"
                : allowance.code.toUpperCase() ===
                    "OVERTIME"
                  ? "overtime"
                  : "allowance"
            },
            ${allowance.code},
            ${allowance.name},
            1,
            ${allowance.amount},
            ${allowance.amount},
            ${allowance.taxable},
            'Employee allowance'
          )
        `;
      }

      for (const deduction of deductionItems) {
        const itemType =
          deduction.code === "PAYE"
            ? "tax"
            : deduction.statutory
              ? "employee-contribution"
              : "deduction";

        await sql`
          INSERT INTO payroll_items (
            employee_payroll_id,
            source_id,
            item_type,
            item_code,
            item_name,
            quantity,
            rate,
            amount,
            taxable,
            description
          )
          VALUES (
            ${employeePayrollId}::uuid,
            ${deduction.id}::uuid,
            ${itemType},
            ${deduction.code},
            ${deduction.name},
            1,
            ${deduction.amount},
            ${deduction.amount},
            FALSE,
            'Employee deduction'
          )
        `;

        if (
          deduction.calculationType === "balance" &&
          deduction.amount > 0
        ) {
          await sql`
            UPDATE employee_deductions
            SET
              remaining_balance = GREATEST(
                remaining_balance -
                ${deduction.amount},
                0
              ),
              status = CASE
                WHEN remaining_balance -
                     ${deduction.amount} <= 0
                THEN 'completed'
                ELSE status
              END
            WHERE id = ${deduction.id}::uuid
          `;
        }
      }

      totalBasicSalary = money(
        totalBasicSalary + basicSalary,
      );

      totalGrossSalary = money(
        totalGrossSalary + grossSalary,
      );

      totalDeductions = money(
        totalDeductions +
          employeeTotalDeductions,
      );

      totalNetSalary = money(
        totalNetSalary + netSalary,
      );
    }

    await sql`
      UPDATE payroll_runs
      SET
        status = 'completed',
        total_employees = ${employees.length},
        total_basic_salary = ${totalBasicSalary},
        total_gross_salary = ${totalGrossSalary},
        total_deductions = ${totalDeductions},
        total_net_salary = ${totalNetSalary},
        processed_at = CURRENT_TIMESTAMP,
        notes = ${warnings.join("\n") || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${payrollRunId}::uuid
    `;

    await sql`
      UPDATE payroll_periods
      SET
        status = 'processing',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${payrollPeriodId}::uuid
    `;

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
        'Processed payroll',
        'Payroll',
        ${payrollRunId},
        ${JSON.stringify({
          payrollPeriodId,
          periodName: period.name,
          periodStartDate,
          periodEndDate,
          totalEmployees: employees.length,
          totalBasicSalary,
          totalGrossSalary,
          totalDeductions,
          totalNetSalary,
          warnings,
        })}::jsonb
      )
    `;

    return NextResponse.json({
      success: true,
      message: `Payroll processed successfully for ${employees.length} employee(s).`,
      payrollRunId,
      totals: {
        employees: employees.length,
        basicSalary: totalBasicSalary,
        grossSalary: totalGrossSalary,
        deductions: totalDeductions,
        netSalary: totalNetSalary,
      },
      warnings,
    });
  } catch (error) {
    console.error("Payroll processing error:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown payroll processing error.";

    return NextResponse.json(
      {
        success: false,
        message: `Payroll processing failed: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}