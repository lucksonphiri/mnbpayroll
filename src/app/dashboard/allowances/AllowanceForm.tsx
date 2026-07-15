"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Employee = {
  id: string;
  employee_number: string;
  first_name: string;
  surname: string;
};

type AllowanceType = {
  id: string;
  name: string;
  code: string;
  calculation_type: string;
  taxable: boolean;
  recurring: boolean;
};

type Props = {
  employees: Employee[];
  allowanceTypes: AllowanceType[];
};

const initialForm = {
  employeeId: "",
  allowanceTypeId: "",
  amount: "",
  percentage: "",
  effectiveFrom: "",
  effectiveTo: "",
};

export default function AllowanceForm({
  employees,
  allowanceTypes,
}: Props) {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedType = useMemo(
    () =>
      allowanceTypes.find(
        (item) => item.id === form.allowanceTypeId,
      ),
    [allowanceTypes, form.allowanceTypeId],
  );

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
      const response = await fetch("/api/allowances", {
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
          data.message ||
            "The allowance could not be assigned.",
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
        Assign Employee Allowance
      </h2>

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      >
        <div>
          <label className="mb-2 block text-sm font-semibold">
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
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Allowance type
          </label>

          <select
            value={form.allowanceTypeId}
            onChange={(event) =>
              updateField(
                "allowanceTypeId",
                event.target.value,
              )
            }
            required
            className={inputClass}
          >
            <option value="">Select allowance</option>

            {allowanceTypes.map((allowanceType) => (
              <option
                key={allowanceType.id}
                value={allowanceType.id}
              >
                {allowanceType.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Calculation method
          </label>

          <input
            value={
              selectedType?.calculation_type
                ? selectedType.calculation_type
                : ""
            }
            readOnly
            placeholder="Select allowance type"
            className={`${inputClass} bg-slate-100 capitalize`}
          />
        </div>

        {selectedType?.calculation_type === "percentage" ? (
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Percentage
            </label>

            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.percentage}
              onChange={(event) =>
                updateField(
                  "percentage",
                  event.target.value,
                )
              }
              required
              className={inputClass}
            />
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Allowance amount or rate
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) =>
                updateField("amount", event.target.value)
              }
              required
              className={inputClass}
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-semibold">
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
          <label className="mb-2 block text-sm font-semibold">
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
        </div>

        {selectedType && (
          <div className="md:col-span-2 xl:col-span-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p>
              <strong>Taxable:</strong>{" "}
              {selectedType.taxable ? "Yes" : "No"}
            </p>

            <p className="mt-1">
              <strong>Recurring:</strong>{" "}
              {selectedType.recurring ? "Yes" : "No"}
            </p>
          </div>
        )}

        <div className="md:col-span-2 xl:col-span-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-blue-700 px-7 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {submitting
              ? "Assigning allowance..."
              : "Assign Allowance"}
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