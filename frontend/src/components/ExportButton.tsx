import { exportToCsv } from "../utils/exportCsv";

interface ExportButtonProps {
  filename: string;
  rows: Record<string, unknown>[];
  className?: string;
}

export function ExportButton({ filename, rows, className }: ExportButtonProps) {
  return (
    <button
      type="button"
      disabled={rows.length === 0}
      onClick={() => exportToCsv(filename, rows)}
      className={
        className ??
        "rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      Export to Excel
    </button>
  );
}
