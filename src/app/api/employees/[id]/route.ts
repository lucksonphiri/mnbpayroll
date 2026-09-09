import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/auth";
import { hasEditAccess } from "@/lib/permissions";
import { sql } from "@/lib/db";
import {
  cleanDate,
  cleanOptionalText,
  cleanText,
  isEmployeeStatus,
  isEmploymentType,
  isPaymentMethod,
} from "@/lib/employees";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    await requireRole(["Administrator", "HR Officer"]);

    const { id } = await context.params;

    const rows = await sql`
      SELECT
        employees.*,
        departments.name AS department_name,
        positions.title AS position_title,
        supervisors.employee_number
          AS supervisor_employee_number,
        CONCAT(
          supervisors.first_name,
          ' ',
          supervisors.surname
        ) AS supervisor_name
      FROM employees
      LEFT JOIN departments
        ON departments.id = employees.department_id
      LEFT JOIN positions
        ON positions.id = employees.position_id
      LEFT JOIN employees AS supervisors
        ON supervisors.id = employees.supervisor_id
      WHERE employees.id = ${id}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      employee: rows[0],
    });
  } catch (error) {
    console.error("Get employee error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load the employee.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const user = await requireRole([
      "Administrator",
      "HR Officer",
    ]);

    const { id } = await context.params;
    if (!(await hasEditAccess(user, "Employees", id))) {
      return NextResponse.json({success:false,message:"Editing is locked. Request temporary edit access from the Administrator."},{status:403});
    }
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
    const terminationDate = cleanDate(body.terminationDate);

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
    const status = cleanText(body.status);

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
            "Department and job position are required.",
        },
        { status: 400 },
      );
    }

    if (!isEmploymentType(employmentType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid employment type.",
        },
        { status: 400 },
      );
    }

    if (!isPaymentMethod(paymentMethod)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment method.",
        },
        { status: 400 },
      );
    }

    if (!isEmployeeStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid employee status.",
        },
        { status: 400 },
      );
    }

    const oldRows = await sql`
      SELECT *
      FROM employees
      WHERE id = ${id}
      LIMIT 1
    `;

    if (oldRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee not found.",
        },
        { status: 404 },
      );
    }

    if (supervisorId === id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "An employee cannot be their own supervisor.",
        },
        { status: 400 },
      );
    }

    const positionRows = await sql`
      SELECT id
      FROM positions
      WHERE id = ${positionId}
        AND department_id = ${departmentId}
        AND status = 'active'
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
      const duplicateNationalId = await sql`
        SELECT id
        FROM employees
        WHERE id <> ${id}
          AND LOWER(national_id) =
              LOWER(${nationalId})
        LIMIT 1
      `;

      if (duplicateNationalId.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Another employee uses this national identification number.",
          },
          { status: 409 },
        );
      }
    }

    if (email) {
      const duplicateEmail = await sql`
        SELECT id
        FROM employees
        WHERE id <> ${id}
          AND LOWER(email) = LOWER(${email})
        LIMIT 1
      `;

      if (duplicateEmail.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Another employee uses this email address.",
          },
          { status: 409 },
        );
      }
    }

    const updatedRows = await sql`
      UPDATE employees
      SET
        title = ${title},
        first_name = ${firstName},
        middle_name = ${middleName},
        surname = ${surname},
        national_id = ${nationalId},
        date_of_birth = ${dateOfBirth},
        gender = ${gender},
        email = ${email},
        phone_number = ${phoneNumber},
        alternative_phone = ${alternativePhone},
        residential_address = ${residentialAddress},
        department_id = ${departmentId},
        position_id = ${positionId},
        supervisor_id = ${supervisorId},
        employment_type = ${employmentType},
        employment_date = ${employmentDate},
        contract_end_date = ${contractEndDate},
        termination_date = ${terminationDate},
        tax_number = ${taxNumber},
        nssa_number = ${nssaNumber},
        pension_number = ${pensionNumber},
        bank_name = ${bankName},
        bank_branch = ${bankBranch},
        bank_account_name = ${bankAccountName},
        bank_account_number = ${bankAccountNumber},
        payment_method = ${paymentMethod},
        status = ${status}
      WHERE id = ${id}
      RETURNING *
    `;

    const employee = updatedRows[0];

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
        'Updated employee',
        'Employees',
        ${id},
        ${JSON.stringify(oldRows[0])}::jsonb,
        ${JSON.stringify(employee)}::jsonb
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Employee information updated successfully.",
      employee,
    });
  } catch (error) {
    console.error("Update employee error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "The employee information could not be updated.",
      },
      { status: 500 },
    );
  }
}