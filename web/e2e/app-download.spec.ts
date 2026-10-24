import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import release from "../src/lib/android-release.json";

for (const width of [390, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`get-app navigation and honest store availability work at ${width}px in ${theme} mode`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/");
      const header = page.locator("header.site-header");
      if (width < 768)
        await header
          .getByRole("button", { name: "Open menu", exact: true })
          .click();
      await header.getByRole("link", { name: "Get app", exact: true }).click();
      await expect(page).toHaveURL(/\/download$/);
      await expect(page.locator("main h1")).toHaveText(
        "Your business goes where you go.",
      );
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(
        page.getByRole("link", { name: "Open web workspace", exact: true }),
      ).toHaveAttribute("href", "/dashboard");
      await expect(
        page.getByRole("img", {
          name: "BiasharaOS Android application",
          exact: true,
        }),
      ).toBeVisible();

      for (const region of [page.locator("main"), page.locator("footer")]) {
        const badges = region.getByLabel("App store availability", {
          exact: true,
        });
        await expect(badges).toBeVisible();
        await expect(
          badges.getByText("Google Play", { exact: true }),
        ).toBeVisible();
        await expect(
          badges.getByText("App Store", { exact: true }),
        ).toBeVisible();
        await expect(
          badges.getByText("Coming soon", { exact: true }),
        ).toHaveCount(2);
        await expect(badges.locator("svg")).toHaveCount(2);
        // Pending store listings are information, never fake or dead links.
        await expect(
          badges.locator("a, button, [role=link], [role=button]"),
        ).toHaveCount(0);
      }

      if (release.available) {
        const download = page.getByRole("link", {
          name: "Download for Android",
          exact: true,
        });
        await expect(download).toHaveAttribute("href", release.href);
        await expect(download).toHaveAttribute("download", "");
        await page
          .getByText("Installation & download integrity", { exact: true })
          .click();
        await expect(page.locator("main code")).toHaveText(release.sha256);
      } else {
        await expect(
          page.getByRole("button", {
            name: "Android release coming soon",
            exact: true,
          }),
        ).toBeDisabled();
        await expect(page.locator('a[href$=".apk"]')).toHaveCount(0);
        await expect(
          page.getByRole("link", { name: "Download for Android", exact: true }),
        ).toHaveCount(0);
      }

      const footerApp = page
        .locator("footer")
        .getByRole("link", { name: "Get app", exact: true });
      await expect(footerApp).toHaveAttribute("href", "/download");
      await expect(footerApp).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}

test("published Android APK matches its release manifest", async ({
  request,
}) => {
  test.skip(
    !release.available,
    "Original release signing key must be restored before an APK can be published.",
  );
  expect(release.href).toMatch(/^\/downloads\/biasharaos-[\d.]+-release\.apk$/);
  expect(release.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(release.bytes).toBeGreaterThan(0);
  const response = await request.get(release.href);
  expect(response.status()).toBe(200);
  const apk = await response.body();
  expect(apk.byteLength).toBe(release.bytes);
  expect(createHash("sha256").update(apk).digest("hex")).toBe(release.sha256);
  // APKs are ZIP archives, so a fallback HTML page cannot pass the download check.
  expect(apk.subarray(0, 4).toString("hex")).toBe("504b0304");
});
