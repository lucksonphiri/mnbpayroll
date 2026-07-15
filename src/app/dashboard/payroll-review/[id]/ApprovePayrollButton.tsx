"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  payrollRunId: string;
};

export default function ApprovePayrollButton({
  payrollRunId,
}: Props) {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function approvePayroll() {
    const confirmed = window.confirm(
      "Approve this payroll? After approval, the payroll will be ready for payslip generation and payment processing.",
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/payroll/runs/${payrollRunId}/approve`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setIsError(true);
        setMessage(
          data.message || "Payroll approval failed.",
        );
        return;
      }

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
    <div>
      <button
        type="button"
        onClick={approvePayroll}
        disabled={submitting}
        className="rounded-xl bg-green-700 px-6 py-3 font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? "Approving Payroll..."
          : "Approve Payroll"}
      </button>

      {message && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            isError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}