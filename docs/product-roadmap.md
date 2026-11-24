# BiasharaOS product roadmap

BiasharaOS starts in Kenya. The first release is a shared workspace for merchants to sell, get paid, manage stock, buy from suppliers and reconcile the day. The same business records support service businesses, wholesalers and other operators. Sector-specific tools can be enabled as businesses need them. Banks and payment providers can participate as partners, as users of business operations tools, or both.

This roadmap distinguishes work implemented in the branch, work needed for a production pilot, and later development. The release checklist tracks deployment readiness. The earlier 20-feature plan records the original UI scope. [Release checklist](backend-implementation-plan.md) · [Original feature plan](feature-expansion-plan.md)

## Phase status

| Phase | Status | Latest result |
| --- | --- | --- |
| 1 · Kenyan merchant pilot | In progress | Owner and company activation gates and Paystack card and M-Pesa checkout are deployed on Vercel and Supabase. Provider credentials, real sandbox tests, reviewer assignment, physical-device acceptance and pilot settlement remain open. |
| 2 · Shared business workspace | In progress | Owners and managers can filter, check and export online payments on web and Android. Settlement statement matching and the other shared workspace items remain open. |
| 3 · Suppliers and Kenyan payment expansion | Planned | Supplier-to-supplier workspace exchange and additional payment rails remain open. Bank-transfer coverage and settlement options depend on provider arrangements. |

See completed local checks and the evidence required before release. [Release checklist](backend-implementation-plan.md) · [Kenya pilot runbook](kenya-pilot-runbook.md)

## Current foundation

- Web and Android share accounts, business records and staff roles. The branch includes sales, receipts, stock and transfers, expenses, customer balances, purchase orders, goods receipt, and a shop with a customer portal.
- Merchant verification gates shop publication, new customer orders and online payment setup based on legal structure. Didit checks the owner's identity and the Kenyan registry for registered entities. A separate representative review binds the two sessions. Both workflows need Didit sandbox acceptance in staging. [Merchant verification](merchant-verification.md)
- Paystack card and M-Pesa checkout is wired for **delivered shop orders**, with settlement to a verified Kenyan bank supported by Paystack. The owner submits settlement details from web or Android. The simulated provider tests exercised both methods, including repeat requests and payment verification. Live collection and settlement still need provider approval and sandbox evidence. [Kenyan payments](kenya-payments.md)
- Supplier comparison, quotes, purchase orders and receipt of goods are internal merchant workflows today. A supplier portal and exchange of purchase documents between companies are planned.

## Phase 1 · Launch a Kenyan merchant pilot

| Priority | Work | Exit criteria |
| --- | --- | --- |
| 1 | **Onboarding and trust.** Run both Didit workflows in staging. Assign representative and exception reviewers, rehearse an appeal, confirm each pilot merchant's legal structure, and plan verification for existing merchants. | An eligible individual merchant or authorized representative can complete the correct verification route. An incorporated pilot merchant passes company review before activation. Expired owner approval stops new shop orders and preserves access to past records. |
| 2 | **Kenyan payments.** Approve Paystack's merchant settlement arrangement, connect a sandbox merchant bank account, and test card and M-Pesa. Confirm fees and the intended destination in sandbox, then reconcile the first approved pilot settlement. Set up support for failed or uncertain payments, refunds, disputes and settlement changes before live collection. | A customer can pay a delivered order, the merchant sees one receipt, and a provider settlement report reconciles to the corresponding bank entry in the pilot. A retry or duplicate notification cannot create another receipt. |
| 3 | **Daily operations and device acceptance.** Verify point of sale, manual payments, returns, inventory, expenses, purchasing, and register closing across web and a physical Android device. Exercise interruption and reconnect flows. | A merchant can open, trade, restock, close and export a day’s records. Web and Android agree after a network interruption. |
| 4 | **Safe production operations.** Set up email and support, approved legal notices, a signed Android release, production monitoring, alert ownership, backups and restore testing. Rehearse migrations and rollback in staging. | A small pilot can be onboarded and supported. Staff can identify a failed payment, restore a test backup and tell a merchant how to recover access. |

## Phase 2 · Complete the shared business workspace

| Business need | Roadmap |
| --- | --- |
| **Sell and get paid** | Quotes to invoices, due dates, reminders, partial payments, deposits, point-of-sale payment requests, pay links, pre-delivery checkout and repeat billing where supported. Reconcile offline cash, transfers and online provider receipts in one view. Add authorised refunds and credit notes tied to the original transaction. |
| **Buy and manage suppliers** | Supplier directory and approval, requests for quotation, supplier responses, purchase orders, receiving and discrepancy handling. Match purchase orders, goods receipts and supplier invoices. Track payables and due dates. |
| **Manage products and operations** | Improve stock alerts, reordering, serial and lot tracking, unit conversions and branch or warehouse controls. Add service catalogues, bookings and job fulfilment for businesses that sell time or work. |
| **Know what the business earns and owes** | Cash flow, receivable and payable ageing, profit and stock valuation, day close, bank and mobile-money statement import, and a reconciliation exception queue. Add bookkeeping exports and verify relevant Kenya eTIMS requirements and integration before publishing tax-compliance claims. |
| **Serve customers** | Purchase history, customer service notes, order tracking, returns, and relevant loyalty or communications. Add consent, preferences and opt-out controls for promotional messages. Keep customer portal permissions isolated. |
| **Manage staff and locations** | Role templates, location-level permissions, approval limits and handovers. Add time and shift workflows where useful. Use payroll exports or integrations when a merchant needs payroll. |
| **Get started and stay operational** | Import products, customers, opening stock and balances with an error report. Improve English and Kiswahili coverage, accessibility, mobile use and low-connectivity behaviour. Provide reliable exports, clear sync status and conflict recovery. |

## Phase 3 · Connect suppliers and widen Kenyan payments

- **Supplier network.** Add verified supplier profiles, product and price lists, coverage areas, minimum orders, lead times and account terms. Let a merchant send an RFQ or order to a supplier. Let the supplier confirm quantities, propose substitutions, ship, and share an invoice. Keep each company’s private data in its own workspace. Exchange the records needed for the transaction with both parties’ consent.
- **Customer payment rails.** Evaluate PesaLink or another authorised Kenyan bank-transfer partner for collections and same-merchant settlement. Check originating-bank coverage, including DTB, and test payment expiry, reference matching and refunds before turning on the option. Add a separate Daraja route for eligible Safaricom merchant shortcodes and Stripe Connect only for supported account and settlement arrangements. [Kenyan payment constraints](kenya-payments.md)
- **Merchant settlement and reconciliation.** Extend bank and mobile-wallet payout destinations where the provider verifies ownership and supports settlement. Show collected, pending settlement, settled, refunded and disputed states separately. Compare provider transaction and settlement reports with bank or mobile-money records and route mismatches for review. The provider remains responsible for moving and safeguarding funds.
- **Fulfilment partners.** Add disambiguated pickup and delivery addresses, rates, dispatch integrations, proof of delivery, and unavailable or failed delivery handling.

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
