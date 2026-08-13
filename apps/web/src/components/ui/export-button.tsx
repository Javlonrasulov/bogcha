'use client';

import { Download, Printer } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from './button';

export type ExportCell = string | number | null | undefined;

export interface ExportTable {
  filename: string;
  columns: string[];
  rows: ExportCell[][];
}

/** Excel CSV'ni to'g'ri o'qishi uchun BOM + nuqtali vergul ajratkich. */
function toCsv(table: ExportTable): string {
  const escape = (cell: ExportCell) => {
    const value = cell ?? '';
    const text = typeof value === 'number' ? String(value).replace('.', ',') : String(value);
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [table.columns, ...table.rows].map((row) => row.map(escape).join(';'));
  return `\uFEFF${lines.join('\r\n')}`;
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Jadvalni CSV (Excel) sifatida yuklab olish (TZ §45). */
export function ExportButton({
  table,
  label,
  size = 'sm',
}: {
  table: ExportTable;
  label: string;
  size?: 'sm' | 'md';
}) {
  const onClick = useCallback(() => {
    download(`${table.filename}.csv`, toCsv(table), 'text/csv;charset=utf-8');
  }, [table]);

  return (
    <Button variant="secondary" size={size} onClick={onClick} disabled={table.rows.length === 0}>
      <Download className="size-4" aria-hidden />
      {label}
    </Button>
  );
}

/** Brauzer chop etish oynasi — "PDF sifatida saqlash" ham shu orqali (TZ §28). */
export function PrintButton({ label, size = 'sm' }: { label: string; size?: 'sm' | 'md' }) {
  return (
    <Button variant="ghost" size={size} onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
