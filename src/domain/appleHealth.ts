import { sortEntries, type Entry } from './journal';

export const appleHealthMetrics = ['weight', 'height'] as const;
export type AppleHealthMetric = typeof appleHealthMetrics[number];
export type AppleHealthMeasurement = {
  date: string;
  values: Partial<Record<AppleHealthMetric, number>>;
};

export function mergeAppleHealthMeasurements(entries: Entry[], measurements: readonly AppleHealthMeasurement[]) {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]));
  const counts = { added: 0, matched: 0, conflicts: 0 };
  for (const { date, values } of measurements) {
    const existing = byDate.get(date);
    const additions: Entry['values'] = {};
    for (const metric of appleHealthMetrics) {
      const value = values[metric];
      if (value === undefined) continue;
      const current = existing?.values[metric];
      if (current === undefined) {
        additions[metric] = value;
        counts.added++;
      } else if (current === value) {
        counts.matched++;
      } else {
        counts.conflicts++;
      }
    }
    if (Object.keys(additions).length) {
      byDate.set(date, { date, values: { ...existing?.values, ...additions } });
    }
  }
  return { entries: counts.added ? sortEntries([...byDate.values()]) : entries, counts };
}
