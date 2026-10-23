import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const errors = [],
  overflow = [],
  broken = [];
for (const width of [1440, 390]) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:3000/dashboard/preferences");
  await page.getByLabel("Appearance").selectOption("dark");
  await page.getByLabel("Reading size").selectOption("130");
  await page.getByLabel("Language / Lugha").selectOption("sw");
  for (const route of [
    "/dashboard",
    "/dashboard/tools",
    "/dashboard/sales/new",
    "/dashboard/inventory",
    "/dashboard/compare",
    "/dashboard/preferences",
    "/shop/wanjiku",
    "/portal/6",
    "/pricing",
    "/signup",
  ]) {
    await page.goto("http://127.0.0.1:3000" + route);
    await page.waitForFunction(() => document.documentElement.lang === "sw");
    await page.evaluate(() => document.fonts.ready);
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      )
    )
      overflow.push({ width, route });
    const invalid = await page.evaluate(() =>
      [...document.images]
        .filter((i) => i.complete && !i.naturalWidth)
        .map((i) => i.src),
    );
    if (invalid.length) broken.push({ route, invalid });
    await page.screenshot({
      path: `../design/web/expanded-${route === "/" ? "landing" : route.replaceAll("/", "-").slice(1)}-dark-sw-large-${width}.png`,
      fullPage: true,
    });
  }
  await context.close();
}
// At 200% browser text zoom a keyboard user can still reach and dismiss the checkout dialog.
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();
await page.goto("http://127.0.0.1:3000/dashboard/sales/new");
await page.evaluate(() =>
  document.documentElement.style.setProperty("--text-scale", "2"),
);
await page
  .getByRole("button", { name: "Add Soko Maize Flour to sale", exact: true })
  .click();
await page.getByRole("button", { name: "Record demo sale" }).click();
await page.getByRole("dialog").waitFor();
await page.keyboard.press("Escape");
if (await page.getByRole("dialog").isVisible())
  errors.push("Escape did not dismiss receipt");
if (
  await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth + 1,
  )
)
  overflow.push({ width: 390, route: "checkout at 200%" });
await context.close();
await browser.close();
const result = {
  themes: ["dark"],
  languages: ["sw"],
  textSizes: [130, 200],
  screenshots: 20,
  errors,
  overflow,
  broken,
};
writeFileSync(
  "../design/web/expansion-review.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
if (errors.length || overflow.length || broken.length) process.exitCode = 1;
