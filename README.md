# BiasharaOS · Android + web

BiasharaOS brings sales, inventory, customer balances, purchasing and reports into one business workspace. The Kotlin/Jetpack Compose Android app and responsive Next.js website share account identity and a server-authoritative business API. The design follows the supplied reference with shop photography, white surfaces, pastel summary cards, green actions and compact product lists.

The connected backend is implemented in source and verified with isolated local services. **It has not yet replaced the earlier hosted UI preview.** Cloud proxy access currently prevents final hosted verification/deployment. See [backend setup](docs/backend-setup.md), [implementation status](docs/backend-implementation-plan.md) and [verification evidence](docs/backend-setup-verification.json).

## Develop the website

```sh
cd web
npm ci
npm run dev
npm run lint
npm run build
npm run typecheck
```

Node 20.9+ is required; the prepared cloud environment uses Node 24. Copy `web/.env.example` to an ignored local environment file and supply public account configuration plus the server-only credential. Never place server credentials in public variables or Android settings. The hosted project and CLI workflow are documented in [backend setup](docs/backend-setup.md).

Accounts start with empty business records. Inventory, sales, refunds, invoices, cash registers, stocktakes, branches/transfers, customer balances, supplier records/quotes, purchase orders, deliveries, loyalty, storefront and personal preferences save through authenticated commands. Duplicate requests are safe to retry; conflicting changes require refreshing and reviewing records. Public shops disclose only catalogue information, and customer portals require verified identity.

## Develop Android

Open the repository in Android Studio, sync Gradle and run `app` on Android 8.0+. Requirements: JDK 17/21, Android SDK 35 and Build Tools 35.0.0. The wrapper uses Gradle 8.11.1.

Set ignored `backend.properties` with `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `API_URL`. These are public client settings. The prepared cloud can regenerate them with `python3 tools/configure-android-backend.py`.

```sh
# Prepared cloud toolchain:
source tools/cloud-env.sh
./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
# With a device/emulator attached:
./gradlew :app:connectedDebugAndroidTest
```

The debug APK is generated at `app/build/outputs/apk/debug/app-debug.apk`. For the signed test release, run `python3 tools/build-release.py` after activating the cloud toolchain. See [release and key-backup instructions](docs/android-release.md). Android encrypts session and pending-command data with Android Keystore. Business changes are confirmed by the shared API; local baskets remain drafts. Real production stores reject sample snapshot imports and reset operations. JVM UI tests run without an emulator; real-device networking and account deep links remain unverified.

## Verify the shared backend

```sh
python3 tools/check-backend-connections.py --online
# Isolated actual database/account services for development tests:
python3 tools/local-backend.py start
python3 tools/local-backend.py run -- npm run dev --prefix web -- --port 3001
# Another terminal:
python3 tools/local-backend.py run -- node web/tests/live-backend.mjs
python3 tools/local-backend.py run -- npm run build --prefix web
python3 tools/local-backend.py run -- npm run test:e2e --prefix web
```

The test wrapper leaves production settings unchanged. Integration tests create and clean their own accounts/businesses. Local email capture tests account confirmation/recovery without claiming public email delivery. After local testing, rebuild with real configuration before deployment.

## Current boundaries

Payments are records of money received manually. Daraja, banks and Stripe are deferred. External AI, lending, paid billing and automated supplier/team email messaging are unavailable. Default account email sending is restricted to testing; a shared verified sender remains necessary before public registration. Merchants do not need their own domain.

Use free services during development. Commercial hosting eligibility, production email, Android signing, device verification and deployment checks remain launch work. Never claim that a successful build proves hosted connectivity.

## Source and design

- `app/`: native UI, account/network client, command adapters and tests.
- `web/`: marketing, account/customer surfaces, workspace and server routes.
- `supabase/migrations/`: additive SQL with tenant policies and transactional RPCs.
- `tools/`: reproducible toolchains, isolated integration services and connection checks.
- `design/`: reference previews from the UI phase; they are not current backend acceptance evidence.

Inter and Manrope are bundled under the SIL Open Font License in `third_party/`. Product/shop/financing illustrations are prototype assets. Legacy sample-state tests remain explicitly separated from current live-workspace acceptance tests.
