import { NextResponse } from "next/server";

import { getSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { sql } from "@/lib/db";

export async function POST() {
  try {
    const session = await getSession();

    if (session) {
      await sql`
        INSERT INTO audit_logs (
          user_id,
          action,
          module_name,
          record_id
        )
        VALUES (
          ${session.userId},
          'Logged out',
          'Authentication',
          ${session.userId}
        )
      `;
    }

    const response = NextResponse.json({
      success: true,
      message: "You have been logged out.",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    const response = NextResponse.json({
      success: true,
      message: "You have been logged out.",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  }
}