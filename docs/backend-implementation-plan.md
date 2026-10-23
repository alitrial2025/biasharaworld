# Live backend implementation

Requested: temporary Vercel website at biasharaworld.vercel.app; real shared Supabase accounts and business data on Next.js and Kotlin. No push or paid upgrade; payment gateways are deferred.

- [ ] Public Vercel deployment and verified alias
- [ ] Private tenants, membership, versioned data, idempotency and audit migrations
- [ ] Server-authoritative domain commands with concurrency protection
- [ ] Web signup, confirmation, login, recovery, expiry and logout
- [ ] Empty business onboarding; inventory, customers, expenses and procurement
- [ ] Selling, stock, branches, loyalty and customer-order tools
- [ ] Public storefront and protected customer access
- [ ] Team role enforcement
- [ ] Reports from records; truthful unavailable integrations
- [ ] Native authentication, shared API and server-confirmed writes
- [ ] Tenant isolation, duplicate/concurrent writes and failure tests
- [ ] Web/browser verification; Android tests/lint/build; refreshed APK
- [ ] Redeployment, review docs and saved environment instructions

Supabase Auth validates identity; membership controls tenant access. Next.js executes domain commands against server-owned business state. A database transaction checks membership, revision and idempotency and commits business and personal workspace drafts together. Browser and Android never upload authoritative snapshots. This initial document-state schema suits small businesses; normalization and reporting scale are later improvements, without weakening transactional validation.
