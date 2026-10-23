# BiasharaOS web

The responsive **Next.js App Router + React + TypeScript** companion to the Kotlin Android app. It shares the emerald, pastel and white palette, Inter interface text, Manrope headings, photography and sample shop from the app. All fonts and images are local; there are no external UI assets or runtime API requirements.

## Run

Requires Node.js 20.9+ (verified with Node 24.19.0).

```sh
cd web
npm ci
npm run dev
```

The server binds to `0.0.0.0` on port 3000. For a production preview:

```sh
npm run build
npm run start
```

For the prepared cloud machine, `bash tools/setup-web.sh` from the repository root installs the locked dependencies and runs lint, the production build and TypeScript checks. It uses a writable temporary npm cache rather than the read-only home directory. This is separate from `tools/setup-cloud.sh`, which verifies Android.

## Explore

| Area                   | Pages and interactions                                                                                                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public website         | Landing, features, four industry solutions, monthly/yearly proposed pricing, about, contact form preview, searchable help centre, three business guides, Android download, draft privacy and terms                                              |
| Account UI             | Email sign-in/sign-up, password visibility, Google sign-in explanation, password reset preview and a three-step business setup                                                                                                                  |
| Everyday workspace     | Overview, searchable sales and receipt downloads, product checkout, payment method previews, stock filtering and restocking, product creation, customer directory and repayments                                                                |
| Desktop business tools | Supplier catalogues, draft purchase orders and receiving, expense ledger, reports and CSV exports, local assistant, financing preview, team directory and role selector, business profile, notification preferences, plan picker and demo reset |

There are 61 concrete pages, including the twenty new feature areas, their hub, merchant shop and customer portal. The public site and workspace both adapt to phones, tablets and desktops. Public navigation, mobile drawers, dialogs, forms, searches, filters, download controls and exports are interactive.

## UI-first scope

This is a frontend prototype, not a production business service. The account UI **does not authenticate or create real accounts**. Passwords are never persisted. No M-Pesa request, card charge, supplier order, email, invitation, loan application or external AI call is sent. Contact and password-reset completion screens explain this directly. Plans are proposed launch pricing and billing is inactive; permissions and role descriptions are previews.

Workspace changes are saved under `biasharaos.demo.v2` (v1 data migrates automatically) in this browser’s local storage. Reloads preserve products, stock, sales, balances, expenses, orders, team, profile and preferences. Settings → Demo & data restores the initial sample shop. Checkout/held baskets, receipts, branch stock, counts, transfers, documents, deliveries, rewards and display preferences also persist. The assistant conversation lasts while its page stays mounted. Private browsing may limit persistence. Web and Android data do not sync.

Today’s sales start from a KES 12,450 sample baseline; the five listed historical receipts are a subset. New sales are added to the baseline. Stock, balances and expenses respond to demo changes. Profit, historical comparisons, chart trends, supplier details and product rankings are labelled illustrative. This preview is not an accounting system.

The privacy and terms pages are starter drafts describing this prototype, to be replaced with the operating entity’s actual policies before public launch. The Android download is the genuine debug UI-preview APK, not a production-signed release.

## Checks and browser review

```sh
npm run lint
npm run typecheck
npm run build
npm run format:check
npm run test:e2e
npm run capture
```

Playwright starts the production server or reuses a running one. In cloud it uses `/usr/bin/chromium` automatically. On other machines run `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a compatible installed Chromium. The 44 Playwright checks include twenty feature screens, ten transaction contracts, connected shop/delivery and stocktake/transfer workflows, language/theme/text persistence, storage recovery, and the original eight browser workflows. The original workflows cover navigation, pricing, account setup, password non-persistence, checkout and receipts, stock persistence, repayments and assistant data, purchasing and receiving, expense totals, team invitations, reset, exports and mobile navigation. Browser contexts are isolated per test.

`npm run capture` visits all 61 concrete pages at 1440, 1024, 768, 390 and 360 px widths, reports JavaScript errors and horizontal page overflow, and writes screenshots to `design/web/`. It requires a running server on port 3000. Browser report and traces are in ignored `playwright-report/` and `test-results/`.

Semantic landmarks, a skip link, labelled controls, visible keyboard focus, reduced-motion support, native modal focus trapping/Escape, and live toast messages are included. Wide data tables scroll inside their panels on phones. SEO titles, descriptions, an icon, social metadata and robot exclusions for demo account/workspace routes are included. Add the real public domain before configuring canonical URLs and a production sitemap.

## Structure

- `src/app/(marketing)/`: public page wrappers and metadata.
- `src/app/(auth)/`: account and onboarding previews.
- `src/app/dashboard/`: workspace routes, loading state and shared shell.
- `src/components/`: shared controls, marketing sections, account UI and business screens.
- `src/lib/data.ts`: typed sample data and editorial content.
- `src/lib/store.tsx`: local demo store exposed through React’s external-store API; server rendering uses a stable initial snapshot.
- `src/lib/csv.ts`: real CSV downloads with formula-prefix protection.
- `src/app/globals.css`: shared design tokens and responsive layouts.
- `e2e/`: meaningful browser workflows.

Images are generated prototype assets shared with Android. Font licenses are retained in `public/fonts/` and the root `third_party/` directory.

## Extended workspace

Start at `/dashboard/tools`. Selling adds scanner/labels, held baskets, promotions, split payments, returns, quotations/invoices and registers. Stock adds stocktakes, expiry, variants/bundles, movements and transfers. Growth adds supplier comparison, deliveries, loyalty, branches, online-shop settings and customer portal preview. Connection activity and personalisation complete the twenty tools.

The separate customer shop is `/shop/wanjiku`, and Mary's local customer preview is `/portal/6`. Merchant and customer surfaces share this browser's state. No secure/public customer account is created. Settings let you choose English/Kiswahili, Light/Dark/System and larger text across these surfaces. See [the full review guide](../docs/feature-expansion-review.md) for transactions, localisation scope and integration boundaries.

`node scripts/review-expansion.mjs` adds dark/Kiswahili/large-text screenshots and checks checkout at 200% text. Update shared interface phrases with `python3 tools/generate-locales.py` from the repository root. `node scripts/generate-seed.mjs` from `web/` regenerates the shared catalogue/operation seed used by Android. Regenerate intentionally, then run both platforms' checks.
