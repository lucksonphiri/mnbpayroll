import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { sql } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

type PasswordUser = {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  status: string;
  role_name: string;
};

function isStrongEnough(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Your session has expired. Sign in again.",
        },
        { status: 401 },
      );
    }

    const body = await request.json();

    const currentPassword =
      typeof body.currentPassword === "string"
        ? body.currentPassword
        : "";

    const newPassword =
      typeof body.newPassword === "string"
        ? body.newPassword
        : "";

    const confirmPassword =
      typeof body.confirmPassword === "string"
        ? body.confirmPassword
        : "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Complete all password fields.",
        },
        { status: 400 },
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "The new passwords do not match.",
        },
        { status: 400 },
      );
    }

    if (!isStrongEnough(newPassword)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The new password must contain at least 8 characters, one uppercase letter, one lowercase letter and one number.",
        },
        { status: 400 },
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "The new password must differ from the current password.",
        },
        { status: 400 },
      );
    }

    const rows = (await sql`
      SELECT
        users.id,
        users.full_name,
        users.email,
        users.password_hash,
        users.status,
        roles.name AS role_name
      FROM users
      INNER JOIN roles
        ON roles.id = users.role_id
      WHERE users.id = ${session.userId}
      LIMIT 1
    `) as PasswordUser[];

    const user = rows[0];

    if (!user || user.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          message: "The user account could not be found.",
        },
        { status: 404 },
      );
    }

    const currentPasswordMatches = await bcrypt.compare(
      currentPassword,
      user.password_hash,
    );

    if (!currentPasswordMatches) {
      return NextResponse.json(
        {
          success: false,
          message: "The current password is incorrect.",
        },
        { status: 400 },
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await sql`
      UPDATE users
      SET
        password_hash = ${newPasswordHash},
        must_change_password = FALSE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${user.id}
    `;

    await sql`
      INSERT INTO audit_logs (
        user_id,
        action,
        module_name,
        record_id
      )
      VALUES (
        ${user.id},
        'Changed password',
        'Authentication',
        ${user.id}
      )
    `;

    const newToken = await createSessionToken({
      userId: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role_name,
      mustChangePassword: false,
    });

    const response = NextResponse.json({
      success: true,
      message: "Your password was changed successfully.",
      redirectTo: "/dashboard",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error("Password change error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "The password could not be changed.",
      },
      { status: 500 },
    );
  }
}