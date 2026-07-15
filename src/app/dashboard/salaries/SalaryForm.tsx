"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Employee = {
  id: string;
  employee_number: string;
  first_name: string;
  surname: string;
  department_name: string | null;
  position_title: string | null;
};

type Props = {
  employees: Employee[];
};

const initialForm = {
  employeeId: "",
  basicSalary: "",
  currency: "USD",
  paymentFrequency: "monthly",
  hourlyRate: "",
  dailyRate: "",
  effectiveFrom: "",
  effectiveTo: "",
};

export default function SalaryForm({
  employees,
}: Props) {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateField(
    field: keyof typeof initialForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setIsError(true);
        setMessage(
          data.message || "The salary could not be assigned.",
        );
        return;
      }

      setIsError(false);
      setMessage(data.message);
      setForm(initialForm);

      router.refresh();
    } catch {
      setIsError(true);
      setMessage("Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-900">
        Assign Basic Salary
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Assign an employee salary and its effective period.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      >
        <div className="md:col-span-2 xl:col-span-3">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Employee
          </label>

          <select
            value={form.employeeId}
            onChange={(event) =>
              updateField("employeeId", event.target.value)
            }
            required
            className={inputClass}
          >
            <option value="">Select employee</option>

            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employee_number} —{" "}
                {employee.first_name} {employee.surname}
                {employee.position_title
                  ? ` — ${employee.position_title}`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Basic salary
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.basicSalary}
            onChange={(event) =>
              updateField("basicSalary", event.target.value)
            }
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Currency
          </label>

          <select
            value={form.currency}
            onChange={(event) =>
              updateField("currency", event.target.value)
            }
            className={inputClass}
          >
            <option value="USD">USD</option>
            <option value="ZWG">ZWG</option>
            <option value="ZAR">ZAR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Payment frequency
          </label>

          <select
            value={form.paymentFrequency}
            onChange={(event) =>
              updateField(
                "paymentFrequency",
                event.target.value,
              )
            }
            className={inputClass}
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
            <option value="hourly">Hourly</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Daily rate
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.dailyRate}
            onChange={(event) =>
              updateField("dailyRate", event.target.value)
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Hourly rate
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.hourlyRate}
            onChange={(event) =>
              updateField("hourlyRate", event.target.value)
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Effective from
          </label>

          <input
            type="date"
            value={form.effectiveFrom}
            onChange={(event) =>
              updateField(
                "effectiveFrom",
                event.target.value,
              )
            }
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Effective to
          </label>

          <input
            type="date"
            value={form.effectiveTo}
            onChange={(event) =>
              updateField("effectiveTo", event.target.value)
            }
            className={inputClass}
          />

          <p className="mt-2 text-xs text-slate-500">
            Leave blank when the salary has no known end date.
          </p>
        </div>

        <div className="md:col-span-2 xl:col-span-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-blue-700 px-7 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {submitting
              ? "Assigning salary..."
              : "Assign Salary"}
          </button>
        </div>
      </form>

      {message && (
        <div
          className={`mt-5 rounded-xl border px-4 py-3 ${
            isError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}
    </section>
  );
}