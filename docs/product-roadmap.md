# BiasharaOS product roadmap

BiasharaOS starts in Kenya. The first release is a shared workspace for merchants to sell, get paid, manage stock, buy from suppliers and reconcile the day. The same business records support service businesses, wholesalers and other operators. Sector-specific tools can be enabled as businesses need them. Banks and payment providers can participate as partners, as users of business operations tools, or both.

This roadmap distinguishes work implemented in the branch, work needed for a production pilot, and later development. The release checklist tracks deployment readiness. The earlier 20-feature plan records the original UI scope. [Release checklist](backend-implementation-plan.md) · [Original feature plan](feature-expansion-plan.md)

## Phase status

| Phase | Status | Latest result |
| --- | --- | --- |
| 1 · Kenyan merchant pilot | In progress | Owner and company activation gates and Paystack card and M-Pesa checkout are deployed on Vercel and Supabase. Provider credentials, real sandbox tests, reviewer assignment, physical-device acceptance and pilot settlement remain open. |
| 2–3 · Business operations, suppliers and Kenyan payments | In progress | Web and Android support invoice deposits, service bookings, customer service notes, opening data imports, financial reports, supplier exchange and stock receipt, and settlement statement matching. Paystack bank transfer is wired behind an enablement setting. |

See completed local checks and the evidence required before release. [Release checklist](backend-implementation-plan.md) · [Kenya pilot runbook](kenya-pilot-runbook.md)

## Current foundation

- Web and Android share accounts, business records and staff roles. The branch includes sales, receipts, stock and transfers, expenses, customer balances, purchase orders, goods receipt, and a shop with a customer portal.
- Merchant verification gates shop publication, new customer orders and online payment setup based on legal structure. Didit checks the owner's identity and the Kenyan registry for registered entities. A separate representative review binds the two sessions. Both workflows need Didit sandbox acceptance in staging. [Merchant verification](merchant-verification.md)
- Paystack card and M-Pesa checkout is wired for **delivered shop orders**, with settlement to a verified Kenyan bank supported by Paystack. The owner submits settlement details from web or Android. The simulated provider tests exercised both methods, including repeat requests and payment verification. Live collection and settlement still need provider approval and sandbox evidence. [Kenyan payments](kenya-payments.md)
- Internal purchase orders and verified cross-business supplier exchanges are available. After confirming delivery, the buyer can map received goods into branch inventory while keeping product mappings private.

## Phase 1 · Launch a Kenyan merchant pilot

| Priority | Work | Exit criteria |
| --- | --- | --- |
| 1 | **Onboarding and trust.** Run both Didit workflows in staging. Assign representative and exception reviewers, rehearse an appeal, confirm each pilot merchant's legal structure, and plan verification for existing merchants. | An eligible individual merchant or authorized representative can complete the correct verification route. An incorporated pilot merchant passes company review before activation. Expired owner approval stops new shop orders and preserves access to past records. |
| 2 | **Kenyan payments.** Approve Paystack's merchant settlement arrangement, connect a sandbox merchant bank account, and test card and M-Pesa. Confirm fees and the intended destination in sandbox, then reconcile the first approved pilot settlement. Set up support for failed or uncertain payments, refunds, disputes and settlement changes before live collection. | A customer can pay a delivered order, the merchant sees one receipt, and a provider settlement report reconciles to the corresponding bank entry in the pilot. A retry or duplicate notification cannot create another receipt. |
| 3 | **Daily operations and device acceptance.** Verify point of sale, manual payments, returns, inventory, expenses, purchasing, and register closing across web and a physical Android device. Exercise interruption and reconnect flows. | A merchant can open, trade, restock, close and export a day’s records. Web and Android agree after a network interruption. |
| 4 | **Safe production operations.** Set up email and support, approved legal notices, a signed Android release, production monitoring, alert ownership, backups and restore testing. Rehearse migrations and rollback in staging. | A small pilot can be onboarded and supported. Staff can identify a failed payment, restore a test backup and tell a merchant how to recover access. |

## Phases 2–3 · Business operations, suppliers and Kenyan payments

