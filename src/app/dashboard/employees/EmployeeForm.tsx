"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Department = {
  id: string;
  name: string;
};

type Position = {
  id: string;
  department_id: string;
  title: string;
};

type Supervisor = {
  id: string;
  employee_number: string;
  first_name: string;
  surname: string;
};

type Props = {
  departments: Department[];
  positions: Position[];
  supervisors: Supervisor[];
};

const initialForm = {
  title: "",
  firstName: "",
  middleName: "",
  surname: "",
  nationalId: "",
  dateOfBirth: "",
  gender: "",
  email: "",
  phoneNumber: "",
  alternativePhone: "",
  residentialAddress: "",
  departmentId: "",
  positionId: "",
  supervisorId: "",
  employmentType: "permanent",
  employmentDate: "",
  contractEndDate: "",
  taxNumber: "",
  nssaNumber: "",
  pensionNumber: "",
  paymentMethod: "bank",
  bankName: "",
  bankBranch: "",
  bankAccountName: "",
  bankAccountNumber: "",
};

export default function EmployeeForm({
  departments,
  positions,
  supervisors,
}: Props) {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filteredPositions = useMemo(
    () =>
      positions.filter(
        (position) =>
          position.department_id === form.departmentId,
      ),
    [positions, form.departmentId],
  );

  function updateField(
    field: keyof typeof initialForm,
    value: string,
  ) {
    setForm((current) => {
      if (field === "departmentId") {
        return {
          ...current,
          departmentId: value,
          positionId: "",
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/employees", {
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
            "The employee could not be registered.",
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
    <form
      onSubmit={handleSubmit}
      className="space-y-8"
    >
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 ${
            isError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">
          Personal Information
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Title
            </label>

            <select
              value={form.title}
              onChange={(event) =>
                updateField("title", event.target.value)
              }
              className={inputClass}
            >
              <option value="">Select title</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Miss">Miss</option>
              <option value="Ms">Ms</option>
              <option value="Dr">Dr</option>
              <option value="Prof">Prof</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              First name *
            </label>

            <input
              value={form.firstName}
              onChange={(event) =>
                updateField(
                  "firstName",
                  event.target.value,
                )
              }
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Middle name
            </label>

            <input
              value={form.middleName}
              onChange={(event) =>
                updateField(
                  "middleName",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Surname *
            </label>

            <input
              value={form.surname}
              onChange={(event) =>
                updateField("surname", event.target.value)
              }
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              National ID
            </label>

            <input
              value={form.nationalId}
              onChange={(event) =>
                updateField(
                  "nationalId",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Date of birth
            </label>

            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(event) =>
                updateField(
                  "dateOfBirth",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Gender
            </label>

            <select
              value={form.gender}
              onChange={(event) =>
                updateField("gender", event.target.value)
              }
              className={inputClass}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">
          Contact Information
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Email address
            </label>

            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                updateField("email", event.target.value)
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Phone number
            </label>

            <input
              value={form.phoneNumber}
              onChange={(event) =>
                updateField(
                  "phoneNumber",
                  event.target.value,
                )
              }
              placeholder="+263..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Alternative phone
            </label>

            <input
              value={form.alternativePhone}
              onChange={(event) =>
                updateField(
                  "alternativePhone",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Residential address
            </label>

            <input
              value={form.residentialAddress}
              onChange={(event) =>
                updateField(
                  "residentialAddress",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">
          Employment Information
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Department *
            </label>

            <select
              value={form.departmentId}
              onChange={(event) =>
                updateField(
                  "departmentId",
                  event.target.value,
                )
              }
              required
              className={inputClass}
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
              Job position *
            </label>

            <select
              value={form.positionId}
              onChange={(event) =>
                updateField(
                  "positionId",
                  event.target.value,
                )
              }
              required
              disabled={!form.departmentId}
              className={inputClass}
            >
              <option value="">Select position</option>

              {filteredPositions.map((position) => (
                <option
                  key={position.id}
                  value={position.id}
                >
                  {position.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Supervisor
            </label>

            <select
              value={form.supervisorId}
              onChange={(event) =>
                updateField(
                  "supervisorId",
                  event.target.value,
                )
              }
              className={inputClass}
            >
              <option value="">No supervisor</option>

              {supervisors.map((supervisor) => (
                <option
                  key={supervisor.id}
                  value={supervisor.id}
                >
                  {supervisor.employee_number} –{" "}
                  {supervisor.first_name}{" "}
                  {supervisor.surname}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Employment type *
            </label>

            <select
              value={form.employmentType}
              onChange={(event) =>
                updateField(
                  "employmentType",
                  event.target.value,
                )
              }
              className={inputClass}
            >
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="part-time">Part-time</option>
              <option value="temporary">Temporary</option>
              <option value="casual">Casual</option>
              <option value="intern">Intern</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Employment date *
            </label>

            <input
              type="date"
              value={form.employmentDate}
              onChange={(event) =>
                updateField(
                  "employmentDate",
                  event.target.value,
                )
              }
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Contract end date
            </label>

            <input
              type="date"
              value={form.contractEndDate}
              onChange={(event) =>
                updateField(
                  "contractEndDate",
                  event.target.value,
                )
              }
              disabled={form.employmentType !== "contract"}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">
          Statutory Information
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Tax number
            </label>

            <input
              value={form.taxNumber}
              onChange={(event) =>
                updateField(
                  "taxNumber",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              NSSA number
            </label>

            <input
              value={form.nssaNumber}
              onChange={(event) =>
                updateField(
                  "nssaNumber",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Pension number
            </label>

            <input
              value={form.pensionNumber}
              onChange={(event) =>
                updateField(
                  "pensionNumber",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">
          Payment and Banking
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Payment method *
            </label>

            <select
              value={form.paymentMethod}
              onChange={(event) =>
                updateField(
                  "paymentMethod",
                  event.target.value,
                )
              }
              className={inputClass}
            >
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
              <option value="mobile-money">
                Mobile money
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Bank name
            </label>

            <input
              value={form.bankName}
              onChange={(event) =>
                updateField(
                  "bankName",
                  event.target.value,
                )
              }
              disabled={form.paymentMethod !== "bank"}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Bank branch
            </label>

            <input
              value={form.bankBranch}
              onChange={(event) =>
                updateField(
                  "bankBranch",
                  event.target.value,
                )
              }
              disabled={form.paymentMethod !== "bank"}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Account name
            </label>

            <input
              value={form.bankAccountName}
              onChange={(event) =>
                updateField(
                  "bankAccountName",
                  event.target.value,
                )
              }
              disabled={form.paymentMethod !== "bank"}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Account number
            </label>

            <input
              value={form.bankAccountNumber}
              onChange={(event) =>
                updateField(
                  "bankAccountNumber",
                  event.target.value,
                )
              }
              disabled={form.paymentMethod !== "bank"}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-blue-700 px-8 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {submitting
            ? "Registering employee..."
            : "Register Employee"}
        </button>
      </div>
    </form>
  );
}