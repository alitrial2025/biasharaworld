import { test, expect } from "@playwright/test";
import { industries } from "../src/lib/industries";

for (const width of [390, 1440]) {
  test(`business directory finds all 20 sectors without crowding the first view at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: width === 390 ? "dark" : "light" });
    await page.goto("/solutions");
    const directory = page.locator("#business-types");
    await expect(directory.locator("article")).toHaveCount(6);
    await directory
      .getByRole("button", { name: "Explore all 20 business types" })
      .click();
    await expect(directory.locator("article")).toHaveCount(20);
    for (const industry of industries) {
      const card = directory
        .getByRole("article")
        .filter({
          has: page.getByRole("heading", { name: industry.label, exact: true }),
        });
      await expect(card.locator("li")).toHaveCount(3);
    }
    await directory
      .getByRole("textbox", { name: "Find your business type" })
      .fill("beauty");
    await expect(directory.locator("article")).toHaveCount(1);
    await expect(
      directory.getByRole("heading", {
        name: "Beauty Salons, Spas & Barbershops",
      }),
    ).toBeVisible();
    await directory
      .getByRole("textbox", { name: "Find your business type" })
      .fill("unmatched-sector");
    await expect(directory.getByText(/No match yet/)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });
}
