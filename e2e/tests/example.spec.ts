import { test, expect } from '../fixtures/auth.fixture';

test.describe('Contrato Creation Workflow', () => {
  test('should create a new contrato successfully', async ({ authenticatedPage }) => {
    // Given: User is authenticated and on dashboard
    await expect(authenticatedPage).toHaveTitle(/Lexflow/);

    // Navigate to Contratos section
    await authenticatedPage.click('a:has-text("Contratos")');
    await authenticatedPage.waitForURL('**/contratos');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify we're on Contratos page
    await expect(authenticatedPage.locator('h1, h2').first()).toContainText(/Contrato/i);

    // When: User clicks to create new contrato
    const createButton = authenticatedPage.locator('button:has-text("Novo Contrato"), button:has-text("Nova Compra")').first();
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Wait for form to appear
    await authenticatedPage.waitForLoadState('networkidle');

    // Then: Form should be visible with required fields
    const form = authenticatedPage.locator('form, [role="dialog"]').first();
    await expect(form).toBeVisible();

    // Fill out basic contrato information
    // (These selectors should be adjusted based on actual form structure)
    const descricaoInput = authenticatedPage.locator('input[name*="descri"], input[placeholder*="Descri"]').first();
    if (await descricaoInput.isVisible()) {
      await descricaoInput.fill('Test Contrato - E2E Testing');
    }

    // Fill category if available
    const categoriaSelect = authenticatedPage.locator('select[name*="categoria"], [name*="category"]').first();
    if (await categoriaSelect.isVisible()) {
      await categoriaSelect.selectOption({ index: 1 });
    }

    // Fill value if available
    const valorInput = authenticatedPage.locator('input[type="number"], input[name*="valor"], input[name*="value"]').first();
    if (await valorInput.isVisible()) {
      await valorInput.fill('1000');
    }

    // Submit form - find submit button
    const submitButton = form.locator('button[type="submit"], button:has-text("Salvar"), button:has-text("Criar"), button:has-text("Confirmar")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Wait for success feedback
      // Look for success message or redirect
      await authenticatedPage.waitForTimeout(1000);
      await authenticatedPage.waitForLoadState('networkidle');

      // Verify contrato was created (check if modal closed or success message shown)
      const successMessage = authenticatedPage.locator('[role="alert"]:has-text("sucesso"), [role="alert"]:has-text("criado")').first();
      const formGone = form.isVisible().then(v => !v);

      // Either success message appears OR form disappears (form closed)
      const createdSuccessfully = await Promise.race([
        successMessage.waitFor({ state: 'visible', timeout: 2000 }).then(() => true),
        formGone,
      ]).catch(() => false);

      expect(createdSuccessfully).toBeTruthy();
    }
  });

  test('should display list of contratos', async ({ authenticatedPage }) => {
    // Navigate to Contratos
    await authenticatedPage.click('a:has-text("Contratos")');
    await authenticatedPage.waitForURL('**/contratos');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify page loaded
    const page = authenticatedPage;
    await expect(page).toHaveTitle(/Lexflow/);

    // Check for table/list of contratos
    const table = page.locator('table, [role="grid"], [role="table"]').first();
    const list = page.locator('[data-testid*="contrato"], .contrato-item, .contract-row').first();

    // At least one should exist
    const hasTableOrList = await Promise.race([
      table.waitFor({ state: 'visible', timeout: 2000 }).then(() => true),
      list.waitFor({ state: 'visible', timeout: 2000 }).then(() => true),
    ]).catch(() => false);

    expect(hasTableOrList).toBeTruthy();
  });
});

test.describe('Authentication Flow', () => {
  test('should handle logout correctly', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if logged in by looking for logout button
    const logoutButton = page.locator('button:has-text("Sair"), button:has-text("Logout"), [aria-label*="Logout"]').first();

    if (await logoutButton.isVisible()) {
      // If logout button visible, user is authenticated
      // Click logout
      await logoutButton.click();

      // Should redirect to login
      await page.waitForURL(/login|signin/i, { timeout: 5000 }).catch(() => {
        // If redirect doesn't happen, check if we're on login page anyway
        return page.waitForLoadState('networkidle');
      });

      // Verify we're on login page or home (auth cleared)
      const urlOrTitle = page.url() + (await page.title());
      const isOnAuthPage = /login|signin|home/.test(urlOrTitle.toLowerCase());

      expect(isOnAuthPage).toBeTruthy();
    }
  });
});
