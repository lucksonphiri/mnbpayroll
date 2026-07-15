"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  allowanceId: string;
  currentStatus: string;
  canDelete: boolean;
};

export default function AllowanceActions({
  allowanceId,
  currentStatus,
  canDelete,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function changeStatus() {
    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/allowances/${allowanceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status:
              currentStatus === "active"
                ? "inactive"
                : "active",
            amount: 0,
            percentage: 0,
            effectiveFrom:
              new Date().toISOString().split("T")[0],
            effectiveTo: "",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        window.alert(
          data.message || "Status could not be changed.",
        );
        return;
      }

      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAllowance() {
    const confirmed = window.confirm(
      "Delete this employee allowance?",
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/allowances/${allowanceId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        window.alert(
          data.message ||
            "The allowance could not be deleted.",
        );
        return;
      }

      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={changeStatus}
        disabled={submitting}
        className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-bold text-amber-700 hover:bg-amber-50"
      >
        {currentStatus === "active"
          ? "Deactivate"
          : "Activate"}
      </button>

      {canDelete && (
        <button
          type="button"
          onClick={deleteAllowance}
          disabled={submitting}
          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
        >
          Delete
        </button>
      )}
    </div>
  );
}