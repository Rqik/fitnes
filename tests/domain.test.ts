import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyJournal, parseJournal, type Goal } from '../src/domain/journal';
import { formatChange, parseMetricValue } from '../src/domain/metrics';
import { getReference } from '../src/domain/nhanes';
import { bmiCategory, buildSeries, distanceToGoal, filterPeriod, goalTrend, periodChange, waistCategory } from '../src/domain/statistics';

test('builds chronological series without using a future height or substituting missing values', () => {
  const series = buildSeries([
    { date: '2026-02-03', values: { waist: 90, waistNhanes: 94 } },
    { date: '2026-01-01', values: { weight: 75 } },
    { date: '2026-02-02', values: { weight: 81, muscleShare: 35 } },
    { date: '2026-01-26', values: { height: 180, muscleMass: 40 } },
    { date: '2026-02-04', values: { height: 185 } },
  ]);
  assert.deepEqual(series.get('bmi'), [{ date: '2026-02-02', value: 25 }]);
  assert.deepEqual(series.get('waistRatio'), [{ date: '2026-02-03', value: 0.5, bmiAtWaist: 25 }]);
  assert.deepEqual(series.get('muscleMass')?.map((point) => point.value), [40]);
  assert.equal(periodChange(filterPeriod(series.get('weight') ?? [], 90, '2026-02-04')), 6);
  assert.equal(periodChange(filterPeriod(series.get('weight') ?? [], 30, '2026-02-04')), undefined);
  assert.equal(formatChange(2, 'muscleShare'), '+2 п. п.');
});

test('applies CDC and NICE thresholds and eligibility', () => {
  assert.equal(bmiCategory(18.49, '20–29'), 'Ниже справочного диапазона');
  assert.equal(bmiCategory(18.5, '20–29'), 'В справочном диапазоне');
  assert.equal(bmiCategory(25, '20–29'), 'Избыточная масса тела по ИМТ');
  assert.match(bmiCategory(30, '20–29') ?? '', / I степени/);
  assert.match(bmiCategory(35, '20–29') ?? '', / II степени/);
  assert.match(bmiCategory(40, '20–29') ?? '', / III степени/);
  assert.equal(bmiCategory(23, 'under20'), undefined);
  const point = { date: '2026-01-01', value: 0.5, bmiAtWaist: 34.99 };
  assert.equal(waistCategory({ ...point, value: 0.399 }, '30–39'), 'Ниже диапазонов NICE');
  assert.equal(waistCategory({ ...point, value: 0.4 }, '30–39'), 'В справочном диапазоне');
  assert.equal(waistCategory(point, '30–39'), 'Повышенное отношение');
  assert.equal(waistCategory({ ...point, value: 0.6 }, '30–39'), 'Высокое отношение');
  assert.equal(waistCategory({ ...point, bmiAtWaist: 35 }, '30–39'), undefined);
  assert.equal(waistCategory({ ...point, bmiAtWaist: undefined }, '30–39'), undefined);
});

test('selects the published NHANES age and sex group', () => {
  assert.deepEqual(getReference('weight', { ageGroup: '20–29', sex: 'male' }), {
    sample: 287, mean: 86.8, p25: 72.2, p50: 83.7, p75: 98.2,
  });
  assert.deepEqual(getReference('waistNhanes', { ageGroup: '80+', sex: 'female' }), {
    sample: 162, mean: 96.5, p25: 88.8, p50: 94.4, p75: 107.2,
  });
  assert.equal(getReference('bmi', { ageGroup: 'under20', sex: 'female' }), undefined);
  assert.equal(getReference('upperArm', { ageGroup: '40–49', sex: null }), undefined);
});

test('computes signed distance and direction with thresholds and inclusive ranges', () => {
  const range: Goal = { kind: 'range', min: 70, max: 75 };
  assert.equal(distanceToGoal(range, 68), 2);
  assert.equal(distanceToGoal(range, 70), 0);
  assert.equal(distanceToGoal(range, 75), 0);
  assert.equal(distanceToGoal(range, 75.01), -0.01);
  assert.equal(distanceToGoal({ kind: 'min', target: 40 }, 42), 0);
  assert.equal(distanceToGoal({ kind: 'max', target: 82 }, 81), 0);
  const points = [{ date: '2026-01-01', value: 78 }, { date: '2026-01-05', value: 76 }];
  assert.equal(goalTrend(range, points), 1);
  assert.equal(goalTrend(range, [...points].reverse()), -1);
});

test('validates input and rejects invalid backups before restoration', () => {
  assert.equal(parseMetricValue('weight', '72,25'), 72.25);
  assert.equal(parseMetricValue('weight', '72.25'), 72.25);
  assert.equal(parseMetricValue('weight', ' '), undefined);
  assert.equal(parseMetricValue('height', '0'), null);
  assert.equal(parseMetricValue('muscleShare', '100,01'), null);
  const journal = emptyJournal();
  const entry = { date: '2026-02-01', values: { weight: 72.25 } };
  assert.deepEqual(parseJournal({ ...journal, entries: [entry] }).entries, [entry]);
  assert.throws(() => parseJournal({ ...journal, entries: [entry, entry] }), /повторяющиеся даты/);
  assert.throws(() => parseJournal({ ...journal, entries: [{ ...entry, date: '2026-02-30' }] }), /неверные замеры/);
  assert.throws(() => parseJournal({ ...journal, goals: { weight: { kind: 'range', min: 75, max: 70 } } }), /неверные цели/);
  assert.throws(() => parseJournal({ ...journal, schemaVersion: 2 }), /не поддерживается/);
});
