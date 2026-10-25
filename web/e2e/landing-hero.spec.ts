import { test, expect } from "@playwright/test";

for (const width of [320, 390, 768, 1024, 1440, 1680]) {
  for (const theme of ["light", "dark"] as const) {
    test(`doodle-to-photo hero and current product previews work at ${width}px in ${theme}`, async ({
      page,
    }, info) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator(".hero-copy h1")).toBeVisible();
      await expect(
        page
          .locator(".hero-copy")
          .getByRole("link", { name: "Start your next chapter", exact: true }),
      ).toHaveAttribute("href", "/signup");
      await expect(
        page
          .locator(".hero-copy")
          .getByRole("link", { name: "Open workspace", exact: true }),
      ).toHaveAttribute("href", "/dashboard");
      const figure = page.getByRole("figure", {
        name: "BiasharaOS web and Android product previews",
        exact: true,
      });
      await expect(figure).toBeVisible();
      await expect(figure.locator("img")).toHaveCount(2);
      for (const image of await figure.locator("img").all()) {
        await expect(image).toBeVisible();
        await expect
          .poll(() =>
            image.evaluate(
              (node: HTMLImageElement) =>
                node.complete && node.naturalWidth > 0,
            ),
          )
          .toBe(true);
      }
      await expect(figure).toContainText("Example workspace");
      const doodle = page.locator(".hero-section > .brand-doodle");
      await expect(doodle).toHaveAttribute("aria-hidden", "true");
      expect(
        await doodle.evaluate((node) => getComputedStyle(node).maskImage),
      ).toContain("linear-gradient");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await expect(
        page
          .getByRole("navigation", {
            name: "Explore business features",
            exact: true,
          })
          .getByRole("link"),
      ).toHaveCount(6);
      await expect(
        page.getByRole("region", {
          name: "Built around your business",
          exact: true,
        }),
      ).not.toContainText("5,000");
      await page.screenshot({
        path: info.outputPath(`hero-${width}-${theme}.png`),
        animations: "disabled",
      });
      expect(errors).toEqual([]);
    });
  }
}

test("reduced motion and unsupported observers retain visible landing content", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    Object.defineProperty(window, "IntersectionObserver", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/");
  await expect(page.locator(".hero-copy h1")).toHaveCSS("opacity", "1");
  await expect(page.locator("[data-reveal-state=pending]")).toHaveCount(0);
  expect(
    await page
      .locator("[data-landing-home]")
      .evaluate((root) => root.getAnimations({ subtree: true }).length),
  ).toBe(0);
});

test("decorative movement and section reveals still work", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator("[data-landing-home]")).toHaveClass(/motion-ready/);
  await expect(page.locator(".hero-copy h1")).toHaveCSS("opacity", "1");
  const card = page.locator(".feature-bento > a").first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute("data-reveal-state", "visible");
  await expect(card).toHaveCSS("opacity", "1");
  await card.focus();
  await expect(card).toBeFocused();
});

test("hero content and signup link remain usable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3002/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page
      .locator(".hero-copy")
      .getByRole("link", { name: "Start your next chapter", exact: true }),
  ).toHaveAttribute("href", "/signup");
  await expect(page.locator("[data-reveal-state=pending]")).toHaveCount(0);
  await context.close();
});

test("headline types once without shifting layout and can stop for reduced motion", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.clock.runFor(80);
  const heading = page.getByRole("heading", {
    level: 1,
    name: "Your business. All together.",
  });
  await expect(heading).toHaveAttribute("data-typing", "active");
  const size = () =>
    heading.evaluate((node) => ({
      width: node.clientWidth,
      height: node.clientHeight,
    }));
  const before = await size();
  await page.clock.runFor(2000);
  await expect(heading).toHaveAttribute("data-typing", "complete");
  expect(await size()).toEqual(before);
  await page.reload();
  await page.clock.runFor(80);
  await expect(heading).toHaveAttribute("data-typing", "active");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(80);
  await expect(heading).toHaveAttribute("data-typing", "complete");
  await expect(page.locator(".hero-eyebrow")).toHaveCount(0);
});

for (const theme of ["light", "dark"] as const) {
  test(`tablet navigation opens readable menus in ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1000 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    const nav = page.getByRole("navigation", {
      name: "Main navigation",
      exact: true,
    });
    await expect(
      nav.getByRole("link", { name: "Home", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await nav.getByRole("button", { name: "Solutions", exact: true }).click();
    const destination = nav.getByRole("link", {
      name: /Find your business type/,
    });
    await expect(destination).toBeVisible();
    await expect(destination).toHaveAttribute(
      "href",
      "/solutions#business-types",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(nav).not.toBeVisible();
  });
}
