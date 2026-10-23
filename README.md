# BiasharaOS · Android + web

A native Android UI prototype for the everyday Kenyan entrepreneur. Built in **Kotlin with Jetpack Compose and Material 3**. The UI follows the supplied BiasharaOS reference: photographic shop headers and onboarding, clean white surfaces, pastel metric cards, familiar product imagery, green M-Pesa actions, compact lists and a flat bottom navigation bar.


## Next.js website

The matching responsive web experience lives in [`web/`](web/README.md): a complete public website, account and onboarding UI, and a business workspace. It adds purchase orders, expenses, staff tools, CSV exports and account settings to the shared sales, stock, customer, supplier and reporting experience.

```sh
cd web
npm ci
npm run dev
# Verify: npm run lint && npm run build && npm run typecheck
# Browser workflows: npm run test:e2e
```

Node.js 20.9+ is required. In cloud, run `bash tools/setup-web.sh` from the repository root for a locked install and production checks. Accounts, payments, orders and AI remain frontend demo flows. Web changes persist in browser storage; Android and web do not sync yet.

See [desktop landing preview](design/web/landing-1440.png), [web dashboard](design/web/dashboard-1440.png), and [mobile checkout](design/web/checkout-390.png). Full route coverage, run instructions and UI boundaries are in the [web README](web/README.md).

## Twenty new tools on both platforms

Selling now includes barcode lookup/labels, held baskets, promotions, split payments, partial returns, quotations/invoices and cash registers. Stock adds counts, expiry batches, variants/bundles, movement history and transfers. Growth adds supplier comparison, customer deliveries, loyalty, branches, an online shop and customer portal. Connectivity/activity previews and language/theme/text-size preferences complete the twenty-feature expansion.

Open **More → Explore all 20 business tools** on Android or **Business tools → All business tools** on web. See the [feature checklist](docs/feature-expansion-plan.md), [review guide and demo boundaries](docs/feature-expansion-review.md), [Android review sheet](design/feature-expansion-android.png) and [web review sheet](design/feature-expansion-web.png).

## Android app

Open this folder in a current Android Studio, let Gradle sync, then run `app` on an Android 8.0+ emulator or device.

Requirements: JDK 17 or 21, Android SDK 35, Build Tools 35.0.0. The checked-in wrapper downloads Gradle 8.11.1. Point `ANDROID_HOME` at your SDK or set `sdk.dir` in an ignored `local.properties`.

```sh
./gradlew :app:assembleDebug
./gradlew :app:testDebugUnitTest :app:lintDebug
# With an emulator or device connected:
./gradlew :app:connectedDebugAndroidTest
```

The APK is generated at `app/build/outputs/apk/debug/app-debug.apk`.

## Cloud environment

In the prepared Codex cloud machine, source `tools/cloud-env.sh` before running Gradle, or run `bash tools/setup-cloud.sh`. Native graphics UI previews run on the JVM without an emulator. The optional software emulator is slow and has shown Android system instability in this machine; device instrumentation is not part of the verified cloud checks.

## Explore the UI

- **Home:** daily snapshot, quick actions, sales trend, low-stock alerts, recent sales.
- **New sale:** search products, build a basket, review payment method, complete a demo sale and see its receipt. Stock updates immediately.
- **Sales:** filter by payment method and inspect receipts.
- **Stock:** search and filter products, view details, restock, add a product.
- **Customers:** search, filter balances, add customers, mark sample balances paid.
- **Suppliers:** browse categories, view a supplier, build and review a demo restock order.
- **Reports:** sales, profit and expense previews, week/month selector, product performance.
- **Biashara AI:** interactive suggestions and local sample answers based on current demo stock and balances.
- **Financing:** an honest preview of the future financing experience.
- **Business profile:** edit the demo shop details.
- **Meet Biashara:** a three-step welcome and store setup tour, available from More.

## Scope

This phase prioritises UI and interaction design. There is no backend, authentication, real payment processing, live AI, supplier integration, or lending. Data lives in a ViewModel and is saved to Preferences DataStore, so local business records and display preferences survive app restarts. Reports and historical activity are illustrative. No internet permission is requested. Demo payments and orders are explicitly identified in the UI.

## Structure

`ui/` contains the design tokens, shared controls and screens. `data/DemoStore.kt` and `data/OperationsStore.kt` provide the local business state; `DemoPersistence.kt` snapshots it to DataStore. `MainActivity.kt` hosts navigation and the ViewModel. Unit tests cover basket, stock, receipt, transaction and persistence behaviour. Robolectric native graphics tests exercise checkout and render the screens to `app/build/outputs/ui-previews/`. Compose instrumented tests are also provided for real Android devices.

Shop, product and financing images are generated prototype assets. Inter is used for interface text and tabular amounts; Manrope is used for headings. Both are bundled under the SIL Open Font License in `third_party/`.

## Backend phase

Vercel and Supabase CLI setup is now documented in [backend setup](docs/backend-setup.md). Use `bash tools/backend-cli.sh vercel ...` or `bash tools/backend-cli.sh supabase ...` so credentials remain outside the checkout. Separate hosted projects have been prepared on the existing free accounts; application authentication and database feature integration are the next implementation phase. The current UI continues to use its local demo data.
