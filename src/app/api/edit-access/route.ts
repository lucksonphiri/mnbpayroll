import { NextRequest, NextResponse } from "next/server";
import { requireCompletedPasswordChange, requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { modulesForRole } from "@/lib/permissions";

export async function GET(){
  try{
    const user=await requireCompletedPasswordChange();
    if(user.role==="Administrator"){
      const requests=await sql`SELECT e.*,u.full_name,u.email,r.name role_name,reviewer.full_name reviewer_name FROM edit_access_requests e JOIN users u ON u.id=e.requester_id JOIN roles r ON r.id=u.role_id LEFT JOIN users reviewer ON reviewer.id=e.reviewed_by ORDER BY CASE e.status WHEN 'pending' THEN 0 ELSE 1 END,e.created_at DESC LIMIT 300`;
      return NextResponse.json({success:true,requests});
    }
    const requests=await sql`SELECT * FROM edit_access_requests WHERE requester_id=${user.userId}::uuid ORDER BY created_at DESC LIMIT 100`;
    return NextResponse.json({success:true,requests,modules:modulesForRole(user.role)});
  }catch(error){console.error(error);return NextResponse.json({success:false,message:"Unable to load edit requests."},{status:500});}
}

export async function POST(request:NextRequest){
  try{
    const user=await requireRole(["HR Officer","Salaries Officer"]);const body=await request.json();const moduleName=String(body.moduleName||"").trim();const recordId=String(body.recordId||"").trim()||null;const reason=String(body.reason||"").trim();
    if(!modulesForRole(user.role).includes(moduleName))return NextResponse.json({success:false,message:"You cannot request edit access for this module."},{status:403});
    if(!reason)return NextResponse.json({success:false,message:"Explain the correction that is required."},{status:400});
    const duplicate=await sql`SELECT id FROM edit_access_requests WHERE requester_id=${user.userId}::uuid AND module_name=${moduleName} AND status='pending' AND COALESCE(record_id::text,'')=COALESCE(${recordId},'') LIMIT 1`;
    if(duplicate.length)return NextResponse.json({success:false,message:"A pending request already exists for this item."},{status:409});
    const rows=await sql`INSERT INTO edit_access_requests(requester_id,module_name,record_id,reason) VALUES(${user.userId}::uuid,${moduleName},${recordId}::uuid,${reason}) RETURNING *`;
    return NextResponse.json({success:true,message:"Edit request sent to the Administrator.",request:rows[0]},{status:201});
  }catch(error){console.error(error);return NextResponse.json({success:false,message:"The edit request could not be submitted."},{status:500});}
}
