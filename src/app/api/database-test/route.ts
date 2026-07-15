import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await sql`
      SELECT
        CURRENT_TIMESTAMP AS database_time,
        current_database() AS database_name
    `;

    return NextResponse.json({
      success: true,
      message: "The payroll system is connected to PostgreSQL.",
      database: result[0],
    });
  } catch (error) {
    console.error("Database connection error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to connect to the payroll database.",
      },
      { status: 500 }
    );
  }
}