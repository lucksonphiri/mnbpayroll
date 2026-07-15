import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { sql } from "@/lib/db";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

export const dynamic = "force-dynamic";

type LoginUser = {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  status: string;
  must_change_password: boolean;
  role_name: string;
};

function normaliseEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email = normaliseEmail(body.email);
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter your email address and password.",
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
        users.must_change_password,
        roles.name AS role_name
      FROM users
      INNER JOIN roles
        ON roles.id = users.role_id
      WHERE LOWER(users.email) = LOWER(${email})
      LIMIT 1
    `) as LoginUser[];

    const user = rows[0];

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "The email address or password is incorrect.",
        },
        { status: 401 },
      );
    }

    if (user.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          message: "This account is not active. Contact the administrator.",
        },
        { status: 403 },
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash,
    );

    if (!passwordMatches) {
      return NextResponse.json(
        {
          success: false,
          message: "The email address or password is incorrect.",
        },
        { status: 401 },
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role_name,
      mustChangePassword: user.must_change_password,
    });

    await sql`
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = ${user.id}
    `;

    await sql`
      INSERT INTO audit_logs (
        user_id,
        action,
        module_name,
        record_id,
        new_values,
        ip_address,
        user_agent
      )
      VALUES (
        ${user.id},
        'Logged in',
        'Authentication',
        ${user.id},
        ${JSON.stringify({ email: user.email })}::jsonb,
        ${request.headers.get("x-forwarded-for") ?? ""},
        ${request.headers.get("user-agent") ?? ""}
      )
    `;

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      redirectTo: user.must_change_password
        ? "/change-password"
        : "/dashboard",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Login failed. Please try again.",
      },
      { status: 500 },
    );
  }
}