"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Department = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  position_count: number;
  employee_count: number;
};

type Props = {
  initialDepartments: Department[];
  canDelete: boolean;
};

const emptyForm = {
  id: "",
  name: "",
  code: "",
  description: "",
  status: "active",
};

export default function DepartmentManager({
  initialDepartments,
  canDelete,
}: Props) {
  const router = useRouter();

  const [departments, setDepartments] =
    useState(initialDepartments);

  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const editing = Boolean(form.id);

  function updateField(
    field: keyof typeof emptyForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startEdit(department: Department) {
    setMessage("");

    setForm({
      id: department.id,
      name: department.name,
      code: department.code ?? "",
      description: department.description ?? "",
      status: department.status,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetForm() {
    setForm(emptyForm);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(
        editing
          ? `/api/departments/${form.id}`
          : "/api/departments",
        {
          method: editing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name,
            code: form.code,
            description: form.description,
            status: form.status,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setIsError(true);
        setMessage(
          data.message || "The operation was unsuccessful.",
        );
        return;
      }

      setIsError(false);
      setMessage(data.message);

      if (editing) {
        setDepartments((current) =>
          current.map((department) =>
            department.id === form.id
              ? {
                  ...department,
                  ...data.department,
                }
              : department,
          ),
        );
      } else {
        setDepartments((current) =>
          [...current, {
            ...data.department,
            position_count: 0,
            employee_count: 0,
          }].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
      }

      resetForm();
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteDepartment(department: Department) {
    const confirmed = window.confirm(
      `Delete the ${department.name} department?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch(
        `/api/departments/${department.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setIsError(true);
        setMessage(
          data.message || "The department was not deleted.",
        );
        return;
      }

      setDepartments((current) =>
        current.filter(
          (item) => item.id !== department.id,
        ),
      );

      setIsError(false);
      setMessage(data.message);
    } catch {
      setIsError(true);
      setMessage("Unable to connect to the server.");
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">
          {editing ? "Edit Department" : "Add Department"}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="mt-6 grid gap-5 md:grid-cols-2"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Department name
            </label>

            <input
              value={form.name}
              onChange={(event) =>
                updateField("name", event.target.value)
              }
              required
              placeholder="Human Resources"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Department code
            </label>

            <input
              value={form.code}
              onChange={(event) =>
                updateField("code", event.target.value)
              }
              placeholder="HR"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Description
            </label>

            <textarea
              value={form.description}
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value,
                )
              }
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          {editing && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Status
              </label>

              <select
                value={form.status}
                onChange={(event) =>
                  updateField("status", event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}

          <div className="flex items-end gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {submitting
                ? "Saving..."
                : editing
                  ? "Update Department"
                  : "Add Department"}
            </button>

            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-6 py-3 font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
            )}
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

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-black text-slate-900">
            Department List
          </h2>
        </div>

        {departments.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No departments have been added.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50 text-sm text-slate-600">
                <tr>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Positions</th>
                  <th className="px-6 py-4">Employees</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {departments.map((department) => (
                  <tr
                    key={department.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">
                        {department.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {department.description ||
                          "No description"}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      {department.code || "—"}
                    </td>

                    <td className="px-6 py-4">
                      {department.position_count}
                    </td>

                    <td className="px-6 py-4">
                      {department.employee_count}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          department.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {department.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            startEdit(department)
                          }
                          className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
                        >
                          Edit
                        </button>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() =>
                              deleteDepartment(department)
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}