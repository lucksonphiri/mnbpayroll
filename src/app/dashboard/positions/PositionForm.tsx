"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Department = {
  id: string;
  name: string;
};

type Props = {
  departments: Department[];
};

export default function PositionForm({
  departments,
}: Props) {
  const router = useRouter();

  const [departmentId, setDepartmentId] = useState("");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [minimumSalary, setMinimumSalary] = useState("");
  const [maximumSalary, setMaximumSalary] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/positions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          departmentId,
          title,
          code,
          description,
          minimumSalary,
          maximumSalary,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setIsError(true);
        setMessage(
          data.message || "The position was not created.",
        );
        return;
      }

      setDepartmentId("");
      setTitle("");
      setCode("");
      setDescription("");
      setMinimumSalary("");
      setMaximumSalary("");

      setIsError(false);
      setMessage(data.message);
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-900">
        Add Job Position
      </h2>

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-5 md:grid-cols-2"
      >
        <div>
          <label className="mb-2 block text-sm font-semibold">
            Department
          </label>

          <select
            value={departmentId}
            onChange={(event) =>
              setDepartmentId(event.target.value)
            }
            required
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          >
            <option value="">Select department</option>

            {departments.map((department) => (
              <option
                key={department.id}
                value={department.id}
              >
                {department.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Position title
          </label>

          <input
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            required
            placeholder="Accounts Clerk"
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Position code
          </label>

          <input
            value={code}
            onChange={(event) =>
              setCode(event.target.value)
            }
            placeholder="ACC-CLK"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 uppercase"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Description
          </label>

          <input
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Minimum salary
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={minimumSalary}
            onChange={(event) =>
              setMinimumSalary(event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Maximum salary
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={maximumSalary}
            onChange={(event) =>
              setMaximumSalary(event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {submitting
              ? "Saving..."
              : "Add Job Position"}
          </button>
        </div>
      </form>

      {message && (
        <div
          className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
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