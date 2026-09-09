import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function makeTemporaryPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let value = "Mnb!";
  for (let i = 0; i < 8; i += 1) value += chars[Math.floor(Math.random() * chars.length)];
  return value;
}

export async function GET() {
  try {
    await requireRole(["Administrator"]);
    const users = await sql`
      SELECT u.id,u.full_name,u.email,u.status,u.must_change_password,u.last_login_at,u.created_at,r.name AS role_name
      FROM users u
      INNER JOIN roles r ON r.id=u.role_id
      WHERE u.email NOT LIKE 'deleted+%'
      ORDER BY u.full_name
    `;
    const roles = await sql`
      SELECT id,name FROM roles
      WHERE name IN ('Administrator','HR Officer','Salaries Officer')
      ORDER BY CASE name WHEN 'Administrator' THEN 1 WHEN 'HR Officer' THEN 2 ELSE 3 END
    `;
    return NextResponse.json({success:true,users,roles});
  } catch (error) {
    console.error(error);
    return NextResponse.json({success:false,message:"Unable to load users."},{status:500});
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole(["Administrator"]);
    const body = await request.json();
    const fullName = text(body.fullName);
    const email = text(body.email).toLowerCase();
    const roleId = text(body.roleId);
    const suppliedPassword = text(body.temporaryPassword);
    const temporaryPassword = suppliedPassword || makeTemporaryPassword();

    if (!fullName || !email || !roleId) {
      return NextResponse.json({success:false,message:"Full name, email and role are required."},{status:400});
    }
    if (temporaryPassword.length < 8) {
      return NextResponse.json({success:false,message:"Temporary password must have at least 8 characters."},{status:400});
    }

    const duplicate = await sql`SELECT id FROM users WHERE LOWER(email)=LOWER(${email}) LIMIT 1`;
    if (duplicate.length) return NextResponse.json({success:false,message:"A user with this email already exists."},{status:409});

    const roleRows = await sql`SELECT id,name FROM roles WHERE id=${roleId}::uuid AND name IN ('Administrator','HR Officer','Salaries Officer') LIMIT 1`;
    if (!roleRows.length) return NextResponse.json({success:false,message:"Invalid user role."},{status:400});

    const hash = await bcrypt.hash(temporaryPassword,12);
    const rows = await sql`
      INSERT INTO users(role_id,full_name,email,password_hash,status,must_change_password,updated_at)
      VALUES(${roleId}::uuid,${fullName},${email},${hash},'active',TRUE,CURRENT_TIMESTAMP)
      RETURNING id,full_name,email,status,must_change_password,created_at
    `;
    await sql`
      INSERT INTO audit_logs(user_id,action,module_name,record_id,new_values)
      VALUES(${admin.userId}::uuid,'Created user','User Administration',${rows[0].id},${JSON.stringify({email,role:roleRows[0].name})}::jsonb)
    `;
    return NextResponse.json({success:true,message:"User created successfully.",user:{...rows[0],role_name:roleRows[0].name},temporaryPassword},{status:201});
  } catch (error) {
    console.error(error);
    return NextResponse.json({success:false,message:"The user could not be created."},{status:500});
  }
}
