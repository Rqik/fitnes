import assert from 'node:assert/strict';
import test from 'node:test';
import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import { mergeAppleHealthMeasurements } from '../src/domain/appleHealth';
import { readAppleHealthFile } from '../src/import/readAppleHealthFile';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE HealthData [<!ELEMENT HealthData (Record*)>]>
<HealthData>
  <Record type="HKQuantityTypeIdentifierBodyMass" unit="lb" value="160" startDate="2024-12-01 23:45:00 -0800"/>
  <Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" value="67" startDate="2024-12-01 20:00:00 +0300"/>
  <Record type="HKQuantityTypeIdentifierHeight" unit="m" value="1.8" startDate="2024-12-01 12:00:00 +0300"/>
  <Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" value="71.55" startDate="2024-12-02 00:45:00 +0300"/>
  <Record type="HKQuantityTypeIdentifierLeanBodyMass" unit="kg" value="60" startDate="2024-12-03 00:45:00 +0300"/>
  <Record type="HKQuantityTypeIdentifierHeight" unit="kg" value="180" startDate="2024-12-03 00:45:00 +0300"/>
  <Record type="HKQuantityTypeIdentifierHeight" unit="cm" value="180" startDate="2024-02-31 00:45:00 +0300"/>
</HealthData>`;

test('reads Apple Health XML and ZIP in calendar dates and keeps the latest value per metric', async () => {
  const archive = new ZipWriter(new BlobWriter(), { useWebWorkers: false });
  await archive.add('apple_health_export/workout-routes/route.gpx', new TextReader('ignored'));
  await archive.add('apple_health_export/export_cda.xml', new TextReader('ignored'));
  await archive.add('apple_health_export/export.xml', new TextReader(xml));
  const zipped = await archive.close();
  const expected = [
    { date: '2024-12-01', values: { weight: 72.57, height: 180 } },
    { date: '2024-12-02', values: { weight: 71.55 } },
  ];
  assert.deepEqual(await readAppleHealthFile(new Blob([xml])), expected);
  assert.deepEqual(await readAppleHealthFile(zipped), expected);
});

test('merges only missing values and treats repeated Apple Health imports as matches', () => {
  const original = [{ date: '2024-12-01', values: { weight: 74.25, waist: 86 } }];
  const measurements = [
    { date: '2024-12-01', values: { weight: 72.57, height: 180 } },
    { date: '2024-12-02', values: { weight: 71.55 } },
  ];
  const first = mergeAppleHealthMeasurements(original, measurements);
  assert.deepEqual(first, {
    entries: [
      { date: '2024-12-01', values: { weight: 74.25, waist: 86, height: 180 } },
      { date: '2024-12-02', values: { weight: 71.55 } },
    ],
    counts: { added: 2, matched: 0, conflicts: 1 },
  });
  assert.deepEqual(original, [{ date: '2024-12-01', values: { weight: 74.25, waist: 86 } }]);

  const repeated = mergeAppleHealthMeasurements(first.entries, measurements);
  assert.equal(repeated.entries, first.entries);
  assert.deepEqual(repeated.counts, { added: 0, matched: 2, conflicts: 1 });
});

test('fails Apple Health files with malformed XML or a damaged ZIP', async () => {
  await assert.rejects(
    readAppleHealthFile(new Blob([xml.replace('</HealthData>', '')])),
    /Не удалось прочитать файл Apple Health/,
  );
  await assert.rejects(
    readAppleHealthFile(new Blob([Uint8Array.of(0x50, 0x4b, 3, 4)])),
    /Не удалось прочитать файл Apple Health/,
  );
});
