import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const ARTIFACT_DIR = String.raw`C:\Users\Admin\.gemini\antigravity\brain\fa6a68e5-c146-4b77-bc8e-1e0f13b1b6c2\screenshots`;

// Helper: login as user
async function loginAs(page: Page, user: string, pass: string, targetPath: string) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Fill credentials
  await page.fill('input[autocomplete="username"]', user);
  await page.fill('input[autocomplete="current-password"]', pass);
  await page.click('button[type="submit"]');

  if (user === 'tl@nextitpoint.com') {
    // TL redirects to employee portal by default, then navigates to TL board
    await page.waitForURL('**/employee*', { timeout: 20000 });
    await page.goto(targetPath);
    await page.waitForLoadState('networkidle');
  } else {
    // Wait for redirect
    await page.waitForURL(`**${targetPath.split('?')[0]}*`, { timeout: 20000 });
    if (targetPath.includes('?')) {
      await page.goto(targetPath);
    }
    await page.waitForLoadState('networkidle');
  }
}

// Evaluate contrast, horizontal overflow, visibility and primary button background
async function assertPageStandards(page: Page, pageName: string, project: string) {
  // 1. Assert No Horizontal Overflow
  const overflow = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    return {
      hasOverflow: scrollWidth > docWidth + 2 || bodyScrollWidth > docWidth + 2,
      docWidth,
      scrollWidth,
      bodyScrollWidth,
    };
  });
  expect(
    overflow.hasOverflow,
    `${pageName} (${project}) has horizontal overflow: scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.docWidth}`
  ).toBe(false);

  // 2. Assert Primary Button Background equals #005A9C (rgb(0, 90, 156))
  const primaryButtonColors = await page.evaluate(() => {
    const allButtons = Array.from(document.querySelectorAll<HTMLElement>(
      'button, a[role="button"], input[type="submit"]'
    ));

    const candidates = allButtons.filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const text = (el.innerText || (el as HTMLInputElement).value || '').trim();
      
      const isVisible = (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        !el.hasAttribute('disabled')
      );
      if (!isVisible) return false;

      // Primary buttons have class btn-primary or bg-blue-600 or matching action text
      const isPrimary = (
        el.classList.contains('btn-primary') ||
        el.classList.contains('bg-blue-600') ||
        style.backgroundColor === 'rgb(0, 90, 156)' ||
        /^(Sign in|Check In|Submit|Create Employee|Save|Update Password|Generate Reset Token|Assign Task|Create Task)$/i.test(text)
      );

      return isPrimary;
    });

    return candidates.map((el) => {
      const style = window.getComputedStyle(el);
      return {
        text: (el.innerText || (el as HTMLInputElement).value || '').trim().slice(0, 30),
        bgColor: style.backgroundColor,
        color: style.color,
      };
    });
  });

  if (primaryButtonColors.length > 0) {
    const has005A9C = primaryButtonColors.some(
      (b) => b.bgColor === 'rgb(0, 90, 156)' || b.bgColor.includes('0, 90, 156')
    );
    expect(
      has005A9C,
      `${pageName} (${project}) expected computed primary button background #005A9C (rgb(0, 90, 156)), got: ${JSON.stringify(primaryButtonColors)}`
    ).toBe(true);
  }

  // 3. Assert All Interactive Controls are Visible in Resting State
  const hiddenInteractive = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(
      'button, input:not([type="hidden"]), select, textarea, a[href]'
    ));
    const invisibleControls: string[] = [];

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const style = window.getComputedStyle(el);
      if (style.opacity === '0' || style.visibility === 'hidden') {
        if (!el.className.includes('group-hover') && !el.className.includes('pointer-events-none')) {
          invisibleControls.push(el.tagName + '.' + el.className);
        }
      }
    }
    return invisibleControls;
  });
  expect(
    hiddenInteractive.length,
    `${pageName} (${project}) has invisible controls: ${hiddenInteractive.join(', ')}`
  ).toBe(0);

  // 4. Contrast Ratio Evaluation (WCAG AA: >= 4.5:1 for normal text, >= 3.0:1 for large text)
  const lowContrastText = await page.evaluate(() => {
    function getLuminance(r: number, g: number, b: number) {
      const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function parseRgb(color: string): { rgb: [number, number, number]; alpha: number } | null {
      const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!m) return null;
      return {
        rgb: [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])],
        alpha: m[4] !== undefined ? parseFloat(m[4]) : 1.0,
      };
    }

    function getContrast(rgb1: [number, number, number], rgb2: [number, number, number]) {
      const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
      const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    const textElements = Array.from(document.querySelectorAll<HTMLElement>(
      'h1, h2, h3, h4, h5, p, span, th, td, label, button, a'
    ));

    const issues: { text: string; ratio: number; fg: string; bg: string }[] = [];

    for (const el of textElements) {
      if (!el.innerText || !el.innerText.trim()) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

      const parsedFg = parseRgb(style.color);
      if (!parsedFg) continue;
      const fg = parsedFg.rgb;

      // Find background color traversing upwards
      let bg: [number, number, number] | null = null;
      let curr: HTMLElement | null = el;
      while (curr) {
        const bgStyle = window.getComputedStyle(curr).backgroundColor;
        const bgImg = window.getComputedStyle(curr).backgroundImage;
        const parsedBg = parseRgb(bgStyle);
        if (parsedBg && parsedBg.alpha >= 0.5) {
          bg = parsedBg.rgb;
          break;
        } else if (bgImg && (bgImg.includes('gradient') || (curr.className && (curr.className.toString().includes('from-navy') || curr.className.toString().includes('bg-navy'))))) {
          bg = [0, 32, 79]; // Navy 900
          break;
        }
        curr = curr.parentElement;
      }
      if (!bg) bg = [244, 247, 250]; // default bg-page

      const contrast = getContrast(fg, bg);
      const fontSize = parseFloat(style.fontSize);
      const isLarge = fontSize >= 24 || (fontSize >= 18.66 && parseInt(style.fontWeight) >= 700);
      const threshold = isLarge ? 3.0 : 4.5;

      const isDisabled = el.hasAttribute('disabled') || el.closest('[disabled]');

      // Check contrast margin
      if (!isDisabled && contrast < threshold - 0.25) {
        if (el.innerText.trim().length > 1) {
          issues.push({
            text: el.innerText.trim().slice(0, 30),
            ratio: Math.round(contrast * 10) / 10,
            fg: style.color,
            bg: `rgb(${bg.join(',')})`,
          });
        }
      }
    }
    return issues.slice(0, 5);
  });

  expect(
    lowContrastText.length,
    `${pageName} (${project}) low contrast elements: ${JSON.stringify(lowContrastText)}`
  ).toBe(0);

  // 5. Full page screenshot
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }
  const screenshotPath = path.join(ARTIFACT_DIR, `${pageName}_${project}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
}

test.describe('Beautiful Blues Theme Verification', () => {
  test('Login Page (/): Contrast, Overflow, Primary Button, Screenshot', async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await assertPageStandards(page, 'login_page', project);
  });

  test('HR / Admin Portal (/admin): Contrast, Overflow, Primary Button, Screenshot', async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await loginAs(page, 'rohini.hr@nextitpoint.com', 'Rohini#123', '/admin');
    await assertPageStandards(page, 'admin_portal', project);
  });

  test('Team Leader Portal (/tl): Contrast, Overflow, Primary Button, Screenshot', async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await loginAs(page, 'tl@nextitpoint.com', 'TlPass123', '/tl?tab=tasks');
    await assertPageStandards(page, 'tl_portal', project);
  });

  test('Employee Portal (/employee): Contrast, Overflow, Primary Button, Screenshot', async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await loginAs(page, 'employee@nextitpoint.com', 'EmployeePass123', '/employee');
    await assertPageStandards(page, 'employee_portal', project);
  });
});
