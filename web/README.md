# BiasharaOS website and application API

Next.js 16.4.2, React 19.3.1 and TypeScript power the public website, accounts, merchant workspace, customer shop/portal and shared Android/web business API. Start with the [repository README](../README.md) and [backend setup](../docs/backend-setup.md).

## Commands

```sh
npm ci
npm run dev
npm run lint
npm run build
npm run typecheck
npm run test:e2e
```

Production configuration belongs in ignored `.env.local` and hosting settings. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` identify the public account client. `SUPABASE_SECRET_KEY` is server-only. For isolated tests use `python3 tools/local-backend.py run -- ...` from the repository root, as documented in backend setup. A browser build embeds its public settings: rebuild with real settings before deploying.

## Data and identity

The production store starts empty and requires a real authenticated account. Commands include a business ID, revision and durable request ID. The server checks membership, roles and schema validation before committing financial state, personal workspace drafts and audit input in one database transaction. Clients cannot upload authoritative snapshots. Pending browser requests survive a tab reload and can be retried safely.

Public `/shop/[slug]` exposes a published catalogue and accepts verified-account orders. `/portal/[slug]` requires a verified account and matches the user's own records. Numeric preview customer URLs grant no access. Signing in from a shop preserves its basket and returns the customer to that shop. Confirmation/recovery use PKCE callbacks; remote redirect allowlists must match query-bearing callback URLs.

Current sessions use the account SDK's browser storage and bearer tokens for API requests. Server routes validate every token; dashboard rendering is guarded on the client. There is no cookie-based server-rendered personalized workspace in this implementation.

## Features and limits

Sales/stock/customer/supplier operations and all twenty business tools use shared records. Reports derive totals and cost history from saved transactions. Supplier quotes are merchant-entered. Contact forms save private inquiries with limits. Generated marketing examples remain illustrative.

Payment methods record money already received. External payment collection, hosted AI, lending, paid billing, invitation emails and supplier notifications are not connected. The default test email sender does not establish public confirmation/reset delivery. See the backend implementation checklist for remaining deployment and device work.

## Verification

Playwright starts a production server on port 3002 after a current build. It uses an installed Chromium or `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. The current suite includes domain invariants, empty authenticated screens, real sign-in/product persistence/logout, lost-response retries, customer sign-in/basket/ordering and local captured-email confirmation/recovery. Email checks skip explicitly outside the isolated local service. Legacy browser-local demo specifications under `tests/legacy-ui/` are historical, not current acceptance checks.

`tests/live-backend.mjs` exercises the actual application API and database policies with isolated confirmed test accounts. It tests tenant isolation, denied snapshot/RPC writes, duplicate/concurrent requests, financial/stock operations, staff permissions, public catalogue privacy and private customer orders. The runner reports which service host was tested.

## Structure

`src/app/` holds routes and API handlers. `src/lib/backend/` contains schema validation, empty state, authentication, reports and public-shop projection. `src/lib/store.tsx` provides the async confirmed-command store. `src/lib/operations.ts` supplies shared transaction invariants. `src/components/` holds interface components, and `src/app/globals.css` defines responsive design tokens. Legacy `DemoProvider`/`useDemo` names are internal identifiers and do not enable production sample data.
