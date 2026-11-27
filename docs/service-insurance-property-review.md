# Professional services, insurance and property management

**26 November 2026 · Kenya first**

This batch follows the [commerce workflows](commerce-sector-review.md). Each sector gets a small daily workspace on web and Android. Onboarding still selects the business type, and workspace search opens secondary tools and full record lists.

## Why customers would choose BiasharaWorld

| Sector | What competitors already do | What to prove in a Kenyan pilot |
| --- | --- | --- |
| Professional services | Zoho Bookings offers appointment scheduling, calendar sync and reminders. Odoo Appointments offers self-service scheduling around people and resources. | A small firm can schedule work, track the client relationship and handle follow-up from a phone. Connect the completed appointment to a quote or service invoice and reconcile a local payment before calling the full workflow ready. [Zoho Bookings](https://www.zoho.com/bookings/) · [Odoo Appointments](https://www.odoo.com/app/appointments) |
| Insurance | Insuresoft offers policy administration, billing and claims operations. | A Kenyan broker or insurer can trace a policy, premium and claim in one internal workspace and know exactly what needs review. Verify that the same five cases can be managed without a separate tracking spreadsheet. Confirm the intended licensed partner and scope before customer-facing rollout. [Insuresoft](https://www.insuresoft.com/) · [Insurance Regulatory Authority](https://www.ira.go.ke/) |
| Real estate and property management | Buildium offers rent collection, tenant tools and maintenance management. | A property manager can see unpaid rent, expiring leases and unresolved repairs from Android, then reconcile a tenant payment to the right unit and lease. Validate the handoff with a landlord representative, a tenant and a maintenance contractor. [Buildium](https://www.buildium.com/) |

## What works in this batch

- **Professional services.** Today’s bookings uses Kenya time and includes scheduled and in-progress work. Completed and cancelled bookings remain visible in All bookings. Owners and managers can open the schedule, reschedule work and record completion. Client records and expenses are the other home shortcuts.
- **Insurance.** The home shows claims awaiting review, overdue premiums and active policies ending in the next 30 days or with an end date already passed. Each count opens a matching list. Policies, premiums, renewals and claims remain editable by authorised staff in their full lists. Recording a premium as received requires the reference for an existing payment.
- **Real estate and property management.** The home shows overdue rent, open maintenance and active leases ending in the next 30 days or with an end date already passed. Existing records link units, tenants and leases. Staff can record a rent payment reference and track a repair to resolution.
- **Access and support.** The insurance and property summaries return counts for the signed-in owner or manager’s own business. Rent and premium records become overdue the day after their due date in Nairobi. The summaries cover all branches. BiasharaAI uses these confirmed counts and links to the same queues. Its answers use rules. The contact form records private support inquiries and returns a reference.
- **Performance.** The summary API reads the business type without downloading the full commerce snapshot and sends counts to the client. Record lists render 30 at a time and keep search available across the loaded records. The database still stores industry records as a per-business snapshot, so large portfolios and concurrent updates need load testing.

## Work needed from setup to customer delivery

| Stage | Professional services | Insurance | Real estate and property management |
| --- | --- | --- | --- |
| Setup | Verify the firm, add the team, services, prices and availability, import clients | Verify the business and approved partners, record agent or reviewer access, import policies and premium schedules | Verify the property company, import units and tenants, set up manager access and opening balances |
| Do the work | Add client self-booking, reminders, cancellation and no-show handling, recurring appointments and job notes | Add document evidence and case-level access, independent review for claim decisions, endorsement history and renewal notices | Add lease signing and reminders, recurring rent schedules, maintenance assignments and repair evidence |
| Collect and reconcile | Link a completed booking to a service invoice, take a deposit or payment, issue a receipt and reconcile | Match premium instalments, keep a payment trail and qualify any collection or claims-disbursement integration with the approved partner | Match tenant payments to lease obligations, handle partial payments and deposits, issue receipts and reconcile landlord statements |
| Support and retain | Let clients see appointments, request a change and track an issue | Let authorised policyholders request help and see approved status updates | Let tenants report a repair, check progress and see their own ledger and receipts |

### Acceptance for the next release

1. **Professional services.** Observe two firms booking, rescheduling and completing real appointments from web and Android. Track no-shows, scheduling time and records that still need manual duplication. Test time zones, double-booking prevention and reminder delivery before public booking opens.
2. **Insurance.** Validate one pilot with a licensed operator, assigned reviewers, claim evidence retention and approved customer communications. Approve the applicable privacy practices and role boundaries before exposing policyholder or claims information. Measure time to triage a claim and resolve missing premium references. [Office of the Data Protection Commissioner](https://www.odpc.go.ke/)
3. **Property management.** Walk through unit setup, a lease renewal, partial rent payment, one tenant statement and a repair reported through to completion. Require every payment to resolve to its lease and bank record, and measure the time to acknowledge a repair. Pilot tenant notifications with approved contact and consent settings.
4. **Quality.** Test Android on a physical device in light and dark mode. Verify access changes, slow connections, simultaneous updates and the outcome of retries. Use realistic appointment, policy and lease volumes to measure load time and record counts. Measure satisfaction by observing whether merchants complete the tasks and asking where they still rely on another tool.

[Next release roadmap](next-release-roadmap.md)
