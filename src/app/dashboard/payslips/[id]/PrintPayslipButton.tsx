"use client";

export default function PrintPayslipButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800 print:hidden"
    >
      Print or Save as PDF
    </button>
  );
}