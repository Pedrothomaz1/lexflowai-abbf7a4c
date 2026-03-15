import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Extend basic test by providing "authenticatedPage" fixture
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Login before each test
    await page.goto('/');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Check if already authenticated (session exists)
    const isAuthenticated = await page.evaluate(() => {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('user');
      return !!(token && user);
    });

    if (!isAuthenticated) {
      // Navigate to login page
      await page.goto('/login');

      // Fill in login form
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Test123!@#');

      // Click submit button
      await page.click('button[type="submit"]');

      // Wait for navigation to dashboard
      await page.waitForURL('/');
      await page.waitForLoadState('networkidle');
    }

    // Provide authenticated page to test
    await use(page);

    // Cleanup: Clear auth session after test
    await page.evaluate(() => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    });
  },
});

export { expect };
