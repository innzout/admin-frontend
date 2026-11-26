/**
 * Calendar dates as YYYY-MM-DD in the viewer's local time zone.
 *
 * Never use `date.toISOString().slice(0, 10)` for a calendar day: that is the
 * UTC date, which in India is still "yesterday" until 05:30, and turns a local
 * midnight into the previous day.
 */
export function localIsoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** First day of the month containing d, as YYYY-MM-DD. */
export function monthStartIso(d: Date = new Date()): string {
  return localIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}
