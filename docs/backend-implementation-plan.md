# Shared backend implementation status

Requested: Next.js web and Kotlin Android using shared real accounts and records, a temporary website at `biasharaworld.vercel.app`, free development services, GitHub preservation, and payment gateways later.

- [x] GitHub preservation checkpoint pushed and verified on `backup/backend-progress-2026-10-23`.
- [x] Private tenants/memberships, versioned state, atomic commands, duplicate protection and audit migrations.
- [x] Identity, role and input validation; direct client financial writes denied.
- [x] Web accounts, confirmation/recovery callbacks, empty onboarding and guarded workspace.
- [x] Persisted selling, inventory, customers, expenses, supplier records/quotes and purchasing.
- [x] Branches, stocktakes, transfers, returns, registers, documents, rewards and delivery operations.
- [x] Published shop catalogue, authenticated customer orders and private customer portal.
- [x] Native account gate, encrypted sessions/pending requests and server-confirmed writes to the same API.
- [x] Business-specific commands on both clients; cents retained in native balances and sales.
- [x] Customer sign-in return paths and durable basket/pending-request handling.
- [x] Visible web light/dark toggle; visitor persistence and account-saved workspace preferences.
- [x] Public workspace links and account/business copy replace obsolete demo claims; older APK download disabled pending matching release.
- [x] Report totals from receipts/refunds/cost history; no invented production baseline.
- [x] Final local regression checks: 48 browser/domain checks, 29 API checks, 26 Android JVM tests, lint, types and builds. Hosted and physical-device checks remain separate.
- [ ] Restore hosted network access and verify fresh provider/deployment checks.
- [ ] Update remote callback allowlist for query-bearing account links.
- [ ] Redeploy the connected web/API and verify public/authenticated behavior.
- [ ] Refresh and verify the downloadable APK after the matching API is live.

Release prerequisites remain public email delivery, physical-device link/network checks, production Android signing, monitoring and commercial hosting eligibility. External AI, payment collection, lending, paid billing, automated invitation/supplier messaging and a multi-business account switcher are not connected. Do not mark these complete based on UI presence. See [backend setup](backend-setup.md) and [verification evidence](backend-setup-verification.json).
