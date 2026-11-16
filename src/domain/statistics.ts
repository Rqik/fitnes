import { calendarDay, localDate } from './dates';
import { isAdultGroup, sortEntries, type Entry, type Goal, type Profile } from './journal';
import { metricKeys, type SeriesMetric } from './metrics';

export type Point = { date: string; value: number; bmiAtWaist?: number };
export type Series = Map<SeriesMetric, Point[]>;
export type Period = 30 | 90 | 'all';

export function buildSeries(entries: readonly Entry[]): Series {
  const result: Series = new Map();
  let height: number | undefined;
  let weight: number | undefined;

  function add(key: SeriesMetric, point: Point) {
    const points = result.get(key);
    if (points) points.push(point);
    else result.set(key, [point]);
  }

  for (const { date, values } of sortEntries(entries)) {
    for (const metric of metricKeys) {
      const value = values[metric];
      if (value !== undefined) add(metric, { date, value });
    }
    height = values.height ?? height;
    weight = values.weight ?? weight;
    if (height === undefined) continue;

    const bmi = weight === undefined ? undefined : Number((weight / (height / 100) ** 2).toFixed(10));
    if (values.weight !== undefined && bmi !== undefined) add('bmi', { date, value: bmi });
    if (values.waist !== undefined) {
      const ratio = Number((values.waist / height).toFixed(10));
      add('waistRatio', { date, value: ratio, bmiAtWaist: bmi });
    }
  }
  return result;
}

export function filterPeriod(points: readonly Point[], period: Period, today = localDate()) {
  if (period === 'all') return points;
  const end = calendarDay(today);
  const start = end - period + 1;
  return points.filter(({ date }) => {
    const day = calendarDay(date);
    return day >= start && day <= end;
  });
}

export function periodChange(points: readonly Point[]) {
  const first = points[0];
  const last = points.at(-1);
  return first && last && points.length >= 2 ? last.value - first.value : undefined;
}

export function bmiCategory(bmi: number, ageGroup: Profile['ageGroup']) {
  if (!isAdultGroup(ageGroup)) return undefined;
  if (bmi < 18.5) return 'Ниже справочного диапазона';
  if (bmi < 25) return 'В справочном диапазоне';
  if (bmi < 30) return 'Избыточная масса тела по ИМТ';
  if (bmi < 35) return 'Ожирение I степени по ИМТ';
  if (bmi < 40) return 'Ожирение II степени по ИМТ';
  return 'Ожирение III степени по ИМТ';
}

export function waistCategory(point: Point, ageGroup: Profile['ageGroup']) {
  if (!isAdultGroup(ageGroup) || point.bmiAtWaist === undefined || point.bmiAtWaist >= 35) return undefined;
  if (point.value < 0.4) return 'Ниже диапазонов NICE';
  if (point.value < 0.5) return 'В справочном диапазоне';
  if (point.value < 0.6) return 'Повышенное отношение';
  return 'Высокое отношение';
}

export function distanceToGoal(goal: Goal, value: number) {
  const min = goal.kind === 'range' ? goal.min : goal.kind === 'min' ? goal.target : -Infinity;
  const max = goal.kind === 'range' ? goal.max : goal.kind === 'max' ? goal.target : Infinity;
  if (value < min) return Number((min - value).toFixed(2));
  if (value > max) return Number((max - value).toFixed(2));
  return 0;
}

export function goalTrend(goal: Goal, points: readonly Point[]) {
  const last = points.at(-1);
  const previous = points.at(-2);
  if (!last || !previous) return undefined;
  const before = Math.abs(distanceToGoal(goal, previous.value));
  const after = Math.abs(distanceToGoal(goal, last.value));
  return Math.sign(before - after);
}
