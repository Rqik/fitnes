import { BlobReader, ZipReader } from '@zip.js/zip.js';
import { SaxesParser } from 'saxes';
import { appleHealthMetrics, type AppleHealthMeasurement, type AppleHealthMetric } from '../domain/appleHealth';
import { isCalendarDate } from '../domain/dates';
import { isMetricValue } from '../domain/metrics';

type TimedValue = { value: number; timestamp: number };
type DayMeasurements = Partial<Record<AppleHealthMetric, TimedValue>>;

const conversionFactors: Record<AppleHealthMetric, Readonly<Record<string, number>>> = {
  weight: { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.028349523125 },
  height: { cm: 1, m: 100, mm: 0.1, in: 2.54, ft: 30.48 },
};

const startDatePattern = /^(\d{4}-\d{2}-\d{2})[ T]((?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?)\s*(Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d)$/;

class AppleHealthFileError extends Error {}

function readStartDate(input: string | undefined) {
  const match = input && startDatePattern.exec(input);
  if (!match) return undefined;
  const [, date, time, zone] = match;
  if (!isCalendarDate(date) || time === undefined || zone === undefined) return undefined;
  const offset = zone.replace(/^([+-]\d{2})(\d{2})$/, '$1:$2');
  const timestamp = Date.parse(`${date}T${time}${offset}`);
  return Number.isFinite(timestamp) ? { date, timestamp } : undefined;
}

function convertMeasurement(metric: AppleHealthMetric, unit: string | undefined, value: string | undefined) {
  const factor = unit ? conversionFactors[metric][unit] : undefined;
  if (typeof factor !== 'number' || !value || !/^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value)) return undefined;
  const converted = Number((Number(value) * factor).toFixed(2));
  return isMetricValue(metric, converted) ? converted : undefined;
}

function createHealthReader() {
  const parser = new SaxesParser({ xmlns: false });
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const days = new Map<string, DayMeasurements>();
  let depth = 0;

  parser.on('opentag', ({ name, attributes }) => {
    depth++;
    if (depth === 1 && name !== 'HealthData') {
      throw new AppleHealthFileError('Выберите XML или ZIP из приложения «Здоровье» на iPhone.');
    }
    if (depth !== 2 || name !== 'Record') return;

    let metric: AppleHealthMetric;
    if (attributes.type === 'HKQuantityTypeIdentifierBodyMass') metric = 'weight';
    else if (attributes.type === 'HKQuantityTypeIdentifierHeight') metric = 'height';
    else return;

    const value = convertMeasurement(metric, attributes.unit, attributes.value);
    const start = readStartDate(attributes.startDate);
    if (value === undefined || !start) return;
    const { date, timestamp } = start;
    const measurements = days.get(date) ?? {};
    const previous = measurements[metric];
    if (previous && previous.timestamp > timestamp) return;
    measurements[metric] = { value, timestamp };
    days.set(date, measurements);
  });

  parser.on('closetag', () => { depth--; });

  return {
    writable: new WritableStream<Uint8Array>({
      write(chunk) {
        parser.write(decoder.decode(chunk, { stream: true }));
      },
    }),
    finish() {
      parser.write(decoder.decode()).close();
      const measurements: AppleHealthMeasurement[] = [];
      for (const [date, day] of days) {
        const values: AppleHealthMeasurement['values'] = {};
        for (const metric of appleHealthMetrics) {
          const recorded = day[metric];
          if (recorded) values[metric] = recorded.value;
        }
        measurements.push({ date, values });
      }
      return measurements;
    },
  };
}

async function readArchive(file: Blob, destination: WritableStream<Uint8Array>) {
  const archive = new ZipReader(new BlobReader(file), { useWebWorkers: false });
  try {
    const entries = await archive.getEntries();
    const exports = entries.filter((entry) => !entry.directory && entry.filename.split('/').at(-1) === 'export.xml');
    const [entry] = exports;
    if (!entry || entry.directory || exports.length !== 1) {
      throw new AppleHealthFileError('В архиве Apple Health должен быть один файл export.xml.');
    }
    await entry.getData(destination, { checkCrc32: true });
  } finally {
    await archive.close();
  }
}

export async function readAppleHealthFile(file: Blob): Promise<AppleHealthMeasurement[]> {
  try {
    const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const isZip = header[0] === 0x50 && header[1] === 0x4b;
    const parser = createHealthReader();
    if (isZip) await readArchive(file, parser.writable);
    else await file.stream().pipeTo(parser.writable);
    return parser.finish();
  } catch (error) {
    if (error instanceof AppleHealthFileError) throw error;
    throw new Error('Не удалось прочитать файл Apple Health. Проверьте архив или экспортируйте данные заново.');
  }
}
