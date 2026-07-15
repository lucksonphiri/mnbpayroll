import { redirect } from "next/navigation";

import ChangePasswordForm from "./ChangePasswordForm";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await requireUser();

  if (!user.mustChangePassword) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-black text-slate-900">
          Change Password
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Welcome, {user.fullName}. You must change your temporary
          password before entering the payroll system.
        </p>

        <ChangePasswordForm />
      </section>
    </main>
  );
}