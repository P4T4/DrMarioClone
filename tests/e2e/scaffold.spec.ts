import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('renders the accessible Spanish application shell', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Duelo privado online' }),
  ).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Controles de teclado' }),
  ).toBeVisible();
  await expect(
    page.getByText('Virus: forma redonda con marcas faciales.'),
  ).toBeVisible();
  await expect(
    page.getByText('Cápsula: dos segmentos alargados unidos en una pieza.'),
  ).toBeVisible();
  await expect(
    page.getByText('Obstáculo: forma cuadrada con trama cruzada.'),
  ).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Saltar al contenido principal' }),
  ).toBeFocused();
});

test('has no WCAG 2.2 AA accessibility violations', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
