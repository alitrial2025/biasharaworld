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

for (const width of [390, 1440]) {
  test(`landing hero, header and proof strip follow theme changes at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto("/");
    const hero = page.locator(".hero-section");
    const headline = hero.locator("h1 > span").first();
    const strip = page.getByRole("region", {
      name: "Built around your business",
      exact: true,
    });
    await expect(hero).toHaveCSS("background-color", "rgb(241, 248, 243)");
    await expect(headline).toHaveCSS("color", "rgb(21, 63, 45)");
    await expect(strip.locator("strong").first()).toHaveCSS(
      "color",
      "rgb(33, 77, 54)",
    );
    await expect(page.locator("header .brand")).toHaveCSS(
      "color",
      "rgb(23, 63, 46)",
    );
    await page
      .getByRole("button", { name: "Switch to dark mode", exact: true })
      .click();
    await expect(hero).toHaveCSS("background-color", "rgb(7, 31, 23)");
    await expect(headline).toHaveCSS("color", "rgb(245, 255, 249)");
    await page
      .getByRole("button", { name: "Switch to light mode", exact: true })
      .click();
    await expect(hero).toHaveCSS("background-color", "rgb(241, 248, 243)");
    await expect(headline).toHaveCSS("color", "rgb(21, 63, 45)");
    await page.reload();
    await expect(hero).toHaveCSS("background-color", "rgb(241, 248, 243)");
  });
}
