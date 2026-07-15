import { requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireRole(["Administrator", "Human Resources", "Accounts Officer"]);
  const rows = await sql`
    SELECT pp.name, pr.total_employees, pr.total_basic_salary,
      pr.total_gross_salary, pr.total_deductions, pr.total_net_salary, pr.status
    FROM payroll_runs pr
    JOIN payroll_periods pp ON pp.id = pr.payroll_period_id
    WHERE pr.status IN ('completed','approved')
    ORDER BY pp.payroll_year DESC, pp.payroll_month DESC, pr.run_number DESC
  `;
  return <div className="space-y-8"><div><h1 className="text-3xl font-black">Payroll Reports</h1><p className="mt-2 text-slate-500">Consolidated payroll summaries by period.</p></div><section className="overflow-hidden rounded-2xl bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50"><tr>{["Period","Employees","Basic","Gross","Deductions","Net","Status"].map(h=><th key={h} className="px-5 py-4">{h}</th>)}</tr></thead><tbody>{rows.map((r:any)=><tr key={`${r.name}-${r.status}`} className="border-t"><td className="px-5 py-4 font-bold">{r.name}</td><td className="px-5 py-4">{Number(r.total_employees)}</td><td className="px-5 py-4">{Number(r.total_basic_salary).toFixed(2)}</td><td className="px-5 py-4">{Number(r.total_gross_salary).toFixed(2)}</td><td className="px-5 py-4 text-red-700">{Number(r.total_deductions).toFixed(2)}</td><td className="px-5 py-4 font-black text-green-700">{Number(r.total_net_salary).toFixed(2)}</td><td className="px-5 py-4 capitalize">{r.status}</td></tr>)}{rows.length===0&&<tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">No payroll reports are available.</td></tr>}</tbody></table></div></section></div>;
}
