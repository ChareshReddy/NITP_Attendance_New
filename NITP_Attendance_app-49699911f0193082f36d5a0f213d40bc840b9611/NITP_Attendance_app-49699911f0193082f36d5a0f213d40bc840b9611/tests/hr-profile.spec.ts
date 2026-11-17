import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACT_DIR = String.raw`C:\Users\Admin\.gemini\antigravity\brain\fa6a68e5-c146-4b77-bc8e-1e0f13b1b6c2\screenshots`;

test.describe('HR My Profile Drawer & Dropdown Actions', () => {
  test('HR can open My Profile, Edit Profile, view all tabs, Change Password, and Logout', async ({ page }, testInfo) => {
    const project = testInfo.project.name;

    // 1. Login as HR Admin
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.fill('input[autocomplete="username"]', 'rohini.hr@nextitpoint.com');
    await page.fill('input[autocomplete="current-password"]', 'Rohini#123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin*', { timeout: 20000 });
    await page.waitForLoadState('networkidle');

    // 2. Open top-right profile dropdown and click My Profile
    await page.getByRole('button', { name: 'User profile menu' }).click();
    const myProfileBtn = page.getByRole('button', { name: 'My Profile' });
    await expect(myProfileBtn).toBeVisible();
    await myProfileBtn.click();

    // 3. Verify slide-over drawer opens with Profile Header & Personal Info
    const drawer = page.getByRole('dialog', { name: 'My Profile' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('heading', { name: 'My Profile' })).toBeVisible();
    await expect(drawer.getByText('Rohini Hr').first()).toBeVisible();
    await expect(drawer.getByText('rohini.hr@nextitpoint.com')).toBeVisible();

    // Check no horizontal overflow on drawer/page
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    });
    expect(overflow).toBe(false);

    // Screenshot of Personal Info tab in Drawer
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `hr_profile_drawer_${project}.png`),
      fullPage: false,
    });

    // 4. Test Edit Profile inside Personal Info tab (desktop only for DB write to avoid parallel race)
    if (project === 'desktop-1440') {
      await drawer.getByRole('button', { name: 'Edit Profile' }).click();
      const phoneInput = drawer.locator('input[placeholder="+91 98765 43210"]');
      await expect(phoneInput).toBeVisible();
      const origPhone = await phoneInput.inputValue();
      await phoneInput.fill('+91 98765 00000');
      await drawer.getByRole('button', { name: 'Save Changes' }).click();
      await expect(drawer.getByText('Personal information updated successfully.')).toBeVisible();
      await expect(drawer.getByText('+91 98765 00000')).toBeVisible();

      // Restore original phone
      await drawer.getByRole('button', { name: 'Edit Profile' }).click();
      await drawer.locator('input[placeholder="+91 98765 43210"]').fill(origPhone);
      await drawer.getByRole('button', { name: 'Save Changes' }).click();
      await expect(drawer.getByText('Personal information updated successfully.')).toBeVisible();
    }

    // 5. Switch to Employment tab
    await drawer.getByRole('button', { name: 'Employment' }).click();
    await expect(drawer.getByRole('heading', { name: 'Employment Details' })).toBeVisible();
    await expect(drawer.getByText('Date of Joining')).toBeVisible();
    await expect(drawer.getByText('Reporting Manager')).toBeVisible();
    await expect(drawer.getByText('Employment Status')).toBeVisible();

    // 6. Switch to Security tab & verify Change Password form
    await drawer.getByRole('button', { name: 'Security' }).click();
    await expect(drawer.getByRole('heading', { name: 'Account & Security' })).toBeVisible();
    await expect(drawer.getByText('Active Account')).toBeVisible();
    await expect(drawer.getByText('Security Information')).toBeVisible();

    await drawer.getByRole('button', { name: 'Change Password' }).click();
    await expect(drawer.getByRole('button', { name: 'Save Password' })).toBeVisible();

    if (project === 'desktop-1440') {
      // Test mismatch validation
      await drawer.locator('input[placeholder="Enter current password"]').fill('Rohini#123');
      await drawer.locator('input[placeholder="Minimum 6 characters"]').fill('NewPass#123');
      await drawer.locator('input[placeholder="Re-enter new password"]').fill('Mismatch#123');
      await drawer.getByRole('button', { name: 'Save Password' }).click();
      await expect(drawer.getByText('New passwords do not match.')).toBeVisible();

      // Test actual password change and restore back to Rohini#123
      await drawer.locator('input[placeholder="Re-enter new password"]').fill('NewPass#123');
      await drawer.getByRole('button', { name: 'Save Password' }).click();
      await expect(drawer.getByText('Password updated successfully.')).toBeVisible();

      // Change back to Rohini#123 so seeded credentials remain intact
      await drawer.getByRole('button', { name: 'Change Password' }).click();
      await drawer.locator('input[placeholder="Enter current password"]').fill('NewPass#123');
      await drawer.locator('input[placeholder="Minimum 6 characters"]').fill('Rohini#123');
      await drawer.locator('input[placeholder="Re-enter new password"]').fill('Rohini#123');
      await drawer.getByRole('button', { name: 'Save Password' }).click();
      await expect(drawer.getByText('Password updated successfully.')).toBeVisible();
    }

    // 7. Switch to Documents tab
    await drawer.getByRole('button', { name: 'Documents' }).click();
    await expect(drawer.getByRole('heading', { name: 'Documents' })).toBeVisible();

    // 8. Close Drawer
    await drawer.getByRole('button', { name: 'Close profile drawer' }).click();
    await expect(drawer).toBeHidden();

    // 9. Verify Top-Right Dropdown -> Change Password modal works
    await page.getByRole('button', { name: 'User profile menu' }).click();
    await page.getByRole('button', { name: 'Change Password' }).click();
    await expect(page.getByRole('heading', { name: 'Change Password' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    // 10. Verify Top-Right Dropdown -> Logout confirmation & redirect to /
    await page.getByRole('button', { name: 'User profile menu' }).click();
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.getByText('Confirm Logout')).toBeVisible();
    await page.getByRole('button', { name: 'Logout' }).last().click();
    await page.waitForURL('**/', { timeout: 20000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
  });
});
