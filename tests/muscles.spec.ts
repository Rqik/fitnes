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
  await expect(page.getByRole('region', { name: 'Основные замеры' })).toContainText('72,25 кг');

  const shoulders = page.locator('svg [data-metric="shoulders"]');
  const shoulderShape = shoulders.locator('path').first();
  const chest = page.locator('svg [data-metric="chest"]');
  await chest.locator('path').first().tap();
  await expect(chest).toHaveAttribute('data-selected', 'true');
  const shoulderPoint = await shoulderShape.evaluate((path: SVGPathElement) => {
    const bounds = path.getBBox();
    const center = new DOMPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    if (!path.isPointInFill(center)) throw new Error('The shoulder path has no fill at its center');
    const point = center.matrixTransform(path.getScreenCTM() ?? undefined);
    return { x: point.x, y: point.y };
  });
  await page.touchscreen.tap(shoulderPoint.x, shoulderPoint.y);
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

  const hips = page.locator('svg [data-metric="hips"]');
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

  await page.getByText('Спереди', { exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Плечи', exact: true })).toBeVisible();
});

test('selects the visible panels on both sides and keeps regions within the atlas silhouette', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('./#muscles');

  // These landmarks belong to the printed panels of the atlas, independently of the SVG paths.
  const landmarks = {
    front: [
      { metric: 'shoulders', points: [[240, 235], [512, 235]] },
      { metric: 'chest', points: [[315, 260], [430, 260]] },
      { metric: 'upperArm', points: [[225, 345], [524, 345]] },
      { metric: 'forearm', points: [[190, 465], [558, 465]] },
      { metric: 'waist', points: [[375, 400]] },
      { metric: 'thigh', points: [[305, 650], [444, 650]] },
      { metric: 'calf', points: [[270, 950], [475, 950]] },
    ],
    back: [
      { metric: 'shoulders', points: [[799, 234], [1071, 234]] },
      { metric: 'chest', points: [[871, 232], [1000, 232], [936, 280]] },
      { metric: 'upperArm', points: [[786, 345], [1084, 345]] },
      { metric: 'forearm', points: [[753, 465], [1112, 465]] },
      { metric: 'waist', points: [[936, 420]] },
      { metric: 'hips', points: [[883, 563], [994, 563]] },
      { metric: 'thigh', points: [[861, 686], [1009, 686]] },
      { metric: 'calf', points: [[831, 951], [1035, 951]] },
    ],
  } as const;

  for (const view of ['front', 'back'] as const) {
    await page.getByText(view === 'front' ? 'Спереди' : 'Сзади', { exact: true }).tap();
    const figure = page.locator(`svg[data-view="${view}"]`);

    for (const landmark of landmarks[view]) {
      for (const [x, y] of landmark.points) {
        const point = await figure.evaluate((svg: SVGSVGElement, coordinates) => {
          const projected = new DOMPoint(coordinates.x, coordinates.y).matrixTransform(svg.getScreenCTM() ?? undefined);
          return { x: projected.x, y: projected.y };
        }, { x, y });
        await page.touchscreen.tap(point.x, point.y);
        await expect(figure.locator(`[data-metric="${landmark.metric}"]`)).toHaveAttribute('data-selected', 'true');
      }
    }

    const coverage = await figure.evaluate(async (svg) => {
      const artwork = svg.querySelector('image');
      if (!artwork) throw new Error('The figure has no atlas image');
      const image = new Image();
      image.src = artwork.href.baseVal;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;

      return [...svg.querySelectorAll<SVGGElement>('g[data-metric]')].map((region) => {
        let total = 0;
        let outside = 0;
        for (const path of region.querySelectorAll('path')) {
          const bounds = path.getBBox();
          for (let y = Math.ceil(bounds.y); y < bounds.y + bounds.height; y += 2) {
            for (let x = Math.ceil(bounds.x); x < bounds.x + bounds.width; x += 2) {
              if (!path.isPointInFill(new DOMPoint(x, y))) continue;
              total++;
              if ((pixels[(y * canvas.width + x) * 4 + 3] ?? 0) < 100) outside++;
            }
          }
        }
        return { metric: region.dataset.metric, outsideRatio: outside / total };
      });
    });
    for (const region of coverage) {
      expect(region.outsideRatio, `${view} ${region.metric} spills outside the visible figure`).toBeLessThan(0.02);
    }
  }

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoHorizontalScroll(page);
    for (const view of ['front', 'back'] as const) {
      await page.getByText(view === 'front' ? 'Спереди' : 'Сзади', { exact: true }).tap();
      const figure = page.locator(`svg[data-view="${view}"]`);
      await figure.scrollIntoViewIfNeeded();
      const calves = landmarks[view].find(({ metric }) => metric === 'calf');
      if (!calves) throw new Error('The calf landmarks are missing');
      for (const [x, y] of calves.points) {
        const point = await figure.evaluate((svg: SVGSVGElement, coordinates) => {
          const projected = new DOMPoint(coordinates.x, coordinates.y).matrixTransform(svg.getScreenCTM() ?? undefined);
          return { x: projected.x, y: projected.y };
        }, { x, y });
        await page.touchscreen.tap(point.x, point.y);
        await expect(figure.locator('[data-metric="calf"]')).toHaveAttribute('data-selected', 'true');
      }
    }
  }
});
