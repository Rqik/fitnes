import { isCalendarDate } from './dates';
import { focusOptions, isMetric, isMetricValue, type Focus, type Metric, type Values } from './metrics';

export const ageGroups = ['20–29', '30–39', '40–49', '50–59', '60–69', '70–79', '80+'] as const;
export type AdultAgeGroup = (typeof ageGroups)[number];
export type Sex = 'male' | 'female';
export type Profile = {
  ageGroup: AdultAgeGroup | 'under20' | null;
  sex: Sex | null;
  focus: Focus | null;
};
export type Entry = { date: string; values: Values };
export type Goal = { kind: 'min' | 'max'; target: number } | { kind: 'range'; min: number; max: number };
export type Journal = {
  schemaVersion: 1;
  entries: Entry[];
  profile: Profile;
  goals: Partial<Record<Metric, Goal>>;
};

export function emptyJournal(): Journal {
  return { schemaVersion: 1, entries: [], profile: { ageGroup: null, sex: null, focus: null }, goals: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isAdultGroup(value: unknown): value is AdultAgeGroup {
  return ageGroups.some((group) => group === value);
}

export function parseProfile(value: unknown): Profile | null {
  if (!isRecord(value)) return null;
  const { ageGroup, sex, focus } = value;
  if (ageGroup !== null && ageGroup !== 'under20' && !isAdultGroup(ageGroup)) return null;
  if (sex !== null && sex !== 'male' && sex !== 'female') return null;
  if (focus !== null && (typeof focus !== 'string' || !Object.hasOwn(focusOptions, focus))) return null;
  return { ageGroup, sex, focus: focus as Profile['focus'] };
}

function parseEntry(value: unknown): Entry | null {
  if (!isRecord(value) || !isCalendarDate(value.date) || !isRecord(value.values)) return null;
  const values: Values = {};
  for (const [key, number] of Object.entries(value.values)) {
    if (!isMetric(key) || !isMetricValue(key, number)) return null;
    values[key] = number;
  }
  if (Object.keys(values).length === 0) return null;
  return { date: value.date, values };
}

export function parseGoal(metric: Metric, value: unknown): Goal | null {
  if (!isRecord(value)) return null;
  const { kind, target, min, max } = value;
  if (kind === 'range' && isMetricValue(metric, min) && isMetricValue(metric, max) && min <= max) {
    return { kind, min, max };
  }
  if ((kind === 'min' || kind === 'max') && isMetricValue(metric, target)) return { kind, target };
  return null;
}

export function parseJournal(value: unknown): Journal {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.entries) || !isRecord(value.goals)) {
    throw new Error('Формат резервной копии не поддерживается.');
  }
  const profile = parseProfile(value.profile);
  if (!profile) throw new Error('Проверьте данные профиля в резервной копии.');

  const entries: Entry[] = [];
  const dates = new Set<string>();
  for (const item of value.entries) {
    const entry = parseEntry(item);
    if (!entry || dates.has(entry.date)) throw new Error('В резервной копии есть неверные замеры или повторяющиеся даты.');
    dates.add(entry.date);
    entries.push(entry);
  }

  const goals: Journal['goals'] = {};
  for (const [key, item] of Object.entries(value.goals)) {
    if (!isMetric(key)) throw new Error('В резервной копии есть неизвестный показатель.');
    const goal = parseGoal(key, item);
    if (!goal) throw new Error('В резервной копии есть неверные цели.');
    goals[key] = goal;
  }

  return { schemaVersion: 1, profile, entries: sortEntries(entries), goals };
}

export function sortEntries(entries: readonly Entry[]) {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

export function sameEntry(a: Entry | undefined, b: Entry) {
  if (!a || a.date !== b.date) return false;
  const keys = Object.keys(b.values) as Metric[];
  return keys.length === Object.keys(a.values).length && keys.every((key) => a.values[key] === b.values[key]);
}
