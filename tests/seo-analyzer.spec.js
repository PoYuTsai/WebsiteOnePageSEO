const { test, expect } = require('@playwright/test');

test.describe('SEO Analyzer App', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the homepage correctly', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle('On-Page SEO Analyzer');

    // Check header
    await expect(page.locator('h1')).toContainText('On-Page SEO Analyzer');

    // Check subtitle
    await expect(page.locator('.subtitle')).toContainText('Powered by Google Gemini AI');

    // Check URL input exists
    await expect(page.locator('#urlInput')).toBeVisible();

    // Check analyze button exists
    await expect(page.locator('#analyzeBtn')).toBeVisible();
  });

  test('should show error for empty URL', async ({ page }) => {
    // Click analyze without entering URL
    await page.click('#analyzeBtn');

    // Check error message
    await expect(page.locator('#errorMessage')).toContainText('Please enter a URL');
  });

  test('should show error for invalid URL', async ({ page }) => {
    // Enter invalid URL format
    await page.fill('#urlInput', '://invalid-url');
    await page.click('#analyzeBtn');

    // Wait for error
    await expect(page.locator('#errorMessage')).toContainText('Please enter a valid URL');
  });

  test('should analyze a valid URL and show results', async ({ page }) => {
    // Enter a valid URL
    await page.fill('#urlInput', 'https://example.com');
    await page.click('#analyzeBtn');

    // Wait for loading to appear
    await expect(page.locator('#loadingIndicator')).toBeVisible();

    // Wait for results (with longer timeout for API call)
    await expect(page.locator('#results')).toBeVisible({ timeout: 30000 });

    // Check analytics section appears
    await expect(page.locator('.analytics-section h2')).toContainText('Structured Analytics');

    // Check AI section appears
    await expect(page.locator('.ai-section h2')).toContainText('AI-Powered Suggestions');

    // Check some metrics are displayed
    await expect(page.locator('.metric-card')).toHaveCount(10);
  });

  test('should allow Enter key to submit', async ({ page }) => {
    // Enter URL and press Enter
    await page.fill('#urlInput', 'https://example.com');
    await page.press('#urlInput', 'Enter');

    // Should show loading
    await expect(page.locator('#loadingIndicator')).toBeVisible();
  });

  test('should display score circle with value', async ({ page }) => {
    // Analyze a URL
    await page.fill('#urlInput', 'https://example.com');
    await page.click('#analyzeBtn');

    // Wait for results
    await expect(page.locator('#results')).toBeVisible({ timeout: 30000 });

    // Check score is displayed (could be number or --)
    await expect(page.locator('#scoreValue')).toBeVisible();
  });

  test('should show suggestions list', async ({ page }) => {
    // Analyze a URL
    await page.fill('#urlInput', 'https://example.com');
    await page.click('#analyzeBtn');

    // Wait for results
    await expect(page.locator('#results')).toBeVisible({ timeout: 30000 });

    // Check suggestions list exists
    await expect(page.locator('#suggestionsList')).toBeVisible();
  });

});

test.describe('API Endpoint Tests', () => {

  test('POST /api/analyze should return analytics for valid URL', async ({ request }) => {
    const response = await request.post('/api/analyze', {
      data: { url: 'https://example.com' }
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.analytics).toBeDefined();
    expect(data.analytics.wordCount).toBeGreaterThanOrEqual(0);
    expect(data.analytics.titleLength).toBeGreaterThanOrEqual(0);
    expect(data.aiSuggestions).toBeDefined();
  });

  test('POST /api/analyze should return error for missing URL', async ({ request }) => {
    const response = await request.post('/api/analyze', {
      data: {}
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('URL is required');
  });

  test('POST /api/analyze should return error for invalid URL', async ({ request }) => {
    const response = await request.post('/api/analyze', {
      data: { url: 'not-a-url' }
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Invalid URL format');
  });

});
