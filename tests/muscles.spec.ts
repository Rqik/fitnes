import { expect, test, type Page } from '@playwright/test';

test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

async function expectNoHorizontalScroll(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  })).toBeLessThanOrEqual(0);
}

test('measures a zone on mobile, updates its goal color and keeps other measurements', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('./');
  await page.getByRole('button', { name: 'Добавить замер', exact: true }).click();
  const entry = page.getByRole('dialog', { name: 'Новый замер' });
  await entry.getByLabel(/Дата/).fill('2024-12-11');
  await entry.getByLabel('Вес, кг').fill('72,25');
  await entry.getByRole('button', { name: 'Сохранить замер' }).click();
  await expect(entry).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  const menu = page.getByRole('button', { name: 'Меню', exact: true });
  await menu.tap();
  await page.getByRole('link', { name: 'Карта мышц', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Карта мышц', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Карта мышц', exact: true })).toBeHidden();
  await expectNoHorizontalScroll(page);

  const shoulders = page.locator('.muscle-region[data-metric="shoulders"]');
  const shoulderShape = shoulders.locator('.muscle-region-shape').first();
  const chest = page.locator('.muscle-region[data-metric="chest"]');
  await chest.locator('.muscle-region-shape').first().tap();
  await expect(chest).toHaveAttribute('data-selected', 'true');
  await shoulderShape.tap();
  await expect(shoulders).toHaveAttribute('data-selected', 'true');

  const status = page.locator('[data-zone-status]');
  const add = page.getByRole('button', { name: 'Добавить замер', exact: true });
  await expect(status).toHaveText('Нет замера');

  async function saveShoulders(date: string, value: string, previousValue = '') {
    await add.tap();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Дата/).fill(date);
    const field = dialog.getByLabel('Плечевой пояс, см');
    await expect(field).toHaveValue(previousValue);
    await field.fill(value);
    await dialog.getByRole('button', { name: 'Сохранить замер' }).tap();
    await expect(dialog).toBeHidden();
  }

  await saveShoulders('2024-12-10', '110');
  await expect(status).toHaveText('Без цели');

  await page.getByRole('button', { name: 'Задать цель', exact: true }).tap();
  const goal = page.getByRole('dialog');
  await goal.getByLabel('Целевое значение, см').fill('116');
  await goal.getByRole('button', { name: 'Сохранить цель' }).tap();
  await expect(goal).toBeHidden();
  await expect(status).toHaveText('Вне цели');
  await expect(shoulders).toHaveAttribute('data-status', 'outside');

  await saveShoulders('2024-12-11', '112,5');
  await expect(page.getByText('+2,5 см', { exact: true })).toBeVisible();
  const outsideFill = await shoulderShape.evaluate((shape) => getComputedStyle(shape).fill);

  await saveShoulders('2024-12-11', '116', '112,5');
  await expect(status).toHaveText('Цель достигнута');
  await expect(shoulders).toHaveAttribute('data-status', 'reached');
  await expect(shoulderShape).not.toHaveCSS('fill', outsideFill);

  await page.reload();
  await expect(status).toHaveText('Цель достигнута');
  await menu.tap();
  await page.getByRole('link', { name: 'История', exact: true }).tap();
  const table = page.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(3);
  await expect(table.getByRole('row').filter({ hasText: '72,25 кг' })).toContainText('116 см');
});

test('selects a rear zone by keyboard on a 320 px screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('./');
  await page.getByRole('button', { name: 'Меню', exact: true }).tap();
  await page.getByRole('link', { name: 'Карта мышц', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Плечи', exact: true })).toBeVisible();

  const hips = page.locator('.muscle-region[data-metric="hips"]');
  await expect(hips).toHaveCount(0);
  await page.getByText('Сзади', { exact: true }).tap();
  await expect(hips).toBeVisible();

  await page.getByRole('button', { name: 'Список зон', exact: true }).press('Enter');
  await page.getByRole('button', { name: /^Ягодицы(?:\s|$)/u }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Ягодицы', exact: true })).toBeVisible();
  await expect(hips).toHaveAttribute('data-selected', 'true');
  await expectNoHorizontalScroll(page);

  const add = page.getByRole('button', { name: 'Добавить замер', exact: true });
  await add.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(add).toBeFocused();
});
