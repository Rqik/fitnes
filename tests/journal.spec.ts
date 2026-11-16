import { expect, test } from '@playwright/test';

test('keeps saved measurements across reload and safely restores a backup on a Pages path', async ({ page }) => {
  await page.goto('./');
  const add = page.getByRole('button', { name: 'Добавить замер' });
  await expect(page.getByRole('heading', { name: 'Твои показатели' })).toBeVisible();
  await expect(page.getByText('Здесь появится график')).toBeVisible();
  await add.click();
  const entry = page.getByRole('dialog', { name: 'Новый замер' });
  await expect(entry.getByLabel(/Дата/)).toBeFocused();
  await entry.getByLabel(/Дата/).fill('2024-12-01');
  await entry.getByLabel('Вес, кг').fill('72,25');
  await entry.getByLabel('Рост, см').fill('180');
  await entry.getByRole('button', { name: 'Сохранить замер' }).click();
  await expect(page.getByRole('status')).toHaveText('Замер сохранён.');
  await expect(page.locator('canvas')).toBeVisible();

  await page.reload();
  await page.getByRole('link', { name: 'История', exact: true }).click();
  await expect(page.getByRole('table')).toContainText('72,25 кг');
  await page.getByRole('button', { name: /Редактировать замер/ }).click();
  const edit = page.getByRole('dialog', { name: 'Редактировать замер' });
  await expect(edit.getByLabel('Вес, кг')).toHaveValue('72,25');
  await edit.getByLabel('Вес, кг').fill('73.5');
  await edit.getByRole('button', { name: 'Сохранить замер' }).click();
  await expect(page.getByRole('table')).toContainText('73,5 кг');

  await page.getByRole('link', { name: 'Мои данные' }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать копию' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^fitnes-.*\.json$/);
  const backupPath = await download.path();
  if (!backupPath) throw new Error('Missing downloaded backup');

  await page.getByRole('link', { name: 'История', exact: true }).click();
  await page.getByRole('button', { name: /Удалить замер за/ }).click();
  const confirmDelete = page.getByRole('dialog', { name: 'Удалить замер?' });
  await expect(confirmDelete.getByRole('button', { name: 'Отмена' })).toBeFocused();
  await confirmDelete.getByRole('button', { name: 'Удалить замер' }).click();
  await expect(page.getByRole('heading', { name: 'Замеров ещё нет' })).toBeVisible();

  await page.getByRole('link', { name: 'Мои данные' }).click();
  const upload = page.locator('input[type=file]');
  await upload.setInputFiles(backupPath);
  const confirmRestore = page.getByRole('dialog', { name: 'Восстановить из копии?' });
  await confirmRestore.getByRole('button', { name: 'Восстановить дневник' }).click();
  await expect(page.getByRole('status')).toHaveText('Дневник восстановлен из копии.');

  await upload.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(page.getByRole('alert')).toHaveText('Файл не удалось прочитать как JSON.');
  await expect(confirmRestore).toHaveCount(0);
  await page.getByRole('link', { name: 'История', exact: true }).click();
  await expect(page.getByRole('table')).toContainText('73,5 кг');
});
