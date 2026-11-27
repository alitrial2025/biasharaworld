# BiasharaOS next release roadmap

**25 November 2026 · Kenya first**

The next milestone is a controlled merchant pilot. A verified business should be able to publish a shop, fulfil an order, collect payment and reconcile the funds to its bank account. Merchants should be able to run daily operations on web or Android and see the same confirmed records.

## Release baseline

- The web workspace and public Shops are deployed. Owners can choose from 19 business types, publish a branded storefront at their username and accept orders from published shops. The three shop designs support mobile browsing and product detail pages.
- The latest release verified workspace spacing, light and dark appearance, signed-in landing navigation and storefront routes. The previous release checks passed 41 browser tests and 28 Android tests. A signed Android pilot build and physical-device acceptance are still open. [Release baseline](https://github.com/alitrial2025/biasharaworld/commit/256cafb7cf1848cec3c3539b9be900e83b9112ab)
- Merchant verification and Paystack checkout for delivered orders are deployed. The last verified release still needed provider credentials and real sandbox acceptance. Paystack bank transfer is wired behind an opt-in setting and needs provider approval. [Verification](merchant-verification.md) · [Kenyan payments](kenya-payments.md)

## Commerce workstream

The first commerce batch covers retail and kiosks, supermarkets, wholesale and distribution, and e-commerce. Checkout speed, branch stock accuracy, purchase receiving and online fulfilment are the first acceptance workflows. Professional services, insurance and property management follow this batch. [Commerce sector review and release priorities](commerce-sector-review.md)

## Professional services, insurance and property management

The role-focused workspace now opens booking, claims, renewal, rent and maintenance queues on web and Android. The next pilot should qualify public bookings and service billing, internal insurance review with a licensed partner, and tenant-facing rent and maintenance workflows. [Workflow review and release acceptance](service-insurance-property-review.md)

## Events, banking and the remaining sectors

The remaining sector presets now show role-based work queues. Event staff can create numbered seat ranges, and bank and SACCO owners need recent authenticator verification for case decisions. The next release needs hosted Auth configuration, pilot verification and the public-facing workflow checks. [Remaining sectors and banking trust controls](remaining-sector-review.md)

## Phase 4 · Qualify the pilot release

| Work | Evidence required |
| --- | --- |
| **Merchant verification.** Configure Didit test credentials and webhook delivery on isolated staging. Assign reviewers for company representatives, exceptions and appeals. Walk individual and registered businesses through their respective routes. | Each legal structure completes its review using real sandbox responses. Pending or expired merchants stay blocked from shop publication and new online checkout. An authorised reviewer can record a decision and handle an appeal. |
| **Provider checkout.** Confirm Paystack’s Kenya merchant and settlement arrangement. Run card and M-Pesa sandbox payments for delivered orders. Exercise delayed and duplicate webhooks, verification after a return from checkout, and failure recovery. | Both sandbox payment methods create a single receipt for the correct order and merchant. A delayed browser return or repeated webhook leaves the accounting consistent. |
| **Android and account acceptance.** Prepare a signed pilot build. Test signup email, recovery links, session restoration, checkout, stock transfers, expense export, receiving stock, and a network interruption on a physical Android device. Verify a shop order from a phone and follow it in the merchant workspace. | The intended Android build installs or upgrades successfully. Confirmed transactions and appearance preferences agree on web and Android. Recovery and interrupted saves preserve access and records. |
| **Pilot operations.** Assign responsibility for support, verification exceptions and payment incidents. Confirm email delivery, commercial hosting, privacy terms, and staging restore and rollback procedures. | The team can handle a merchant who cannot publish, a customer who cannot sign in, and a payment awaiting confirmation. Restore and rollback have recorded test results. |

Provider setup and Android acceptance can proceed in parallel. Staging approval opens the pilot rollout. [Pilot runbook](kenya-pilot-runbook.md) · [Release checklist](backend-implementation-plan.md)

## Phase 5 · Run the first live merchant pilot

Start with a proposed cohort of three to five Kenyan businesses. Include an individual merchant and a registered company, and include a business that uses Android for daily operations. Enable live collection only for authorised pilot merchants and approved settlement destinations.

1. Help each merchant complete verification, publish a shop and confirm the public link on a phone. Add a merchant-facing status and next action for drafts, pending verification and expired approval.
2. Follow an order from placement to stock fulfilment, payment and receipt. Reconcile an authorised live collection against the provider settlement report and the intended bank statement. Check the gross amount, fees and net credit. Verify each payment channel before enabling it for the cohort.
3. Exercise payment support for pending, failed and duplicate attempts. Rehearse refund and dispute handling and private settlement-account changes with the assigned operator.
4. Review time from signup to publication, time to first completed order, payment failures, unmatched settlements and support requests. Use weekly pilot feedback to decide which friction to fix next.

**Release gate** — The pilot demonstrates a complete order and settlement in the intended merchant account. Each enabled method has evidence of acceptance, and critical issues affecting access, orders or funds are resolved. [Settlement and support procedures](kenya-pilot-runbook.md#payment-support-and-reconciliation)

## Phase 6 · Improve Shops and Android for everyday use

| Priority | Deliverable | Acceptance check |
| --- | --- | --- |
| 1 | **Faster publishing.** Add merchant image uploads for logos, covers and products, and show a publication checklist with preview, verification and public-link status. Keep the three shop designs and their product details usable on phones. | An owner can add real product photos, preview the result, publish, and share a working link. Existing links, prices and branch stock remain accurate after updates. |
| 2 | **Android merchant controls.** Put shop status, link sharing, catalogue visibility and order handling in the app. Prioritise daily edits and fulfilment before duplicating the full web design editor. | A merchant can handle an incoming order and update what customers see from a phone. Changes appear correctly in the public shop and web dashboard. |
| 3 | **Order and customer follow-up.** Add confirmation and status notifications for pickup and delivery. Introduce pay links or pre-delivery collection only after cancellations, reserved stock, refunds and duplicate attempts are acceptance-tested. | A customer can track an order and recognise its payment status. A cancellation or refund has a traceable effect on stock, receipts and settlement. |

The implementation adds photo uploads and a publication checklist to Shop builder. Android owners can manage the catalogue draft, publish it, share the shop link and open the fulfilment queue. Customers can follow confirmations, pickup or delivery, and payment records in their signed-in order history. The visible portal checks for updates every 30 seconds. Email and SMS delivery and pre-delivery collection remain open.

## Phase 7 · Expand based on pilot demand

- **Payments.** Qualify Paystack bank transfer for supported originating banks. Record the supported and excluded banks from provider evidence before advertising coverage. Evaluate direct Daraja, Stripe and wallet or bank payouts against merchant demand, settlement ownership, fees and reconciliation. [Payment coverage](kenya-payments.md)
- **Shared operations.** Prioritise supplier partial receiving, repeatable imports, reconciliation exceptions and role-based approvals from observed pilot bottlenecks. Assess eTIMS and accounting integration independently of ordinary invoice support.
- **Industries.** Public appointment slots, private rent receipts and venue ticket reservations are ready for local acceptance. Qualify them on staging with pilot merchants and their customers. Prioritise automated reminders and online ticket payments based on pilot demand. Keep insurance payouts and regulated banking or SACCO transactions dependent on provider agreements and applicable approvals. [Customer-facing workflows](customer-facing-workflows.md)

The first implementation batch is the Phase 4 staging checklist, an Android device acceptance run, and the merchant publication status experience. Provider configuration, review ownership and physical-device availability determine the calendar. [Full product roadmap](product-roadmap.md)
