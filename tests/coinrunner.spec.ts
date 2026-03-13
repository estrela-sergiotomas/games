import { test, expect } from '@playwright/test';

// Mobile viewport (iPhone 14 Pro)
const mobileViewport = { width: 393, height: 852 };

test.describe('Coin Runner - Mobile Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto('http://localhost:5173');
    // Wait for splash to disappear and game to load
    await page.waitForTimeout(4000);
  });

  test('lobby screen renders correctly on mobile', async ({ page }) => {
    await page.screenshot({ path: 'tests/screenshots/lobby-mobile.png', fullPage: false });
    // Check canvas exists
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('coin runner game loads from lobby', async ({ page }) => {
    // Click on canvas area where Coin Runner card would be
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Click approximately where the Coin Runner card is (second card)
    const box = await canvas.boundingBox();
    if (box) {
      // Coin Runner card is roughly in the middle-lower area of the lobby
      await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.45);
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/coinrunner-betting.png' });
  });

  test('coin runner gameplay - jump mechanics', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (!box) return;

    // Navigate to Coin Runner
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.45);
    await page.waitForTimeout(1000);

    // Click CORRER button (bottom left area)
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.82);
    await page.waitForTimeout(500);

    // Screenshot during tutorial phase
    await page.screenshot({ path: 'tests/screenshots/coinrunner-tutorial.png' });

    // Wait for tutorial to end and take gameplay screenshot
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'tests/screenshots/coinrunner-gameplay.png' });

    // Tap to jump multiple times
    for (let i = 0; i < 5; i++) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.3);
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: 'tests/screenshots/coinrunner-jumping.png' });
  });

  test('coin runner obstacles visible', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (!box) return;

    // Navigate to Coin Runner and start
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.45);
    await page.waitForTimeout(1000);
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.82);

    // Wait for obstacles to appear (after tutorial)
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'tests/screenshots/coinrunner-obstacles.png' });
  });

  test('cash out shows pipe animation', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (!box) return;

    // Navigate to Coin Runner and start
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.45);
    await page.waitForTimeout(1000);
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.82);
    await page.waitForTimeout(3000);

    // Click CASH OUT button (bottom right area)
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.82);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/coinrunner-cashout-pipe.png' });

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/screenshots/coinrunner-cashout-prize.png' });
  });
});
