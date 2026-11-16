const definitions = {
  weight: { label: 'Вес', unit: 'кг', group: 'body' },
  height: { label: 'Рост', unit: 'см', group: 'body' },
  muscleMass: { label: 'Мышечная масса', unit: 'кг', group: 'body' },
  muscleShare: { label: 'Доля мышц', unit: '%', group: 'body' },
  shoulders: { label: 'Плечевой пояс', unit: 'см', group: 'tape' },
  chest: { label: 'Грудь', unit: 'см', group: 'tape' },
  waist: { label: 'Талия', unit: 'см', group: 'tape', hint: 'Посередине между нижними рёбрами и верхом тазовой кости.' },
  hips: { label: 'Бёдра', unit: 'см', group: 'tape', hint: 'По самым выступающим точкам ягодиц.' },
  upperArm: { label: 'Плечо', unit: 'см', group: 'tape', hint: 'Посередине между плечевым и локтевым суставом, правая рука расслаблена.' },
  forearm: { label: 'Предплечье', unit: 'см', group: 'tape' },
  thigh: { label: 'Бедро', unit: 'см', group: 'tape' },
  calf: { label: 'Голень', unit: 'см', group: 'tape' },
  waistNhanes: { label: 'Талия NHANES', unit: 'см', group: 'reference', hint: 'По верхнему краю правой подвздошной кости. Для сравнения с выборкой США.' },
} as const;

export type Metric = keyof typeof definitions;
export type SeriesMetric = Metric | 'bmi' | 'waistRatio';
export type Values = Partial<Record<Metric, number>>;
export type Focus = 'muscle' | 'loss' | 'maintenance';

type MetricDefinition = {
  label: string;
  unit: string;
  group: 'body' | 'tape' | 'reference';
  hint?: string;
};

export const metrics: Record<Metric, MetricDefinition> = definitions;
export const metricKeys = Object.keys(definitions) as Metric[];
export const seriesMetrics: SeriesMetric[] = [...metricKeys, 'bmi', 'waistRatio'];
export const seriesLabels: Record<SeriesMetric, { label: string; unit: string }> = {
  ...definitions,
  bmi: { label: 'ИМТ', unit: 'кг/м²' },
  waistRatio: { label: 'Талия / рост', unit: '' },
};

export const focusOptions: Record<Focus, { label: string; metrics: readonly Metric[] }> = {
  muscle: { label: 'Набор мышц', metrics: ['muscleMass', 'muscleShare', 'weight', 'upperArm'] },
  loss: { label: 'Снижение веса', metrics: ['weight', 'waist'] },
  maintenance: { label: 'Поддержание', metrics: ['weight', 'waist'] },
};

export function isMetric(value: string): value is Metric {
  return Object.hasOwn(metrics, value);
}

export function isMetricValue(metric: Metric, value: unknown): value is number {
  const max = metric === 'muscleShare' ? 100 : 9999.99;
  return typeof value === 'number'
    && value > 0
    && value <= max
    && Number(value.toFixed(2)) === value;
}

export function parseMetricValue(metric: Metric, input: string) {
  const text = input.trim();
  if (text === '') return undefined;
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(text)) return null;
  const value = Number(text.replace(',', '.'));
  return isMetricValue(metric, value) ? value : null;
}

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const ratioFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 });

export function formatValue(value: number, metric?: SeriesMetric) {
  return (metric === 'waistRatio' ? ratioFormat : numberFormat).format(value);
}

export function formatChange(value: number, metric: SeriesMetric) {
  const unit = metric === 'muscleShare' ? 'п. п.' : seriesLabels[metric].unit;
  const magnitude = formatValue(Math.abs(value), metric);
  const sign = Number(magnitude.replace(',', '.')) === 0 ? '' : value < 0 ? '−' : '+';
  return `${sign}${magnitude}${unit ? ` ${unit}` : ''}`;
}
