/** Full-precision INR amount for payslips/salary figures — unlike formatInr's KPI-card lakh shorthand. */
export function formatInrFull(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Coarse relative-time label ("just now", "5 min ago", …) for activity feeds and notifications. */
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

/** Worked time as "7h 30m" ("–" when unknown). */
export function formatMinutes(minutes: number | undefined | null): string {
  if (minutes == null) return "–";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Clock time of an ISO timestamp, e.g. "09:42 am" ("–" when missing). */
export function formatClock(iso: string | undefined | null): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });
}

/** Compact INR for KPI cards — lakh shorthand above ₹1L (e.g. ₹1.5L). */
export function formatInr(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}
