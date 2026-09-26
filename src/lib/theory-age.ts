export const THEORY_START_DATE = Date.UTC(2024, 4, 26);

export function getElapsedCalendarTime(startTimestamp: number, endTimestamp: number) {
  const start = new Date(startTimestamp);
  const end = new Date(Math.max(startTimestamp, endTimestamp));
  let years = end.getUTCFullYear() - start.getUTCFullYear();
  let cursor = new Date(startTimestamp);
  cursor.setUTCFullYear(start.getUTCFullYear() + years);
  if (cursor.getTime() > end.getTime()) {
    years -= 1;
    cursor = new Date(startTimestamp);
    cursor.setUTCFullYear(start.getUTCFullYear() + years);
  }

  let months = (end.getUTCFullYear() - cursor.getUTCFullYear()) * 12
    + end.getUTCMonth() - cursor.getUTCMonth();
  const monthCursor = new Date(cursor);
  monthCursor.setUTCMonth(cursor.getUTCMonth() + months);
  if (monthCursor.getTime() > end.getTime()) {
    months -= 1;
    monthCursor.setTime(cursor.getTime());
    monthCursor.setUTCMonth(cursor.getUTCMonth() + months);
  }

  let remainingSeconds = Math.floor((end.getTime() - monthCursor.getTime()) / 1000);
  const days = Math.floor(remainingSeconds / 86_400);
  remainingSeconds %= 86_400;
  const hours = Math.floor(remainingSeconds / 3_600);
  remainingSeconds %= 3_600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return { years, months, days, hours, minutes, seconds };
}

export function getTheoryAgeInDays(): number {
  const today = new Date();
  const todayAtMidnight = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((todayAtMidnight - THEORY_START_DATE) / 86_400_000));
}
