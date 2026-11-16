const dayMs = 86_400_000;

export function localDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function calendarDay(date: string) {
  return Date.parse(`${date}T00:00:00Z`) / dayMs;
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const day = calendarDay(value);
  return Number.isFinite(day) && new Date(day * dayMs).toISOString().slice(0, 10) === value;
}

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeZone: 'UTC' });
const shortFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const headingFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function formatDate(date: string, style: 'normal' | 'short' | 'heading' = 'normal') {
  const formatter = style === 'short' ? shortFormat : style === 'heading' ? headingFormat : dateFormat;
  return formatter.format(calendarDay(date) * dayMs);
}

export function formatAxisDay(day: number, showYear: boolean) {
  return (showYear ? dateFormat : shortFormat).format(day * dayMs);
}
