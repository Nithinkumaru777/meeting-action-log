import { expect, test } from '@playwright/test';

test.describe('Step 15: End-to-End Application Flows', () => {
  test('Flow 1 & 2: Create meeting (validation first), log decision, and convert decision to task', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 860 });
    await page.goto('/');

    // Click New meeting button in top bar
    await page.locator('#newMeetingBtn').click();
    await expect(page.locator('#dwTitle')).toContainText('Log a meeting');

    // Submit empty to verify validation errors first
    await page.getByRole('button', { name: /Create meeting/i }).click();
    await expect(page.locator('#e-mtitle')).toContainText('3 to 100 characters');
    await expect(page.locator('#e-matt')).toContainText('at least one attendee');

    // Fill valid meeting details
    const uniqueTitle = `Architecture Sync ${Date.now()}`;
    await page.locator('#mTitle').fill(uniqueTitle);
    await page.locator('#f-matt .chip label').first().click();
    await page.locator('#mAgenda').fill('Review deployment pipeline and release gates.');
    await page.getByRole('button', { name: /Create meeting/i }).click();

    // Should navigate to the new meeting detail page
    await expect(page).toHaveURL(/\/meetings\/[a-f0-9]{24}/);
    await expect(page.locator('h1')).toContainText(uniqueTitle);

    // Log a short invalid decision first (< 5 chars)
    await page.locator('#dtext').fill('No');
    await page.locator('#addDecision button[type="submit"]').click();
    await expect(page.locator('#e-dtext')).toContainText('at least 5 characters');

    // Log a valid decision
    const decisionText = 'Require automated rollback smoke test before production deploy';
    await page.locator('#dtext').fill(decisionText);
    await page.locator('#addDecision button[type="submit"]').click();
    await expect(page.locator('.dq').filter({ hasText: decisionText })).toBeVisible();

    // Convert the decision into a task
    await page
      .getByRole('button', { name: /Convert to task/i })
      .first()
      .click();
    await expect(page.locator('#dwTitle')).toContainText('Give this decision');
    await page.locator('#aOwner').selectOption({ index: 1 });
    await page.getByRole('button', { name: /Create task/i }).click();

    // Newly converted task appears in Action items list on the meeting page
    await expect(page.locator('.atitle').filter({ hasText: decisionText })).toBeVisible();
  });

  test('Flow 3 & 4: Overdue +3 days extension, Decision inbox tabs, and Members 409 protection', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 860 });

    // Visit Overdue page and extend an action by +3 days
    await page.goto('/overdue');
    await expect(page.locator('h1')).toContainText('Overdue');
    const extendBtns = page.getByRole('button', { name: /\+3 days/i });
    const countBefore = await extendBtns.count();
    if (countBefore > 0) {
      await extendBtns.first().click();
      await expect(page.locator('.toast')).toContainText('Due date moved');
    }

    // Visit Decision inbox and switch tabs
    await page.goto('/decisions');
    await expect(page.locator('h1')).toContainText('Decision');
    await page.getByRole('button', { name: /Converted/i }).click();
    await expect(page.locator('.drow.converted').first()).toBeVisible();

    // Visit Members page and verify 409 conflict toast when deleting a member who owns active records
    await page.goto('/members');
    await expect(page.locator('h1')).toContainText('Team');
    await page.locator('[data-member] button[aria-label^="Remove "]').first().click();
    await expect(page.locator('.toast.err')).toContainText('Cannot remove member');
  });

  test('Flow 5: Guided demo tour, theme persistence after reload, mobile tabbar & bottom sheet, and API error Retry', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 860 });
    await page.goto('/');

    // Theme toggle persists after reload
    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#themeBtn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Guided demo tour: Next, Back, End
    await page.locator('#demoBtn').click();
    await expect(page.locator('#tourPop')).toHaveClass(/on/);
    await expect(page.locator('#tourPop .eyebrow')).toContainText('Step 1 of 8');
    await page.locator('#tourNext').click();
    await expect(page.locator('#tourPop .eyebrow')).toContainText('Step 2 of 8');
    await page.locator('#tourBack').click();
    await expect(page.locator('#tourPop .eyebrow')).toContainText('Step 1 of 8');
    await page.locator('#tourEnd').click();
    await expect(page.locator('#tourPop')).not.toHaveClass(/on/);

    // Mobile tabbar navigation and bottom sheet
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('#tabbar')).toBeVisible();
    await page.locator('#tabbar a[href="/meetings"]').click();
    await expect(page).toHaveURL(/\/meetings$/);
    await page.locator('#newMeetingBtn').click();
    await expect(page.locator('#dwTitle')).toContainText('Log a meeting');
    await page.keyboard.press('Escape');

    // API down -> error state -> Retry works
    await page.setViewportSize({ width: 1366, height: 860 });
    let failOnce = true;
    await page.route('**/api/insights/overdue', async (route) => {
      if (failOnce) {
        failOnce = false;
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Simulated temporary server outage.',
              requestId: 'req-e2e-500',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/overdue');
    await expect(page.getByRole('alert')).toContainText('Simulated temporary server outage');
    await page.getByRole('button', { name: /Retry/i }).click();
    await expect(page.locator('.ogh').first()).toBeVisible();
  });
});
