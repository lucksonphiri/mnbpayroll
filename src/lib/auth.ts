import "server-only";

import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSession, type SessionPayload } from "@/lib/session";

type DatabaseUser = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  must_change_password: boolean;
  role_name: string;
};

export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const rows = (await sql`
    SELECT
      users.id,
      users.full_name,
      users.email,
      users.status,
      users.must_change_password,
      roles.name AS role_name
    FROM users
    INNER JOIN roles
      ON roles.id = users.role_id
    WHERE users.id = ${session.userId}
    LIMIT 1
  `) as DatabaseUser[];

  const user = rows[0];

  if (!user || user.status !== "active") {
    redirect("/login");
  }

  return {
    userId: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role_name,
    mustChangePassword: user.must_change_password,
  };
}

export async function requireCompletedPasswordChange(): Promise<SessionPayload> {
  const user = await requireUser();

  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  return user;
}

export async function requireRole(
  allowedRoles: string[],
): Promise<SessionPayload> {
  const user = await requireCompletedPasswordChange();

  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard");
  }

  return user;
}