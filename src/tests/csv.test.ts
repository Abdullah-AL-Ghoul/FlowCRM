import { describe, it, expect } from 'vitest';
import { sanitizeCellValue, generateCSV } from '../lib/csv';

describe('CSV Security & Sanitization (CWE-1236)', () => {
  it('neutralizes formula injection characters (=, +, -, @)', () => {
    expect(sanitizeCellValue('=cmd|"/c calc"!A0')).toBe('"\'=cmd|""/c calc""!A0"');
    expect(sanitizeCellValue('+123456789')).toBe(`'+123456789`);
    expect(sanitizeCellValue('-SUM(A1:B10)')).toBe(`'-SUM(A1:B10)`);
    expect(sanitizeCellValue('@import(url)')).toBe(`'@import(url)`);
    expect(sanitizeCellValue('\tDANGEROUS')).toBe(`'\tDANGEROUS`);
  });

  it('escapes quotes and delimiters according to RFC 4180', () => {
    // Contains comma
    expect(sanitizeCellValue('Smith, John')).toBe('"Smith, John"');

    // Contains quotes
    expect(sanitizeCellValue('Apex "Global" Tech')).toBe('"Apex ""Global"" Tech"');

    // Contains newlines
    expect(sanitizeCellValue("Line1\nLine2")).toBe("\"Line1\nLine2\"");
  });

  it('generates well-formed CSV with UTF-8 BOM for Arabic/multilingual compatibility', () => {
    const data = [
      { name: 'Alex Morgan', company: 'Apex Ventures', notes: '=1+1' },
      { name: 'عبدالله محمد', company: 'شركة الرياض', notes: 'عميل استراتيجي' },
    ];

    const csv = generateCSV(data, [
      { key: 'name', header: 'Name' },
      { key: 'company', header: 'Company' },
      { key: 'notes', header: 'Notes' },
    ]);

    // Starts with UTF-8 BOM
    expect(csv.charCodeAt(0)).toBe(0xFEFF);

    // Formula neutralized
    expect(csv).toContain("Alex Morgan,Apex Ventures,'=1+1");

    // Arabic text preserved
    expect(csv).toContain('عبدالله محمد');
    expect(csv).toContain('شركة الرياض');
  });
});
