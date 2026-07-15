import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  cleanDate,
  cleanOptionalText,
  cleanText,
  isEmploymentType,
  isPaymentMethod,
} from "@/lib/employees";

export const dynamic = "force-dynamic";

type EmployeeRow = {
  id: string;
  employee_number: string;
  first_name: string;
  surname: string;
  email: string | null;
  phone_number: string | null;
  employment_type: string;
  employment_date: string;
  status: string;
  department_name: string | null;
  position_title: string | null;
};

export async function GET(request: NextRequest) {
  try {
    await requireRole([
      "Administrator",
      "Human Resources",
      "Accounts Officer",
    ]);

    const search =
      request.nextUrl.searchParams.get("search")?.trim() ??
      "";

    const status =
      request.nextUrl.searchParams.get("status")?.trim() ??
      "";

    const departmentId =
  request.nextUrl.searchParams
    .get("departmentId")
    ?.trim() || null;

    const employees = (await sql`
      SELECT
        employees.id,
        employees.employee_number,
        employees.title,
        employees.first_name,
        employees.middle_name,
        employees.surname,
        employees.email,
        employees.phone_number,
        employees.employment_type,
        employees.employment_date,
        employees.status,
        departments.name AS department_name,
        positions.title AS position_title
      FROM employees
      LEFT JOIN departments
        ON departments.id = employees.department_id
      LEFT JOIN positions
        ON positions.id = employees.position_id
      WHERE (
        ${search} = ''
        OR employees.employee_number ILIKE ${`%${search}%`}
        OR employees.first_name ILIKE ${`%${search}%`}
        OR employees.surname ILIKE ${`%${search}%`}
        OR COALESCE(employees.email, '') ILIKE ${`%${search}%`}
        OR COALESCE(employees.national_id, '') ILIKE ${`%${search}%`}
      )
      AND (
        ${status} = ''
        OR employees.status = ${status}
      )
      AND (
  ${departmentId}::uuid IS NULL
  OR employees.department_id = ${departmentId}::uuid
)
      ORDER BY
        employees.surname ASC,
        employees.first_name ASC
    `) as EmployeeRow[];

    return NextResponse.json({
      success: true,
      employees,
    });
  } catch (error) {
    console.error("Get employees error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load employees.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole([
      "Administrator",
      "Human Resources",
    ]);

    const body = await request.json();

    const title = cleanOptionalText(body.title);
    const firstName = cleanText(body.firstName);
    const middleName = cleanOptionalText(body.middleName);
    const surname = cleanText(body.surname);

    const nationalId = cleanOptionalText(body.nationalId);
    const dateOfBirth = cleanDate(body.dateOfBirth);
    const gender = cleanOptionalText(body.gender);

    const email = cleanOptionalText(body.email)?.toLowerCase() ?? null;
    const phoneNumber = cleanOptionalText(body.phoneNumber);
    const alternativePhone = cleanOptionalText(
      body.alternativePhone,
    );
    const residentialAddress = cleanOptionalText(
      body.residentialAddress,
    );

    const departmentId = cleanText(body.departmentId);
    const positionId = cleanText(body.positionId);
    const supervisorId = cleanOptionalText(body.supervisorId);

    const employmentType = cleanText(body.employmentType);
    const employmentDate = cleanDate(body.employmentDate);
    const contractEndDate = cleanDate(body.contractEndDate);

    const taxNumber = cleanOptionalText(body.taxNumber);
    const nssaNumber = cleanOptionalText(body.nssaNumber);
    const pensionNumber = cleanOptionalText(
      body.pensionNumber,
    );

    const bankName = cleanOptionalText(body.bankName);
    const bankBranch = cleanOptionalText(body.bankBranch);
    const bankAccountName = cleanOptionalText(
      body.bankAccountName,
    );
    const bankAccountNumber = cleanOptionalText(
      body.bankAccountNumber,
    );

    const paymentMethod = cleanText(body.paymentMethod);

    if (!firstName || !surname || !employmentDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "First name, surname and employment date are required.",
        },
        { status: 400 },
      );
    }

    if (!departmentId || !positionId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Select the employee department and job position.",
        },
        { status: 400 },
      );
    }

    if (!isEmploymentType(employmentType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Select a valid employment type.",
        },
        { status: 400 },
      );
    }

    if (!isPaymentMethod(paymentMethod)) {
      return NextResponse.json(
        {
          success: false,
          message: "Select a valid payment method.",
        },
        { status: 400 },
      );
    }

    if (
      employmentType === "contract" &&
      !contractEndDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A contract end date is required for contract employees.",
        },
        { status: 400 },
      );
    }

    if (
      contractEndDate &&
      employmentDate &&
      contractEndDate < employmentDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Contract end date cannot be before the employment date.",
        },
        { status: 400 },
      );
    }

    const positionRows = await sql`
      SELECT
        positions.id,
        positions.department_id
      FROM positions
      INNER JOIN departments
        ON departments.id = positions.department_id
      WHERE positions.id = ${positionId}
        AND positions.department_id = ${departmentId}
        AND positions.status = 'active'
        AND departments.status = 'active'
      LIMIT 1
    `;

    if (positionRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The selected position does not belong to the selected department.",
        },
        { status: 400 },
      );
    }

    if (nationalId) {
      const nationalIdRows = await sql`
        SELECT id
        FROM employees
        WHERE LOWER(national_id) = LOWER(${nationalId})
        LIMIT 1
      `;

      if (nationalIdRows.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "An employee with this national identification number already exists.",
          },
          { status: 409 },
        );
      }
    }

    if (email) {
      const emailRows = await sql`
        SELECT id
        FROM employees
        WHERE LOWER(email) = LOWER(${email})
        LIMIT 1
      `;

      if (emailRows.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "An employee with this email address already exists.",
          },
          { status: 409 },
        );
      }
    }

    if (supervisorId) {
      const supervisorRows = await sql`
        SELECT id
        FROM employees
        WHERE id = ${supervisorId}
          AND status = 'active'
        LIMIT 1
      `;

      if (supervisorRows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "The selected supervisor is not available.",
          },
          { status: 400 },
        );
      }
    }

    const numberRows = await sql`
      SELECT generate_employee_number()
        AS employee_number
    `;

    const employeeNumber =
      String(numberRows[0].employee_number);

    const rows = await sql`
      INSERT INTO employees (
        employee_number,
        title,
        first_name,
        middle_name,
        surname,
        national_id,
        date_of_birth,
        gender,
        email,
        phone_number,
        alternative_phone,
        residential_address,
        department_id,
        position_id,
        supervisor_id,
        employment_type,
        employment_date,
        contract_end_date,
        tax_number,
        nssa_number,
        pension_number,
        bank_name,
        bank_branch,
        bank_account_name,
        bank_account_number,
        payment_method,
        status
      )
      VALUES (
        ${employeeNumber},
        ${title},
        ${firstName},
        ${middleName},
        ${surname},
        ${nationalId},
        ${dateOfBirth},
        ${gender},
        ${email},
        ${phoneNumber},
        ${alternativePhone},
        ${residentialAddress},
        ${departmentId},
        ${positionId},
        ${supervisorId},
        ${employmentType},
        ${employmentDate},
        ${contractEndDate},
        ${taxNumber},
        ${nssaNumber},
        ${pensionNumber},
        ${bankName},
        ${bankBranch},
        ${bankAccountName},
        ${bankAccountNumber},
        ${paymentMethod},
        'active'
      )
      RETURNING *
    `;

    const employee = rows[0];

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
        'Created employee',
        'Employees',
        ${employee.id},
        ${JSON.stringify(employee)}::jsonb
      )
    `;

    return NextResponse.json(
      {
        success: true,
        message: `Employee ${employeeNumber} registered successfully.`,
        employee,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create employee error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "The employee could not be registered.",
      },
      { status: 500 },
    );
  }
}