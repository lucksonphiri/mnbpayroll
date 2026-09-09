import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
type Ctx={params:Promise<{id:string}>};
export async function PATCH(request:NextRequest,{params}:Ctx){
  try{
    const admin=await requireRole(["Administrator"]);const {id}=await params;const b=await request.json();const action=String(b.action||"");const note=String(b.note||"").trim()||null;const hours=Math.min(Math.max(Number(b.hours)||24,1),168);
    if(!["approve","reject"].includes(action))return NextResponse.json({success:false,message:"Invalid review action."},{status:400});
    const status=action==="approve"?"approved":"rejected";
    const rows=await sql`UPDATE edit_access_requests SET status=${status},reviewed_by=${admin.userId}::uuid,reviewed_at=CURRENT_TIMESTAMP,grant_expires_at=CASE WHEN ${status}='approved' THEN CURRENT_TIMESTAMP + (${hours} || ' hours')::interval ELSE NULL END,admin_note=${note} WHERE id=${id}::uuid AND status='pending' RETURNING *`;
    if(!rows.length)return NextResponse.json({success:false,message:"Pending request not found."},{status:404});
    await sql`INSERT INTO audit_logs(user_id,action,module_name,record_id,new_values) VALUES(${admin.userId}::uuid,${action==="approve"?"Approved edit access":"Rejected edit access"},'Edit Access',${id},${JSON.stringify({status,hours})}::jsonb)`;
    return NextResponse.json({success:true,message:`Edit request ${status}.`,request:rows[0]});
  }catch(error){console.error(error);return NextResponse.json({success:false,message:"The request could not be reviewed."},{status:500});}
}
