import { expect, test } from '@playwright/test';
import { TextReader, Uint8ArrayWriter, ZipWriter } from '@zip.js/zip.js';

test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

test('reviews, merges and keeps Apple Health readings on the muscle map after reload', async ({ page }) => {
  const archive = new ZipWriter(new Uint8ArrayWriter(), { useWebWorkers: false });
  await archive.add('apple_health_export/export.xml', new TextReader(`<HealthData>
    <Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" value="73.5" startDate="2024-12-01 08:00:00 +0300"/>
    <Record type="HKQuantityTypeIdentifierHeight" unit="m" value="1.8" startDate="2024-12-01 08:00:00 +0300"/>
    <Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" value="75.5" startDate="2024-11-30 08:00:00 +0300"/>
  </HealthData>`));
  const file = { name: 'export.zip', mimeType: 'application/zip', buffer: Buffer.from(await archive.close()) };

  await page.goto('./#backup');
  const upload = page.getByLabel('Файл Apple Health', { exact: true });
  const section = page.getByRole('region', { name: 'Импорт из Apple Health' });
  await upload.setInputFiles(file);
  await expect(section.getByText(/Новые значения/)).toBeVisible();
  await expect(section.getByText('Новые значения', { exact: true }).locator('..')).toHaveText(/Новые значения\s*3/);
  await expect(section.getByText('Конфликты', { exact: true }).locator('..')).toHaveText(/Конфликты\s*0/);

  await page.getByRole('button', { name: 'Добавить замер', exact: true }).click();
  const entry = page.getByRole('dialog', { name: 'Новый замер' });
  await entry.getByLabel(/Дата/).fill('2024-12-01');
  await entry.getByLabel('Вес, кг').fill('74,25');
  await entry.getByLabel('Талия, см', { exact: true }).fill('86');
  await entry.getByRole('button', { name: 'Сохранить замер' }).click();
  await expect(section.getByText(/Дневник обновился/)).toBeVisible();
  await expect(section.getByText('Новые значения', { exact: true }).locator('..')).toHaveText(/Новые значения\s*2/);
  await expect(section.getByText('Конфликты', { exact: true }).locator('..')).toHaveText(/Конфликты\s*1/);

  await page.setViewportSize({ width: 320, height: 740 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  const confirm = section.getByRole('button', { name: 'Импортировать замеры' });
  await confirm.focus();
  await confirm.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Импорт Apple Health завершён.');

  await upload.setInputFiles(file);
  await expect(section.getByText('Совпадения', { exact: true }).locator('..')).toHaveText(/Совпадения\s*2/);
  await expect(confirm).toHaveCount(0);
  await section.getByRole('button', { name: 'Отменить импорт' }).click();
  await expect(section.getByRole('button', { name: 'Выбрать XML или ZIP' })).toBeFocused();

  await upload.setInputFiles({ name: 'export.xml', mimeType: 'application/xml', buffer: Buffer.from('<HealthData>') });
  await expect(section.getByRole('alert')).toContainText('Не удалось прочитать файл Apple Health');
  await expect(confirm).toHaveCount(0);

  await page.goto('./#muscles');
  await page.reload();
  const readings = page.getByRole('region', { name: 'Основные замеры' });
  await expect(readings).toContainText(/74,25\s*кг/);
  await expect(readings).toContainText(/180\s*см/);
  await expect(readings).toContainText(/86\s*см/);
});
