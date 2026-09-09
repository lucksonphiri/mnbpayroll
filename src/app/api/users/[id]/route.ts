import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

type Ctx={params:Promise<{id:string}>};
function makeTemporaryPassword(){const c="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";let v="Mnb!";for(let i=0;i<8;i++)v+=c[Math.floor(Math.random()*c.length)];return v;}

export async function PATCH(request:NextRequest,{params}:Ctx){
  try{
    const admin=await requireRole(["Administrator"]);const {id}=await params;const body=await request.json();const action=String(body.action||"");
    if(id===admin.userId && ["suspend","delete"].includes(action)) return NextResponse.json({success:false,message:"You cannot suspend or delete your own administrator account."},{status:400});
    const existing=await sql`SELECT u.id,u.email,u.status,r.name role_name FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=${id}::uuid LIMIT 1`;
    if(!existing.length)return NextResponse.json({success:false,message:"User not found."},{status:404});

    if(action==="suspend"||action==="activate"){
      const status=action==="suspend"?"suspended":"active";
      await sql`UPDATE users SET status=${status},updated_at=CURRENT_TIMESTAMP WHERE id=${id}::uuid`;
      await sql`INSERT INTO audit_logs(user_id,action,module_name,record_id,new_values) VALUES(${admin.userId}::uuid,${action==="suspend"?"Suspended user":"Activated user"},'User Administration',${id},${JSON.stringify({status})}::jsonb)`;
      return NextResponse.json({success:true,message:`User ${status === "active" ? "activated" : "suspended"} successfully.`,status});
    }

    if(action==="reset-password"){
      const temporaryPassword=makeTemporaryPassword();const hash=await bcrypt.hash(temporaryPassword,12);
      await sql`UPDATE users SET password_hash=${hash},must_change_password=TRUE,status='active',updated_at=CURRENT_TIMESTAMP WHERE id=${id}::uuid`;
      await sql`INSERT INTO audit_logs(user_id,action,module_name,record_id) VALUES(${admin.userId}::uuid,'Reset user password','User Administration',${id})`;
      return NextResponse.json({success:true,message:"Password reset successfully. The user must change it at next login.",temporaryPassword});
    }

    return NextResponse.json({success:false,message:"Invalid user action."},{status:400});
  }catch(error){console.error(error);return NextResponse.json({success:false,message:"User action failed."},{status:500});}
}

export async function DELETE(_request:NextRequest,{params}:Ctx){
  try{
    const admin=await requireRole(["Administrator"]);const {id}=await params;
    if(id===admin.userId)return NextResponse.json({success:false,message:"You cannot delete your own administrator account."},{status:400});
    const rows=await sql`SELECT id,email FROM users WHERE id=${id}::uuid LIMIT 1`;
    if(!rows.length)return NextResponse.json({success:false,message:"User not found."},{status:404});
    await sql`UPDATE users SET status='suspended',email=CONCAT('deleted+',id,'+',email),updated_at=CURRENT_TIMESTAMP WHERE id=${id}::uuid`;
    await sql`INSERT INTO audit_logs(user_id,action,module_name,record_id,old_values) VALUES(${admin.userId}::uuid,'Deleted user account','User Administration',${id},${JSON.stringify(rows[0])}::jsonb)`;
    return NextResponse.json({success:true,message:"User account deleted successfully."});
  }catch(error){console.error(error);return NextResponse.json({success:false,message:"User account could not be deleted."},{status:500});}
}
