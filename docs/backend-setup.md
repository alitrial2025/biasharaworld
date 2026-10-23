# Backend setup: Vercel + Supabase

This starts the backend phase without replacing the working Android/web demo or connecting payment providers.

## Stack and cost decisions

- **Vercel:** the Next.js web application and server routes. Remain on the existing free account during development; no paid upgrade or production deployment is part of CLI authentication. Vercel Hobby is limited to personal, non-commercial use. Resolve commercial hosting eligibility before launch; an upgrade or a suitable alternative host is a separate decision.
- **Supabase:** shared Auth, PostgreSQL, Row Level Security and Storage for web and Kotlin. Start within Free plan limits; no paid project size or add-ons.
- **Email:** configure production SMTP before opening registration to customers. A service such as Resend is an option; domain verification and its current free quota must be checked when configured. Supabase's development email service is not a production mail-delivery plan.
- **Optional later:** Sentry for errors, Cloudflare Turnstile for public-form protection, and GitHub Actions for CI. Add them when needed rather than creating more accounts now.
- **Payments later:** Daraja, bank integrations, then Stripe. Keep provider secrets, signed webhooks, idempotency and reconciliation on the server. Current demo payment buttons must not claim to collect real money.

Current pricing references checked on 23 October 2026: [Vercel Hobby](https://vercel.com/docs/plans/hobby) and [Supabase pricing](https://supabase.com/pricing). Supabase Free lists 50,000 monthly active users, a 500 MB database, 1 GB file storage, 5 GB egress plus 5 GB cached egress, a two-active-project limit, and pausing after one week of inactivity. These are limits to budget against, not a guarantee that every startup workload remains free.

## CLI installation and login

The official CLIs are pinned to **Vercel 65.2.0** and **Supabase 2.122.0**, installed outside the checkout. Use the helper so commands work with this cloud machine's read-only home directory:

```sh
bash tools/setup-backend-cli.sh
bash tools/backend-cli.sh vercel whoami
bash tools/backend-cli.sh vercel project ls --json
bash tools/backend-cli.sh supabase projects list --output-format text
bash tools/backend-cli.sh supabase orgs list --output-format text
```

For an expired login, start a fresh browser flow:

```sh
bash tools/backend-cli.sh vercel login
bash tools/backend-cli.sh supabase login --no-browser --name 'BiasharaOS cloud development'
```

Use the URL printed by that invocation. Supabase asks for the new browser verification code at its terminal prompt. The cloud has no persistent desktop keyring, so the helper uses Supabase's supported `SUPABASE_NO_KEYRING=1` file storage with a private `SUPABASE_HOME`. Credentials stay outside the repository under `/workspace/.config/biashara-cli`; token files must remain mode 0600. Do not print their contents, commit them, paste permanent tokens into chat, or put management tokens in application environment variables. Browser login approval alone is not sufficient evidence: verify a subsequent project-list command in a new process.

The helper supports `BIASHARA_CLI_ROOT`, `BIASHARA_CLI_CONFIG` and `BIASHARA_CLI_CACHE` overrides for another development machine. It does not repurpose `HOME`.

## Project configuration

- The Vercel project is **biasharaworld**, under the **biasharaworld** account. The local Next.js folder is `web/`; generated Vercel link files are ignored.
- `supabase/config.toml` was created by the official CLI. It describes the local development stack and is linked to the hosted development project; no application schema migration has been applied.
- A separate **BiasharaOS** project was created in the Free `biasharaworld` organization after checking its plan, as requested. Its reference is `rhgoiebknrpxtouswaar`, region `eu-west-2` (London), and its project status was `ACTIVE_HEALTHY`. Existing projects were left untouched. The local Supabase directory is linked to this project.
- Its public Supabase URL and publishable client key are configured in ignored `web/.env.local` and Vercel's development, preview and production environments. This configures future application clients; the existing UI is still in demo mode.
- The generated database password is stored only in a mode-0600 file outside the checkout at `/workspace/.config/biashara-cli/supabase/biasharaworld-database-password`. It is not in this document, source control, application public environment or Vercel client settings. Rotate/manage it through the Supabase dashboard when needed.
- `web/.env.example` documents the future public client settings. Real values belong in ignored local environment files and Vercel's environment settings. A Supabase publishable/anon client key is public and still requires RLS; a secret/service-role key must never reach either web or Android clients.
- There is no database migration, live authentication integration or production deployment yet. CLI platform authentication is separate from app customer authentication.

## First backend implementation

1. **Auth on web and Android:** email/password, confirmation, sign-in, password reset, sign-out and durable sessions. Use Supabase SSR cookie handling for Next.js and an appropriate Kotlin client. Make demo mode explicit; never turn a failed real login into a successful demo session.
2. **Business and team ownership:** businesses, profiles, memberships, roles, branches and branch assignments. Every tenant-owned row needs a business ID. Enforce membership and branch access with RLS and server checks, not the selected business in the UI.
3. **Shared product/inventory model:** products, variants, bundles, per-branch stock, batches and an append-only movement ledger. Use integer minor units for money. Implement stock adjustments, reservations, transfers and checkout as atomic database transactions with duplicate-request protection.
4. **Connect the existing features:** sales/receipt lines, returns, registers, customer balances, suppliers, purchasing, invoices, loyalty and fulfilment. Server totals and permission checks become authoritative; local demo records are not automatically imported into real business data.
5. **Public surfaces:** expose only published shop catalogue fields. Customer portals must verify the customer's identity; predictable customer IDs and shop slugs are not access controls.
6. **Operations and launch:** migrations in version control, RLS tests with two unrelated businesses, preview/production environment separation, real SMTP, backups/export strategy, monitoring and hosting-plan review. Keep all paid services opt-in.

No Daraja, bank or Stripe credentials are required for this first backend phase.

## Network and validation

CLI sign-in and separate read-only project/account commands succeeded for both providers. Vercel confirms Next.js, Node 24 and the `web` root directory. Supabase confirms the separate project is healthy and linked. CLI authentication persistence is verified through the private token file, not just the browser success screen.

Cloud development needs `vercel.com`, `api.vercel.com`, `supabase.com`, `api.supabase.com` and the exact application host `rhgoiebknrpxtouswaar.supabase.co`. The first four provider domains are reachable. The new project host returned a cloud-proxy HTTP 403 before its network addition, so Auth/database API smoke checks must be retried after the network setting takes effect. A saved environment draft is separate from applied runtime access and publication.

The current machine does not need a database migration or public deployment merely to authenticate the CLIs. No application tables, policies, payment connections or paid upgrades were created during this setup.

Provider dashboards: [Vercel project](https://vercel.com/biasharaworld/biasharaworld) · [Supabase project](https://supabase.com/dashboard/project/rhgoiebknrpxtouswaar). The website production build and TypeScript check still pass with the saved public connection settings. See `docs/backend-setup-verification.json` for the completed checks and the outstanding project-host proxy check.
