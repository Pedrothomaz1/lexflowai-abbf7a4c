import { test as base } from '@playwright/test';
import type { TestInfo } from '@playwright/test';

/**
 * Database Cleanup Fixture
 *
 * Provides automatic database state cleanup before/after tests.
 * Useful for resetting test data and ensuring test isolation.
 */
export const test = base.extend<object>({
  // Before each test: Clean up test data
  async beforeEach({ page }, use, testInfo) {
    // Log test name for debugging
    console.log(`🧪 Starting test: ${testInfo.title}`);

    // Reset application state (clear localStorage, IndexedDB, etc)
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Clear IndexedDB if used by the application
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const dbNames = indexedDB.databases ? indexedDB.databases() : [];
        let deleted = 0;
        let toDelete = dbNames.length;

        if (toDelete === 0) {
          resolve();
          return;
        }

        dbNames.forEach((dbInfo) => {
          const req = indexedDB.deleteDatabase(dbInfo.name);
          req.onsuccess = () => {
            deleted++;
            if (deleted === toDelete) {
              resolve();
            }
          };
          req.onerror = () => reject(req.error);
        });
      });
    });

    // Provide test execution environment
    await use();

    // After test: Log completion
    console.log(`✅ Completed test: ${testInfo.title}`);
  },
});

export { expect } from '@playwright/test';
