const longDate = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short' });
const monthYear = new Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric' });
const time = new Intl.DateTimeFormat('ro-RO', { hour: '2-digit', minute: '2-digit' });

export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const formatLong = (value) => (toDate(value) ? longDate.format(toDate(value)) : '');
export const formatShort = (value) => (toDate(value) ? shortDate.format(toDate(value)) : '');
export const formatTime = (value) => (toDate(value) ? time.format(toDate(value)) : '');
export const formatMonthYear = (value) => {
  const text = toDate(value) ? monthYear.format(toDate(value)) : '';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** yyyy-mm-dd pentru input[type=date], în fusul orar local. */
export function toInputDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromInputDate(value) {
  const [y, m, d] = String(value || '').split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d, 12) : null;
}

export function daysBetween(from, to = new Date()) {
  const start = toDate(from);
  if (!start) return null;
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function plural(count, one, many) {
  if (count === 1) return `${count} ${one}`;
  const tail = count % 100;
  return count === 0 || (tail >= 1 && tail <= 19) ? `${count} ${many}` : `${count} de ${many}`;
}

export function sameDay(a, b) {
  const x = toDate(a);
  const y = toDate(b);
  return !!x && !!y && x.toDateString() === y.toDateString();
}
