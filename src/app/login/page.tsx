import { redirect } from "next/navigation";

import LoginForm from "./LoginForm";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect(
      session.mustChangePassword
        ? "/change-password"
        : "/dashboard",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-2xl font-black text-white">
            P
          </div>

          <h1 className="mt-5 text-3xl font-black text-slate-900">
            Payroll System
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to manage employees and payroll.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}