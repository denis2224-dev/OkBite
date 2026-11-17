import { ro } from '../../copy/ro';

const pad = (n: number) => String(n).padStart(2, '0');
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** A short, local "when" for a history row: "Azi, 18:40", "Ieri", a weekday within the last week, else 10.11.2026. */
export function savedWhen(savedAt: string, now: Date = new Date()): string {
  const saved = new Date(savedAt);
  const days = Math.round((dayStart(now) - dayStart(saved)) / 86_400_000);
  if (days <= 0) return ro.history.when.today(`${pad(saved.getHours())}:${pad(saved.getMinutes())}`);
  if (days === 1) return ro.history.when.yesterday;
  if (days < 7) return ro.history.when.weekdays[saved.getDay()]!;
  return `${pad(saved.getDate())}.${pad(saved.getMonth() + 1)}.${saved.getFullYear()}`;
}
