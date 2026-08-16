// Util CSV bersama (dipakai route ekspor backend).

export function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",;\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
