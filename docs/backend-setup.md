# Backend development and hosting

BiasharaOS uses one shared account service and business API for the Next.js website and Kotlin Android app. Production stores start empty; failures never fall back to sample records. The hosted backend update is **not yet deployed**. The existing public alias belongs to an earlier UI preview.

## Hosted resources

- Website/API: `https://biasharaworld.vercel.app`, project `biasharaworld`, scope `biasharaworld`, root directory `web`, Node 24.
- Shared Auth/PostgreSQL: dedicated free project `rhgoiebknrpxtouswaar`, region `eu-west-2`.
- Official CLIs: Vercel 65.2.0 and Supabase 2.122.0 through `bash tools/backend-cli.sh vercel|supabase ...`.
- Credentials and CLI state remain outside Git under `/workspace/.config/biashara-cli`. Never print them. Browser and Android receive only the public account URL/key. `SUPABASE_SECRET_KEY` is server-only, including in Vercel preview/production.
- Six additive migrations through `20261023131500_contact_inquiries.sql` were applied remotely in the preceding implementation phase. `tools/apply-backend-migrations.py` records hashes in `app_migrations.applied`; do not edit applied migrations. Official CLI migration history is not registered, so do not blindly run `supabase db push` against this project.

Use existing authentication before starting another CLI login. An API connection failure does not establish that credentials expired. No paid upgrade is authorized. Vercel Hobby commercial-use eligibility still needs resolving before commercial launch; the current request is a temporary development deployment.

## Current connectivity boundary

On 23 October 2026 this workspace's proxy rejected tunnels to both provider APIs, the exact account project host and the public website with HTTP 403. The saved environment configuration already includes the six required hosts, but the running instance is still blocked. Local passing checks do not establish hosted readiness or email delivery.

`python3 tools/check-backend-connections.py` verifies that web and Android use the intended production project/API and checks available browser/APK outputs for accidental server-key inclusion. Add `--online` to request separate hosted health checks. This command neither deploys nor rewrites configuration.

## Application behavior

The browser and Android authenticate through Supabase Auth and send bearer-authenticated commands to the Next.js API. Each command names its business, revision and unique request ID. The server validates identity, membership, role, amounts and stock before a database transaction commits state, personal drafts and audit input together. Retry IDs prevent duplicate financial records; concurrent changes produce a conflict requiring review.

Tenant RLS prevents unrelated users reading business records. Direct clients cannot write authoritative snapshots or invoke financial RPCs. Public shops expose only published catalogue fields. Customer order/portal access uses verified account identity and recorded order ownership. Saved team invitations grant access when the matching verified account signs in; invitation emails are not connected.

Reports use recorded receipts, refunds, item-cost snapshots and expenses. Supplier records/quotes are entered by the merchant. Cash, M-Pesa and card entries record payments already received; they do not collect money. External AI, lending, paid subscriptions and supplier messaging remain unavailable. Contact forms save private inquiries, without claiming an email notification.

The initial storage model uses a versioned business document plus relational memberships, order ownership and audit entries. It suits the current small-business stage; normalization and larger-scale analytics are future work. Default workspace selection prefers an owned business, then the first membership. A multi-business account switcher is not implemented; commands are explicitly bound to the business being edited.

## Local integration checks when hosted access is blocked

A small isolated test stack uses real Postgres 17, Supabase Auth, PostgREST and captured email. It does not replace production settings or emulate successful responses.

```sh
python3 tools/local-backend.py start
python3 tools/local-backend.py status
python3 tools/local-backend.py run -- npm run dev --prefix web -- --port 3001
# In another terminal:
python3 tools/local-backend.py run -- node web/tests/live-backend.mjs
python3 tools/local-backend.py run -- npm run build --prefix web
python3 tools/local-backend.py run -- npm run test:e2e --prefix web
```

Docker must be available. Ports bind only to loopback. Container names use `biashara_test_*`; private generated test credentials remain outside Git. Never reset containers automatically to fix an interrupted setup. Inspect test-owned service state first. The full Supabase CLI Postgres image exceeded this machine's Docker layer space; this smaller stack runs the application's SQL migrations on official Postgres 17. It does not validate hosted infrastructure extensions or physical Android networking.

The wrapper injects temporary process variables. It does not alter `web/.env.local`, `backend.properties` or hosted settings. Rebuild with production variables before deploying; do not publish a browser build compiled with local test URLs. Browser tests create and clean their own accounts/businesses. The email suite runs only with the local capture service and does not claim external mail delivery.

## Production configuration and remaining release steps

1. Restore runtime access to `api.supabase.com`, `api.vercel.com`, `supabase.com`, `vercel.com`, `rhgoiebknrpxtouswaar.supabase.co` and `biasharaworld.vercel.app` through environment settings. Saving a draft alone does not activate the policy.
2. Verify existing CLI sessions and remote migration hashes. Preserve all unrelated projects. Update the remote Auth redirect allowlist to permit the web callback's safe `next` and recovery query parameters; local `supabase/config.toml` already describes the intended callbacks.
3. Confirm actual sender configuration. Public confirmation/reset mail remains restricted by the default test sender and its two-email/hour limit. The founder has no domain; merchants need not own one. A shared verified sender remains a launch prerequisite, not an invitation to borrow a user's domain.
4. Build/lint/type-check web with real ignored configuration, regenerate public Android settings with `tools/configure-android-backend.py`, and run Android tests/lint/build. Check both outputs with the connection-check helper.
5. Deploy the web/API from the repository root:
   `bash tools/backend-cli.sh vercel deploy --prod --yes --scope biasharaworld --project biasharaworld --logs`.
6. Verify the public homepage, anonymous API rejection, a real authenticated workflow, tenant isolation and safe retry against the deployment. Then refresh the downloadable debug APK, enable its download button, remove the `*.apk` deployment exclusion, redeploy and verify its download/hash. The button is currently disabled to avoid distributing the earlier design-only package; Git still ignores generated packages. Do not distribute a connected APK against an older demo-only API.

Device account-link handling, Android networking on an actual device, production SMTP, commercial hosting eligibility, monitoring and production-signed Android distribution remain release work. Daraja, banks and Stripe remain deferred.
