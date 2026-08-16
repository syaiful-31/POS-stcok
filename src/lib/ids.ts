// Pembuat ID & nomor dokumen. Hanya dipakai di sisi klien.

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function yyyymmdd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function nextOrderNumber(seq: number, date = new Date()): string {
  return `SO-${yyyymmdd(date)}-${String(seq).padStart(4, "0")}`;
}

export function nextPurchaseNumber(seq: number, date = new Date()): string {
  return `PO-${yyyymmdd(date)}-${String(seq).padStart(4, "0")}`;
}
