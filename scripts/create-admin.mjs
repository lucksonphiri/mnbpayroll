import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;
const adminName = process.env.ADMIN_NAME;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!databaseUrl) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

if (!adminName || !adminEmail || !adminPassword) {
  console.error(
    "ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD must be provided."
  );
  process.exit(1);
}

if (adminPassword.length < 8) {
  console.error("The administrator password must have at least 8 characters.");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function createAdministrator() {
  try {
    const roles = await sql`
      SELECT id
      FROM roles
      WHERE LOWER(name) = LOWER('Administrator')
      LIMIT 1
    `;

    if (roles.length === 0) {
      throw new Error(
        "Administrator role was not found. Run the payroll database schema first."
      );
    }

    const administratorRoleId = roles[0].id;

    const existingUsers = await sql`
      SELECT id, email
      FROM users
      WHERE LOWER(email) = LOWER(${adminEmail})
      LIMIT 1
    `;

    if (existingUsers.length > 0) {
      console.log(`A user with the email ${adminEmail} already exists.`);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const users = await sql`
      INSERT INTO users (
        role_id,
        full_name,
        email,
        password_hash,
        status,
        must_change_password
      )
      VALUES (
        ${administratorRoleId},
        ${adminName},
        ${adminEmail.toLowerCase()},
        ${passwordHash},
        'active',
        TRUE
      )
      RETURNING
        id,
        full_name,
        email,
        status,
        must_change_password,
        created_at
    `;

    console.log("Administrator created successfully.");
    console.table(users);
  } catch (error) {
    console.error("Failed to create the administrator:", error);
    process.exit(1);
  }
}

createAdministrator();