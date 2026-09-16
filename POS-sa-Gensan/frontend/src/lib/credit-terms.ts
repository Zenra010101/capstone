/** Local calendar date (YYYY-MM-DD) for a due date N days from today. */
export function dueDateFromTermsDays(days: number): string {
  const normalized = Math.min(365, Math.max(1, Math.round(days) || 30));
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + normalized);
  return d.toISOString().slice(0, 10);
}

/** Whole days from today (local) to the given due date (YYYY-MM-DD). */
export function termsDaysFromDueDate(dueDate: string): number {
  if (!dueDate) return 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  return Math.min(365, Math.max(1, diff));
}
