# BiasharaOS web

This Next.js App Router application serves the public website, account flows and the business workspace. Supabase handles sign-in and persistent business data. The Android app uses the same workspace API.

## Run locally

Use Node.js 20.9 or later. The cloud setup uses Node.js 24 and the package lockfile. The live workspace needs a Supabase instance with the migrations in `../supabase/migrations/` applied.

On the prepared Codex cloud machine, start local Supabase and the Next.js development server:

```sh
cd /workspace/biasharaworld
/workspace/.toolchains/biashara/start-local-backend
cd web
/workspace/.toolchains/biashara/with-local-backend npm run dev
```

For another machine, run `npm ci` in `web/`, start Supabase from the repository root and configure `web/.env.local` using `.env.example` and the local Supabase credentials. Set `SUPABASE_SECRET_KEY` for the server routes and keep it out of browser and Android builds. The development server listens on port 3000.

## Workspace

- **Accounts and business setup** support email signup, confirmation, sign-in, password recovery and an empty workspace for a new business.
- **Selling and inventory** cover checkout, held baskets, split payments, returns, stocktakes, batches and transfers. Checkout records payments received by the merchant.
- **Business management** includes customers and repayments, expenses and CSV export, supplier quotes, internal purchase orders, goods receipt, reports and role-based team access.
- **Public shop and customer portal** expose published product information and let authenticated customers see their own orders. Owners must complete identity verification to publish and receive new orders. Use the shop link generated in your business workspace.

Workspace writes go through `/api/workspace`. The server verifies identity and role, checks the current revision and saves the command and its result with a request ID. Client drafts cover personal workspace state such as the active branch and basket. Business data persists in Supabase.

Connect a production email provider and verify signup and recovery delivery before inviting customers. Team invitations are recorded and claimed by a signed-in user with the verified email address. Automatic invitation delivery, financing and external AI remain outside the current release. Delivered customer orders can use Paystack after a verified merchant connects a supported Kenyan bank account. [Kenyan payment setup](../docs/kenya-payments.md) See the launch checklist for deployment and Android acceptance work. [Release checklist](../docs/backend-implementation-plan.md)

Set `ANDROID_RELEASE_DOWNLOAD_URL` before building the site once a signed Android release is available. The download page displays the release status when this setting is empty.

Use the pilot runbook for the Preview provider settings, signing webhooks and redeploying staging. Use `npm run providers:check` to validate the selected settings before exercising the sandbox workflows. [Provider activation](../docs/kenya-pilot-runbook.md#provider-activation) · [Merchant verification](../docs/merchant-verification.md)

## Verify

With local Supabase running, use the cloud helpers to build and run tests against disposable local accounts:

```sh
cd /workspace/biasharaworld/web
npm run lint
/workspace/.toolchains/biashara/with-local-backend npm run build
npm run typecheck
/workspace/.toolchains/biashara/with-local-backend npm run test:e2e
```

The Playwright configuration starts a production server on port 3002 and uses Chromium. It runs the domain operations suite and the authenticated browser suite. Reports and traces are in ignored `playwright-report/` and `test-results/` directories.

With the development server running on port 3000, run the API integration suite:

```sh
TEST_BASE_URL=http://127.0.0.1:3000 /workspace/.toolchains/biashara/with-local-backend node tests/live-backend.mjs
```

The integration suites create users and business records and then clean them up. Use a disposable backend for these suites. The superseded browser demo tests are retained under `tests/legacy-ui/`. [Legacy test notes](tests/legacy-ui/README.md)

## Source layout

- `src/app/` contains the page and API routes.
- `src/components/` contains the website and workspace UI.
- `src/lib/backend/` validates account access and business commands.
- `src/lib/operations.ts` contains shared business rules used by the web client and server.
- `e2e/` and `tests/live-backend.mjs` cover browser and API behavior.
