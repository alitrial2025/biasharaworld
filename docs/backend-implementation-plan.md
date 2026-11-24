# BiasharaOS release checklist

The web workspace and Android app share Supabase Auth and the Next.js workspace API. Supabase stores business and personal workspace state. The API validates identity and role, and the database atomically checks the revision and request ID when it saves a command. Existing hosted projects are the Vercel project `biasharaworld/biasharaworld` and Supabase project `rhgoiebknrpxtouswaar`.

## Implemented in this branch

- Shared email/password accounts, business onboarding, role enforcement, revision checks and idempotent command retries.
- Sales, inventory, transfers, expenses, customers, supplier quotes, internal purchase orders, goods receipt and reports backed by business records.
- Public storefront and authenticated customer order access. Merchant verification is required before publishing, accepting new orders, connecting settlement or starting a new online checkout.
- Legal-structure declaration and company verification on web and Android. Registered entities need the Kenyan registry check and an operator decision linked to the company and owner identity sessions.
- Android expense search, recording, deletion and CSV export. Owners and managers can select the expense category, payment method and date.
- Android access to live purchase orders from Suppliers, with quoted costs, exact delivery fees and confirmation before receiving stock.

## Finished local checks

- [x] Web lint, production build, TypeScript, 37 Playwright checks and 36 baseline API checks passed. The combined expansion suite passed supplier exchange and one-time stock receipt, settlement matching, CSV imports, invoice deposits, ageing, bookings and customer preferences.
- [x] Android debug build and lint passed. The JVM suite has 27 passing checks.
- [x] Owners and managers can look up online payments by order and download reference and receipt data on web and Android. API tests verified business isolation and rejection of cashier access.
- [x] A simulated Paystack test recovered a payment through the merchant’s provider check before the webhook arrived. Duplicate notifications preserved one receipt.
- [x] A simulated Didit company journey verified the owner prerequisite, a single session under concurrent requests, Kenya registry evidence, signed webhook updates, operator review, appeal and renewal. A browser check covered the company verification entry from Settings.
- [x] Local password recovery reached Mailpit. The recovery code exchanged successfully and the updated password signed in.
- [x] Restored a local Supabase backup to a scratch database and compared business, payment, identity verification and migration table counts. The restored payment table retained row-level security and role permissions.

## Hosted wiring

- [x] Applied and verified the four owner KYC, Paystack, company KYB and merchant activation migrations on hosted Supabase. Authenticated workspace users and the application service role cannot submit representative review decisions.
- [x] Deployed the web integration to the existing Vercel production alias and verified public routes, authorization responses and both webhook routes with the provider keys absent. Set the public production callback origin in Vercel.
- [x] Applied all migrations to the dedicated staging project, set the web and Android auth redirects, and deployed the Preview alias. A temporary staging account signed in, created a workspace and declared its legal structure. Production rejected the staging session. Both staging webhook routes reached the application. The test account and workspace were removed.
- [x] Applied the combined expansion migrations to staging and deployed the business operations build. Staging smoke checks exercised sign-in, service creation, settlement matching, finance reporting and customer-note access. A local provider simulation verified that bank transfer produces a single receipt when the checkout offered that channel. Live bank-transfer approval and settlement acceptance are open. [Combined roadmap](product-roadmap.md#phases-23--business-operations-suppliers-and-kenyan-payments)

## Launch checks

See the planned order of work and the acceptance criteria for the Kenya pilot. [Product roadmap](product-roadmap.md) · [Pilot runbook](kenya-pilot-runbook.md)

- [ ] Approve the Paystack settlement arrangement, test card and M-Pesa in sandbox, and reconcile the first authorised pilot settlement to the intended merchant bank. Rehearse refunds, disputes and settlement account changes before live collection. [Kenyan payments](kenya-payments.md)
- [ ] Apply the owner identity migration to a sandbox deployment and exercise the Didit flow. Plan verification for existing merchants before the new publication gate goes live. [Merchant verification](merchant-verification.md)
- [ ] Verify the deployed Kenyan registry and representative flow in the Didit sandbox. Assign authorized reviewers and rehearse a decision and an appeal. [Merchant verification](merchant-verification.md)
- [ ] Verify the declared legal structure and approval evidence independently for each merchant in the assisted pilot.
- [ ] Configure production email delivery and verify signup, confirmation and recovery on both platforms. Verify Android auth callback and session restoration on a physical device.
- [ ] Run Android device acceptance against a dedicated HTTPS test deployment. Check checkout, transfer dispatch and receipt, expense export, purchase order receipt and interrupted saves, then verify the same records on web.
- [ ] Build and sign the release APK or app bundle. Verify the hosted download serves the intended version.
- [ ] Confirm authenticated access, customer isolation and error reporting on the intended hosted release with approved pilot accounts.
- [ ] Put the contact inquiry workflow and staff invitation delivery into operation. The contact form stores inquiries, and staff can currently claim a recorded invitation using their verified email address.
- [ ] Publish final privacy and terms pages, confirm the commercial hosting plan and document backup and recovery procedures.

The Vercel build and hosted databases are ready to receive provider settings. Preview uses the dedicated BiasharaOS Staging Supabase project. Both integrations require credentials and webhook configuration before live activation. [Provider activation](kenya-pilot-runbook.md#provider-activation)

Card and M-Pesa collection for delivered orders is wired through Paystack. Production activation still requires an approved settlement arrangement, sandbox testing and refunds and disputes procedures. Customer bank-transfer collection, direct Daraja and Stripe remain pending. Paid plans, financing and external AI are deferred. Supplier purchase orders are internal records. [Kenyan payments](kenya-payments.md) See the web README for the local commands and the backend setup document for the hosted project references. [Web setup](../web/README.md) · [Hosted setup](backend-setup.md)
