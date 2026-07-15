import Link from "next/link";

import LogoutButton from "@/components/LogoutButton";
import { requireCompletedPasswordChange } from "@/lib/auth";

export const dynamic = "force-dynamic";

type NavItem = {
  href: string;
  label: string;
};

function NavSection({
  title,
  items,
}: {
  title: string;
  items: NavItem[];
}) {
  return (
    <section className="pt-4 first:pt-0">
      <p className="px-4 pb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {title}
      </p>

      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl px-4 py-3 font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-800"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireCompletedPasswordChange();

  const humanResourcesItems: NavItem[] = [
    { href: "/dashboard/departments", label: "Departments" },
    { href: "/dashboard/positions", label: "Job Positions" },
    { href: "/dashboard/employees", label: "Employees" },
  ];

  const payrollItems: NavItem[] = [
    { href: "/dashboard/salaries", label: "Salary Management" },
    { href: "/dashboard/allowances", label: "Employee Allowances" },
    { href: "/dashboard/deductions", label: "Employee Deductions" },
    { href: "/dashboard/payroll", label: "Payroll Processing" },
    { href: "/dashboard/payroll-review", label: "Payroll Review" },
    { href: "/dashboard/payslips", label: "Payslips" },
    { href: "/dashboard/payments", label: "Payments" },
  ];

  const administrationItems: NavItem[] = [
    { href: "/dashboard/reports", label: "Reports" },
  ];

  if (user.role === "Administrator") {
    administrationItems.push(
      { href: "/dashboard/audit", label: "Audit Trail" },
      { href: "/dashboard/settings", label: "Settings" },
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-4">
          <div>
            <Link
              href="/dashboard"
              className="text-xl font-black text-blue-800"
            >
              Payroll Management System
            </Link>

            <p className="text-xs text-slate-500">
              Employee and payroll administration
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-slate-800">
                {user.fullName}
              </p>

              <p className="text-xs text-slate-500">{user.role}</p>
            </div>

            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden min-h-[calc(100vh-81px)] w-72 shrink-0 border-r border-slate-200 bg-white p-5 lg:block">
          <nav>
            <Link
              href="/dashboard"
              className="block rounded-xl bg-blue-50 px-4 py-3 font-bold text-blue-800"
            >
              Dashboard
            </Link>

            <NavSection title="Human Resources" items={humanResourcesItems} />
            <NavSection title="Payroll" items={payrollItems} />
            <NavSection title="Administration" items={administrationItems} />
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
