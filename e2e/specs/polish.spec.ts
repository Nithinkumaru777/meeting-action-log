import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../docs/screenshots');

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
});

test.describe('Step 14: Responsive, Accessibility, Dark Mode, Keyboard & Screenshots', () => {
  test('captures desktop & mobile screenshots across all routes in light & dark mode with zero console errors', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.setViewportSize({ width: 1366, height: 860 });
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Who owns');
    await expect(page.locator('.figs .fig')).toHaveCount(4);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'STEP-11-today-1366-light.png'),
      fullPage: true,
    });

    // Toggle dark mode on Today
    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'STEP-11-today-1366-dark.png'),
      fullPage: true,
    });
    // Switch back to light mode
    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Meetings list
    await page.goto('/meetings');
    await expect(page.locator('h1')).toContainText('Meetings');
    await expect(page.locator('.mrow').first()).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'STEP-11-meetings-1366.png'),
      fullPage: true,
    });

    // Open first meeting detail
    await page.locator('.mrow').first().click();
    await expect(page.locator('.back')).toContainText('All meetings');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'STEP-12-meeting-detail-1366.png'),
      fullPage: true,
    });

    // Open ActionFormSheet on Meeting detail
    await page.getByRole('button', { name: /Add action/i }).click();
    await expect(page.locator('#dwTitle')).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'STEP-12-convert-sheet-1366.png'),
    });
    await page.keyboard.press('Escape');

    // Overdue route
    await page.goto('/overdue');
    await expect(page.locator('h1')).toContainText('Overdue');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'STEP-13-overdue-1366.png'),
      fullPage: true,
    });

    // Decisions inbox route
    await page.goto('/decisions');
    await expect(page.locator('h1')).toContainText('Decision');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'STEP-13-decisions-inbox-1366.png'),
      fullPage: true,
    });

    // Members route
    await page.goto('/members');
    await expect(page.locator('h1')).toContainText('Team');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'STEP-13-members-1366.png'),
      fullPage: true,
    });

    // Design System route (light + dark)
    await page.goto('/design-system');
    await expect(page.locator('h1')).toContainText('The design system');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'STEP-09-design-system-1366-light.png'),
      fullPage: true,
    });
    await page.locator('#themeBtn').click();
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'STEP-09-design-system-1366-dark.png'),
      fullPage: true,
    });
    await page.locator('#themeBtn').click();

    // Guided demo tour screenshot
    await page.goto('/');
    await page.locator('#demoBtn').click();
    await expect(page.locator('#tourPop')).toHaveClass(/on/);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'STEP-13-guided-tour-1366.png'),
    });
    await page.keyboard.press('Escape');

    // Mobile 390px screenshots
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('#tabbar')).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'STEP-11-today-390.png'),
      fullPage: true,
    });
    await page.goto('/design-system');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'STEP-09-design-system-390.png'),
      fullPage: true,
    });

    expect(errors).toEqual([]);
  });

  test('responsive check at 360, 390, 768, 1024, 1366, 1920 has zero horizontal overflow', async ({
    page,
  }) => {
    const widths = [360, 390, 768, 1024, 1366, 1920];
    const routes = ['/', '/meetings', '/overdue', '/decisions', '/members', '/design-system'];

    for (const width of widths) {
      await page.setViewportSize({ width, height: 860 });
      for (const route of routes) {
        await page.goto(route);
        await expect(page.locator('h1')).toBeVisible();
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1;
        });
        expect(overflow, `Overflow at width=${width} route=${route}`).toBe(false);
      }
    }
  });

  test('axe-core accessibility check passes with zero critical/serious violations across routes', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1366, height: 860 });
    const routes = ['/', '/meetings', '/overdue', '/decisions', '/members', '/design-system'];
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const severe = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(severe, `Axe violations on ${route}`).toEqual([]);
    }
  });

  test('keyboard shortcuts and reduced motion work cleanly', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1366, height: 860 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();

    // '/' focuses search input
    await page.keyboard.press('/');
    await expect(page.locator('#q')).toBeFocused();
    await page.keyboard.press('Tab');

    // Ctrl+K opens Command Palette, Escape closes it
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: /Command palette/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /Command palette/i })).toBeHidden();
  });
});
