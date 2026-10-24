# Frontend/backend integration audit — 24 October 2026

This pass checks the existing shared business command API and Android/web contracts. Funding and onboarding migrations are being implemented separately and require their own deployment checks. No production migration was applied by this audit.

## Repaired contracts

- **Bank payments:** The API schema accepted `Bank transfer` and the legacy `Bank` label, but the shared checkout engine and Android demo engine rejected both with an incorrect amount-mismatch error. API validation and shared execution now use one payment-method list; Android accepts the same methods. Exact minor-unit totals remain mandatory.
- **Product lookup:** Web forms and scanners treat SKUs without regard to case, while authoritative add/edit commands previously allowed `COFFEE` and `coffee` to coexist. Server uniqueness now follows the same case-insensitive rule.
- **Barcode integrity:** Full add/edit product commands could bypass the dedicated barcode action's EAN check-digit and uniqueness rules. These commands now validate check digits and reject a barcode already used by another product, including generated default codes.
- **Purchase orders:** A bundle could be saved as a purchase-order item even though goods receipt only supports individual stock items. The command now rejects the bundle before saving; purchase the components instead. The web supplier UI is being aligned by the primary agent.
- **Creation results:** Shared variant and bundle creation saved the product but omitted its identifier from the command result. Both now return the created product ID so clients can address the confirmed record.

## Verification completed

- Shared backend/domain and operation suites: **21 passed**, zero failed. Includes all five accepted manual payment labels at an exact 1,025-minor-unit total, SKU/barcode collisions, bundle purchasing, authorization, document IDs/payment replay, stock, refunds, register reconciliation and branch projections.
- Focused Android suite: **19 passed**, zero failed. Covers input validation, native operation contracts including bank labels, persisted/retried request identity, account-scoped drafts, image-path isolation and role boundaries.
- Existing hosted API baseline: **29 passed**, zero failed, against `https://biasharaworld.vercel.app` using disposable confirmed accounts and business records. Covered tenant RLS, blocked direct snapshots/RPC, revision conflicts and concurrent writes, idempotency, stock/batches/checkout/refunds, invoices, registers/counts/transfers, purchasing, preferences, audit inputs, team invitation/roles, published shops and private customer portals. Temporary accounts and records were removed after the run.

Logs are outside the checkout under `/workspace/.biashara-verification/integration-*.log`. The hosted baseline exercises the previously deployed backend; the repaired contracts require the primary agent's new production deployment and final browser/native checks.

## Review of new services

The funding API uses owner authorization, revision checks, request-ID/hash replay protection and explicit provider-pending states. Verification readiness writes are server-authoritative after the forward migration `20261024021000_verification_api_writes.sql`; authenticated clients retain owner-scoped reads but cannot submit a status directly through the database. Actual identity verification, lender decisions and disbursal remain provider integrations, not implied by a saved readiness profile or funding request.

## Final funding and verification service checks

- Fixed funding phone validation so punctuation-only values and phone numbers outside 7–15 digits are rejected when recording a request.
- A colliding application ID from another business now returns a non-disclosing 404 instead of 503. Clients can clear the rejected pending request instead of being stuck retrying a request that can never succeed.
- Corrected the funding-readiness test fixture to use the current receipt and sale-line contracts without a type assertion hiding extra fields.
- **3 pure funding tests passed**, covering comparison arithmetic, complete Kenya-market/contact/consent validation, and business-wide readiness with global expenses deducted once regardless of the selected branch.
- **30 connected funding/verification checks passed** against the combined local API build and production Supabase project. They exercise anonymous/foreign/staff denial, concurrent duplicate saves, revision conflicts, replay before changed readiness, the actual validated readiness PUT (not an admin status shortcut), both declarations, Kenya market gating, immutable submitted/withdrawn requests, owner-only table reads, blocked direct table/RPC writes and a private idempotency ledger. Temporary accounts and business/application records were removed and cleanup responses were checked.
- Funding schema/API/test lint and TypeScript checks passed. Logs are in `/workspace/.biashara-verification/funding-audit-*.log`. The primary agent remains responsible for the final deployed-production run.

Readiness profile saves replace the owner's profile as a whole; they do not yet have funding-style revision conflict detection across devices. They are preparation details only, not a verified identity result. Android setup draft business scoping was separately flagged to the Android completion agent; device-vault behavior belongs to that agent's final checks.

Physical-device camera/gallery/printing, actual SMTP delivery, third-party verification and lending providers were not exercised in this audit. Frontend photo/camera workflows and dark-mode screenshots are covered by the primary and UI agents' separate checks.
