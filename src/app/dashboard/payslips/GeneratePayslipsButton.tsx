"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  payrollRunId: string;
};

export default function GeneratePayslipsButton({
  payrollRunId,
}: Props) {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function generatePayslips() {
    const confirmed = window.confirm(
      "Generate payslips for this approved payroll?",
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/payslips/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payrollRunId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setIsError(true);
        setMessage(
          data.message || "Payslip generation failed.",
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
        onClick={generatePayslips}
        disabled={submitting}
        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {submitting
          ? "Generating..."
          : "Generate Payslips"}
      </button>

      {message && (
        <p
          className={`mt-2 text-xs ${
            isError ? "text-red-700" : "text-green-700"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}