| Workstream | Implemented in the branch | Work still open |
| --- | --- | --- |
| **Sales and invoices** | Quotations convert to invoices. Cashiers and managers can record invoice deposits and final payments. Deposits reserve stock, a final payment creates one receipt, and cancellation records prior deposit returns. Customers can see issued documents and outstanding amounts. | Reminders, point-of-sale payment requests, pay links, online pre-delivery checkout, recurring billing, provider refunds and linked credit notes. |
| **Supplier network and fulfilment** | Verified suppliers can opt into a directory with a catalogue, terms, coverage and lead time. Business owners and managers can send an RFQ, share and revise quotes, confirm a purchase order, record dispatch, resolve a delivery discrepancy, enter delivery proof and share an invoice. Buyers can map received goods to branch batches and record bills paid. | Carrier dispatch and rate integrations, digital proof-of-delivery attachments, multi-shipment and partial receiving, purchase matching against independently entered supplier invoices, and supplier account approval policies. |
| **Payments and settlement** | Payment activity includes confirmed collections. Import provider payout and bank or mobile-money deposit CSVs, match reference and net amount, and review exceptions. Paystack bank transfer can be enabled per environment after provider approval. | Real bank-transfer approval and sandbox acceptance, DTB coverage, direct Daraja, Stripe Connect, verified mobile-wallet destinations, provider settlement feeds, refunds and disputes. |
| **Stock and service operations** | Inventory, branch transfers, batches, variants, stocktakes and expiry alerts use shared business records. Supplier stock receipts are branch-specific. Service catalogues include prices and durations. Team bookings reject overlaps and track scheduled work through completion. | Supplier reorder suggestions, serial and lot traceability, unit conversions, public booking, reminders, and job fulfilment beyond the service schedule. |
| **Financial reporting** | The financial overview combines recorded receipts and invoice deposits, expenses, returns and provider-confirmed collections. Invoices and shared supplier bills are grouped by due-date ageing. Finance summaries and settlement matches can be exported. | Bank and mobile-money formats beyond the normalized settlement CSV, full bookkeeping integration and verified Kenya eTIMS support. |
| **Customers and staff** | Customer orders, issued documents, balances, returns and rewards are available. Owners and managers can save private service notes, and customers can manage promotional email consent in their portal. Existing role controls apply to these workflows. | Promotional delivery, location permissions, role templates, approval limits, shifts, handovers and payroll integrations. |
| **Onboarding and reliability** | Owners and managers can import products and opening stock or customers and opening balances by CSV. Validation identifies the failed row and saves valid files atomically. Existing workspace changes retain their revision checks and retry protection. | Wider Kiswahili, accessibility and physical-device checks, queued supplier changes through disconnection, opening data templates for more record types and integration monitoring. |

### Workflows on web and Android

- Open **Suppliers → Supplier network**. Publish a listing from a verified business, or find a verified supplier and request a quote. At delivery, confirm receipt and record goods against the buyer's active inventory branch. Only the buyer and supplier can view their exchange. Buyer inventory mappings stay in the buyer workspace.
- Open **Reports → Financial overview** for recorded movements and amounts due. Open **Payment activity → Reconcile settlements** to import provider payout and deposit CSVs with headings `date,reference,amount_kes`. Match normalized references and amounts in KES. An owner can discard an incorrect imported line with a recorded reason and reimport it.
- Open **Documents** to record an invoice amount already received. Open **Import business records** in web Settings or Android More to download a CSV template and bring in opening data.
- Open **Services and bookings** in web Settings or Android More to schedule a service against a customer and a team member. Use **Customer service notes** under web Customers or Android More for restricted follow-up notes. Customers manage promotional email preferences in their portal.
- Enable additional payment channels only after qualifying the provider's accounts, settlement route and originating-bank coverage. [Kenyan payment setup](kenya-payments.md)

## Sector development

| Sector | First useful workflow | Later or partner-dependent work |
| --- | --- | --- |
| Retail, grocery and e-commerce | Sell online and in person, stock by location, accept payment and handle returns | Multiple outlets, shared catalogues, delivery integrations, subscriptions and retention tools |
| Service businesses and professionals | Quote, book, complete a job, invoice and collect | Project schedules, resource bookings, timesheets, milestones, recurring work and client approvals |
| Restaurants and hospitality | Menu, modifiers, order queue, table or takeaway service and shift close | Kitchen display, reservations, ingredient usage and property integrations |
| Wholesalers, suppliers and distributors | Price lists, RFQs, purchase orders, partial fulfilment, goods receipt and invoices | Dealer terms, bulk orders, warehouse transfers, distribution routes and B2B integrations |
| Manufacturers and producers | Components, production orders, batches, quality checks and stock movement | Production planning, yield, landed cost, traceability and distribution |
| Banks, SACCOs and other financial institutions | Start with business tools for teams, purchasing, invoicing and reports. Pilot a separate bank partner integration for collections, statements or merchant settlement. | Partner-led accounts, credit or financing require separate discovery, provider agreements and applicable compliance review. Core banking, deposit taking and custody are outside the current roadmap. |
| Other regulated businesses | Run approved general business workflows with restricted permissions and data access | Add sector-specific records and integrations after validating the workflow, privacy obligations and applicable approvals. |

## Platform work across every phase

- **Accounts and organisations.** Support businesses with multiple branches, legal entities and providers. Enforce tenant isolation, least-privilege access, approval separation and audit trails for staff, partner and platform operators.
- **Reliable data and integrations.** Use consistent IDs, money precision and record states across web and Android. Version APIs, authenticate webhooks, handle duplicate and delayed events, and provide replay and reconciliation tools. Provide onboarding and sandbox documentation for developers and partners.
- **Security and privacy.** Keep provider secrets server-side, limit retention and reviewed access to sensitive data, and cover account recovery, administrator MFA, data access and deletion requests, incident response and abuse handling.
- **Operations.** Track uptime, checkout failures, reconciliation exceptions, onboarding completion, Android reliability and support response. Keep staging isolated, exercise restores and migrations, and keep support playbooks current.
- **Commercial rollout.** Measure active merchants and suppliers, time to first sale, order fulfilment, settlement accuracy and retention. Set platform pricing after the pilot validates value and reflects provider and support costs.
