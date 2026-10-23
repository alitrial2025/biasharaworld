import { chromium } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const dir = "../design/web";
mkdirSync(dir, { recursive: true });
const routes = [
  "/",
  "/features",
  "/solutions",
  "/solutions/retail",
  "/solutions/minimarkets",
  "/solutions/wholesale",
  "/solutions/services",
  "/pricing",
  "/about",
  "/contact",
  "/help",
  "/resources",
  "/resources/know-your-numbers",
  "/resources/restock-with-confidence",
  "/resources/manage-customer-credit",
  "/download",
  "/privacy",
  "/terms",
  "/login",
  "/signup",
  "/forgot-password",
  "/onboarding",
  "/dashboard",
  "/dashboard/sales",
  "/dashboard/sales/new",
  "/dashboard/inventory",
  "/dashboard/customers",
  "/dashboard/suppliers",
  "/dashboard/suppliers/kifaru",
  "/dashboard/suppliers/bidco",
  "/dashboard/suppliers/twiga",
  "/dashboard/orders",
  "/dashboard/expenses",
  "/dashboard/reports",
  "/dashboard/assistant",
  "/dashboard/financing",
  "/dashboard/team",
  "/dashboard/settings",
];
routes.push(
  ...[
    "tools",
    "scanner",
    "baskets",
    "promotions",
    "split-payments",
    "returns",
    "documents",
    "register",
    "stocktakes",
    "expiry",
    "variants",
    "movements",
    "transfers",
    "compare",
    "deliveries",
    "loyalty",
    "branches",
    "online-shop",
    "customer-portal",
    "sync",
    "preferences",
  ].map((slug) => `/dashboard/${slug}`),
  "/shop/wanjiku",
  "/portal/3",
);
const errors = [];
const overflow = [];
for (const width of [1440, 1024, 768, 390, 360]) {
  const context = await browser.newContext({
    viewport: { width, height: width === 1440 ? 1050 : 844 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of routes) {
    const response = await page.goto("http://127.0.0.1:3000" + route);
    await page.evaluate(() => document.fonts.ready);
    if (response.status() !== 200) errors.push(`${route} ${response.status()}`);
    const spill = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    if (spill.scroll > spill.width + 1)
      overflow.push({ route, width, ...spill });
    const names = {
      "/": "landing",
      "/dashboard": "dashboard",
      "/dashboard/sales/new": "checkout",
      "/pricing": "pricing",
      "/signup": "signup",
      "/dashboard/inventory": "inventory",
      "/dashboard/assistant": "assistant",
      "/dashboard/tools": "tools",
      "/dashboard/compare": "compare",
      "/dashboard/transfers": "transfers",
      "/dashboard/loyalty": "loyalty",
      "/shop/wanjiku": "shop",
      "/portal/3": "portal",
    };
    if (names[route] && [1440, 390].includes(width)) {
      await page.screenshot({
        path: `${dir}/${names[route]}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await context.close();
}
await browser.close();
console.log(
  JSON.stringify(
    { routesChecked: routes.length * 5, errors, overflow },
    null,
    2,
  ),
);
if (errors.length || overflow.length) process.exitCode = 1;
