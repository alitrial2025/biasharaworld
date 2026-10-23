import { test, expect } from "@playwright/test";

for (const width of [1440, 390])
  test(`visible website theme toggle persists at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const dark = page.getByRole("button", {
      name: "Switch to dark mode",
      exact: true,
    });
    await expect(dark).toBeVisible();
    await dark.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(
      page.getByRole("button", { name: "Switch to light mode", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("dark-home.png"),
      animations: "disabled",
    });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: "Switch to light mode", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Switch to light mode", exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });
test("without a saved choice the website follows the device theme", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
