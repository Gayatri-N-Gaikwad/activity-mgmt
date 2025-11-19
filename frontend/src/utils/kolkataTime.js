// Utilities to format/parse datetimes specifically in Asia/Kolkata (IST)
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +5:30

// Format an ISO date string (or Date) into a value suitable for <input type="datetime-local">
// using Asia/Kolkata timezone. Returns string like 'YYYY-MM-DDTHH:MM'
export function formatToKolkataInput(value) {
  if (!value) return '';
  const date = (value instanceof Date) ? value : new Date(value);
  if (isNaN(date.getTime())) return '';

  // Use Intl.DateTimeFormat to get parts in Asia/Kolkata timezone
  const df = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  const parts = df.formatToParts(date);
  const map = {};
  parts.forEach(p => { map[p.type] = p.value; });
  // expected parts: day, month, year, hour, minute
  const y = map.year; const m = map.month; const d = map.day; const hh = map.hour; const mm = map.minute;
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

// Parse an input value 'YYYY-MM-DDTHH:MM' which should be interpreted as Asia/Kolkata local time
// and return an ISO string in UTC (suitable to send to backend)
export function parseKolkataInputToISOString(input) {
  if (!input) return null;
  // input expected like '2025-11-18T15:30' or '2025-11-18 15:30'
  const normalized = input.replace(' ', 'T');
  const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]), month = Number(m[2]), day = Number(m[3]), hour = Number(m[4]), minute = Number(m[5]);

  // Get UTC milliseconds corresponding to this IST local datetime
  const utcMs = Date.UTC(y, month - 1, day, hour, minute) - IST_OFFSET_MS;
  const iso = new Date(utcMs).toISOString();
  return iso;
}
