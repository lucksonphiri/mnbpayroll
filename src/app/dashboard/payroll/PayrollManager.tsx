"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type PayrollPeriod = {
  id: string;
  name: string;
  payroll_month: number;
  payroll_year: number;
  start_date: string;
  end_date: string;
  payment_date: string | null;
  status: string;
  run_count: number;
  total_employees: number;
  total_gross_salary: string | number;
  total_deductions: string | number;
  total_net_salary: string | number;
};

type Props = {
  periods: PayrollPeriod[];
  canManage: boolean;
};

const currentDate = new Date();

const initialPeriodForm = {
  month: String(currentDate.getMonth() + 1),
  year: String(currentDate.getFullYear()),
  startDate: "",
  endDate: "",
  paymentDate: "",
};

function displayDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PayrollManager({
  periods,
  canManage,
}: Props) {
  const router = useRouter();

  const [form, setForm] = useState(initialPeriodForm);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState("");

  function updateField(
    field: keyof typeof initialPeriodForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function createPeriod(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/payroll/periods",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setIsError(true);
        setMessage(
          data.message ||
            "The payroll period could not be created.",
        );
        return;
      }

      setIsError(false);
      setMessage(data.message);
      setForm(initialPeriodForm);
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function processPayroll(periodId: string) {
    const confirmed = window.confirm(
      "Process payroll for this period? Ensure salaries, allowances and deductions are correct before continuing.",
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(periodId);
    setMessage("");

    try {
      const response = await fetch(
        "/api/payroll/process",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payrollPeriodId: periodId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setIsError(true);
        setMessage(
          data.message || "Payroll processing failed.",
        );
        return;
      }

      setIsError(false);

      const warningText =
        Array.isArray(data.warnings) &&
        data.warnings.length > 0
          ? ` ${data.warnings.length} warning(s) were recorded.`
          : "";

      setMessage(`${data.message}${warningText}`);
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("Unable to connect to the server.");
    } finally {
      setProcessingId("");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  return (
    <div className="space-y-8">
      {canManage && (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900">
            Create Payroll Period
          </h2>

          <form
            onSubmit={createPeriod}
            className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Payroll month
              </label>

              <select
                value={form.month}
                onChange={(event) =>
                  updateField("month", event.target.value)
                }
                className={inputClass}
              >
                {[
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ].map((month, index) => (
                  <option
                    key={month}
                    value={index + 1}
                  >
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Payroll year
              </label>

              <input
                type="number"
                min="2000"
                max="2200"
                value={form.year}
                onChange={(event) =>
                  updateField("year", event.target.value)
                }
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Period start date
              </label>

              <input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  updateField(
                    "startDate",
                    event.target.value,
                  )
                }
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Period end date
              </label>

              <input
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  updateField(
                    "endDate",
                    event.target.value,
                  )
                }
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Payment date
              </label>

              <input
                type="date"
                value={form.paymentDate}
                onChange={(event) =>
                  updateField(
                    "paymentDate",
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-blue-700 px-7 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {submitting
                  ? "Creating period..."
                  : "Create Payroll Period"}
              </button>
            </div>
          </form>
        </section>
      )}

      {message && (
        <div
          className={`rounded-xl border px-5 py-4 ${
            isError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-black">
            Payroll Periods
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left">
            <thead className="bg-slate-50 text-sm text-slate-600">
              <tr>
                <th className="px-6 py-4">Period</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Employees</th>
                <th className="px-6 py-4">Gross Salary</th>
                <th className="px-6 py-4">Deductions</th>
                <th className="px-6 py-4">Net Salary</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {periods.map((period) => (
                <tr
                  key={period.id}
                  className="border-t border-slate-100"
                >
                  <td className="px-6 py-4">
                    <p className="font-bold">
                      {period.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Runs: {period.run_count}
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    <p>
                      {displayDate(period.start_date)}
                    </p>

                    <p className="text-sm text-slate-500">
                      to {displayDate(period.end_date)}
                    </p>

                    {period.payment_date && (
                      <p className="mt-1 text-xs text-slate-400">
                        Payment:{" "}
                        {displayDate(period.payment_date)}
                      </p>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {period.total_employees}
                  </td>

                  <td className="px-6 py-4">
                    {Number(
                      period.total_gross_salary,
                    ).toFixed(2)}
                  </td>

                  <td className="px-6 py-4">
                    {Number(
                      period.total_deductions,
                    ).toFixed(2)}
                  </td>

                  <td className="px-6 py-4 font-bold">
                    {Number(
                      period.total_net_salary,
                    ).toFixed(2)}
                  </td>

                  <td className="px-6 py-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize">
                      {period.status}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {canManage &&
                    period.status === "open" ? (
                      <button
                        type="button"
                        onClick={() =>
                          processPayroll(period.id)
                        }
                        disabled={
                          processingId === period.id
                        }
                        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                      >
                        {processingId === period.id
                          ? "Processing..."
                          : "Process Payroll"}
                      </button>
                    ) : (
                      <span className="text-sm text-slate-500">
                        No action
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {periods.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No payroll periods have been created.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}