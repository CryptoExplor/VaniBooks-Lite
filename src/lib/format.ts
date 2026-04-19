// Currency and date formatters — display only, never used for calculations

export function formatPaise(paise: bigint): string {
  const whole = paise / 100n;
  const frac = paise % 100n;
  // Format whole part with Indian number system (lakhs/crores)
  const wholeStr = Number(whole).toLocaleString("en-IN");
  return `₹${wholeStr}.${String(frac).padStart(2, "0")}`;
}

export function formatRupees(rupees: number): string {
  return rupees.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });
}

export function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
