/**
 * Secure CSV Generator with RFC 4180 Compliance & Spreadsheet Formula Injection Protection
 */

// Formula injection triggers: =, +, -, @, tab, carriage return
const FORMULA_INJECTION_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitizes a single cell value to prevent CSV / Spreadsheet formula injection (CWE-1236)
 */
export function sanitizeCellValue(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  let str = String(val);

  // If the string starts with a dangerous formula trigger, prepend a single quote to neutralize it
  if (FORMULA_INJECTION_PREFIXES.some(prefix => str.startsWith(prefix))) {
    str = `'${str}`;
  }

  // RFC 4180 escaping: if it contains commas, double quotes, or newlines, wrap in quotes and escape quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function generateCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  // UTF-8 BOM so Excel and other spreadsheet viewers render UTF-8 (including Arabic) correctly
  const BOM = '\uFEFF';

  const headerRow = columns.map(c => sanitizeCellValue(c.header)).join(',');
  const rows = data.map(row => {
    return columns.map(c => sanitizeCellValue(row[c.key])).join(',');
  });

  return BOM + [headerRow, ...rows].join('\r\n');
}

export function downloadCSV(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName.endsWith('.csv') ? fileName : `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
