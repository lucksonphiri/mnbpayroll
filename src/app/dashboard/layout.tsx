import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { requireCompletedPasswordChange } from "@/lib/auth";

export const dynamic = "force-dynamic";

type NavItem={href:string;label:string;badge?:string};
function NavSection({title,items}:{title:string;items:NavItem[]}){if(!items.length)return null;return <section className="pt-5 first:pt-0"><p className="px-3 pb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</p><div className="space-y-1.5">{items.map(item=><Link key={item.href} href={item.href} className="group flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-800"><span>{item.label}</span>{item.badge&&<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700">{item.badge}</span>}</Link>)}</div></section>}

export default async function DashboardLayout({children}:{children:React.ReactNode}){
  const user=await requireCompletedPasswordChange();
  const isAdmin=user.role==='Administrator';const isHR=user.role==='HR Officer';const isSalaries=user.role==='Salaries Officer';
  const hr:NavItem[]=(isAdmin||isHR)?[
    {href:'/dashboard/departments',label:'Departments'},
    {href:'/dashboard/positions',label:'Job Positions'},
    {href:'/dashboard/employees',label:'Employees'},
  ]:[];
  const payroll:NavItem[]=(isAdmin||isSalaries)?[
    {href:'/dashboard/salaries',label:'Salary Management'},
    {href:'/dashboard/allowances',label:'Employee Allowances'},
    {href:'/dashboard/deductions',label:'Employee Deductions'},
    {href:'/dashboard/payroll',label:'Payroll Processing'},
    {href:'/dashboard/payroll-review',label:'Payroll Review'},
    {href:'/dashboard/payslips',label:'Payslips'},
    {href:'/dashboard/payments',label:'Payments'},
  ]:[];
  const admin:NavItem[]=isAdmin?[
    {href:'/dashboard/users',label:'User Management'},
    {href:'/dashboard/edit-access',label:'Edit Access Requests'},
    {href:'/dashboard/reports',label:'Reports'},
    {href:'/dashboard/audit',label:'Audit Trail'},
    {href:'/dashboard/settings',label:'Settings'},
  ]:[{href:'/dashboard/edit-access',label:'Request Edit Access'}];
  const roleTheme=isAdmin?'from-indigo-600 to-blue-700':isHR?'from-emerald-600 to-teal-700':'from-amber-500 to-orange-600';
  const menu=<><Link href="/dashboard" className="mb-2 block rounded-xl bg-blue-50 px-3 py-3 text-sm font-black text-blue-800">Overview</Link><NavSection title="Human Resources" items={hr}/><NavSection title="Payroll" items={payroll}/><NavSection title={isAdmin?'Administration':'Access'} items={admin}/></>;
  return <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-[1700px] items-center justify-between gap-4 px-4 py-3 sm:px-6"><div className="min-w-0"><Link href="/dashboard" className="block truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl">MNB Payroll Management System</Link><p className="truncate text-xs text-slate-500">Secure HR and payroll administration</p></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-black text-slate-800">{user.fullName}</p><p className="text-xs text-slate-500">{user.email}</p></div><span className={`hidden rounded-full bg-gradient-to-r ${roleTheme} px-3 py-1.5 text-xs font-black text-white md:inline-flex`}>{user.role}</span><LogoutButton/></div></div>
      <details className="mobile-dashboard-menu border-t border-slate-100 bg-white lg:hidden"><summary className="cursor-pointer list-none px-4 py-3 font-black text-blue-800"><span className="flex items-center justify-between"><span>Navigation</span><span aria-hidden>☰</span></span></summary><nav className="max-h-[72vh] overflow-y-auto border-t border-slate-100 px-4 py-4">{menu}</nav></details>
    </header>
    <div className="mx-auto flex max-w-[1700px]"><aside className="hidden min-h-[calc(100vh-69px)] w-72 shrink-0 border-r border-slate-200 bg-white p-5 lg:block"><div className={`mb-5 rounded-2xl bg-gradient-to-br ${roleTheme} p-5 text-white shadow-lg`}><p className="text-xs font-black uppercase tracking-[.16em] text-white/70">Signed in as</p><p className="mt-2 text-lg font-black">{user.role}</p><p className="mt-1 truncate text-xs text-white/80">{user.fullName}</p></div><nav>{menu}</nav></aside><main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main></div>
  </div>
}
