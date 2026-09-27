import { expect, test } from '@playwright/test';

const enableVerticalBars = async (page: import('@playwright/test').Page) => {
  const toggle = page.getByText('iPhone Duo Mode').locator('..').locator('ion-toggle');
  await toggle.click();
  await expect(page.locator('ion-app')).toHaveClass(/ios-theme-vertical-bars/);
};

test('verticalBars mode moves tabs into the right rail and reveals labels while dragging', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 900 });
  await page.goto('/main/index');
  await enableVerticalBars(page);

  const bar = page.locator('#tab-bar-bottom');
  const buttons = bar.locator('ion-tab-button');
  await expect.poll(async () => (await bar.boundingBox())?.x).toBeGreaterThan(620);
  const barBox = (await bar.boundingBox())!;
  expect(barBox.width).toBeCloseTo(48, 0);
  await expect(buttons.first().locator('ion-label')).toHaveCSS('position', 'absolute');
  await expect(buttons.nth(1).locator('ion-label')).toHaveCSS('position', 'absolute');

  const selectedBox = (await buttons.first().boundingBox())!;
  const targetBox = (await buttons.nth(1).boundingBox())!;
  await page.mouse.move(selectedBox.x + selectedBox.width / 2, selectedBox.y + selectedBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 4 });
  await expect.poll(() => buttons.first().evaluate((element) => element.matches(':active'))).toBe(true);

  await expect(buttons.nth(1)).toHaveClass(/ion-activated/);
  // Keep the scrubbed lens at the pointer; finishing its animation moves it to the last tab.
  await page.locator('body > ion-tab-button.ion-cloned-element [part="native"]').evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((animation) => animation.finished));
  });
  // The glass edge has small subpixel differences depending on the sampled drag velocity.
  await expect(page).toHaveScreenshot('vertical-bars-tab-drag-labels.png', { animations: 'allow', maxDiffPixels: 100 });
  await page.mouse.up();

  const overlayDirection = await page.evaluate(async () => {
    const menu = document.querySelector('ion-menu')!;
    const tabs = document.createElement('ion-tabs');
    const overlayBar = document.createElement('ion-tab-bar');
    overlayBar.mode = 'ios';
    tabs.append(overlayBar);
    menu.append(tabs);
    await customElements.whenDefined('ion-tab-bar');
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const direction = getComputedStyle(overlayBar).flexDirection;
    tabs.remove();
    return direction;
  });
  expect(overlayDirection).toBe('row');
});

test('manual classes place the Web rail on the left in Chrome', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 900 });
  await page.goto('/main/index');
  await page.locator('ion-app').evaluate((root) => root.classList.add('ios-theme-vertical-bars', 'ios-theme-vertical-bars-left'));

  const bar = page.locator('#tab-bar-bottom');
  await expect.poll(async () => (await bar.boundingBox())?.x).toBeLessThan(35);
  await expect(bar).toHaveScreenshot('vertical-bars-left.png', { animations: 'disabled' });
});

// Measured from SwiftUI TabView on the iOS 27.1 Duo simulator, in points.
for (const width of [466, 951]) {
  for (const edge of ['left', 'right']) {
    for (const direction of ['ltr', 'rtl']) {
      test(`Web rail matches native geometry at ${width}px on ${edge} in ${direction}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 678 });
        await page.goto('/main/index');
        await page.locator('ion-app').evaluate(
          (app, { edge, direction }) => {
            app.dir = direction;
            app.classList.add('ios-theme-vertical-bars');
            app.classList.toggle('ios-theme-vertical-bars-left', edge === 'left');
            app.style.setProperty('--ion-safe-area-bottom', '34px');
            app.style.setProperty('--ios-theme-vertical-bars-native-inset', '84px');
          },
          { edge, direction },
        );
        const bar = page.locator('#tab-bar-bottom');
        await expect(bar).toHaveCSS('width', '44px');
        for (const count of [2, 3, 4, 5]) {
          const geometry = await bar.evaluate((bar, count) => {
            const template = bar.querySelector('ion-tab-button')!;
            while (bar.children.length > count) bar.lastElementChild!.remove();
            while (bar.children.length < count) bar.append(template.cloneNode(true));
            const rect = (el: Element) => {
              const { x, y, width, height } = el.getBoundingClientRect();
              return { x, y, width, height };
            };
            return { bar: rect(bar), buttons: Array.from(bar.children, rect) };
          }, count);
          const x = edge === 'left' ? 24 : width - 72;
          const height = count * 50 + 12;
          const y = 678 - 24 - height;
          expect(geometry.bar).toEqual({ x, y, width: 48, height });
          expect(geometry.buttons).toEqual(
            Array.from({ length: count }, (_, i) => ({
              x: x + 2,
              y: y + 2 + i * 50,
              width: 44,
              height: 58,
            })),
          );
        }
      });
    }
  }
}

for (const index of [0, 1]) {
  test(`vertical platter ${index} expands around its center and returns to native resting bounds`, async ({ page }) => {
    await page.setViewportSize({ width: 466, height: 678 });
    await page.goto('/main/index');
    await page.locator('ion-app').evaluate((app) => app.classList.add('ios-theme-vertical-bars'));
    const bar = page.locator('#tab-bar-bottom');
    const selected = bar.locator('ion-tab-button').nth(index);
    const before = (await bar.boundingBox())!;
    const button = (await selected.boundingBox())!;
    await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2);
    await page.mouse.down();
    await expect(bar).toHaveCSS('width', '64px');
    await expect(selected.locator('ion-label')).toHaveCSS('font-size', '10px');
    await expect(selected.locator('ion-icon')).toHaveCSS('font-size', '28px');
    expect(await bar.boundingBox()).toEqual({ x: 382, y: 418, width: 72, height: 240 });
    const lens = page.locator('body > ion-tab-button.ios27-vertical-tab-effect [part="native"]');
    await expect.poll(async () => Math.round((await lens.boundingBox())?.width ?? 0)).toBe(84);
    await expect.poll(async () => Math.round((await lens.boundingBox())?.height ?? 0)).toBe(84);
    await page.mouse.up();
    await expect(page.locator('body > ion-tab-button.ios27-vertical-tab-effect')).toBeHidden();
    expect(await bar.boundingBox()).toEqual(before);
    expect(await selected.boundingBox()).toEqual(button);
  });
}
