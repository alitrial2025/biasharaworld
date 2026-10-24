import { test, expect } from "@playwright/test";

for (const scenario of [
  { width: 390, theme: "dark" as const },
  { width: 1440, theme: "light" as const },
]) {
  test(`policies and help work at ${scenario.width}px in ${scenario.theme} mode`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: scenario.width, height: 900 });
    await page.emulateMedia({ colorScheme: scenario.theme });
    for (const [path, heading] of [
      ["/privacy", "Privacy notice"],
      ["/cookies", "Cookies & storage"],
      ["/terms", "Terms of use"],
      ["/help", "Find your next step."],
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toHaveText(heading);
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        scenario.theme,
      );
      await expect(
        page.locator('footer a[href="/cookies"]').first(),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test("cookie controls change real appearance preferences without inventing tracking consent", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("biashara.appearance", "dark"),
  );
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/cookies");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByText("Optional analytics and advertising: not enabled.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /accept all|allow analytics/i }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Use device theme", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Appearance now follows your device setting." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("biashara.appearance")),
  ).toBe("system");
});

test("help search, categories and data-request support links are usable", async ({
  page,
}) => {
  await page.goto("/help");
  const search = page.getByRole("searchbox", {
    name: "Search help, photos, payments or account access…",
  });
  await search.fill("photos");
  await page
    .getByText("Can another business see my product photos?", { exact: true })
    .click();
  await expect(
    page.getByText(
      /Private product photos are scoped to the business that uploaded them/,
    ),
  ).toBeVisible();
  await search.fill("");
  await page
    .getByRole("button", { name: "Funding & verification", exact: true })
    .click();
  await expect(
    page.getByText("What happens when I submit a funding request?", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("How do I add, change or remove a product photo?", {
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Contact support", exact: true })
    .click();
  await expect(page).toHaveURL(/\/contact$/);
  await page
    .getByLabel("What can we help with?")
    .selectOption({ label: "Privacy & data request" });
  await expect(page.getByLabel("What can we help with?")).toHaveValue(
    "Privacy & data request",
  );
});

test("privacy notice explains public product photos and pending-provider readiness", async ({
  page,
}) => {
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", {
      name: "3. Who can see information",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Hiding a product or unpublishing the shop blocks new public image requests/,
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      /No verification provider or lending provider is connected in this release/,
    ),
  ).toBeVisible();
  await expect(page.locator('main a[href="/contact"]').first()).toBeVisible();
});
