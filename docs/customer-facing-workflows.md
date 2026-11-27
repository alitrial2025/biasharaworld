# Customer appointments, rent receipts and event tickets

**27 November 2026 · Kenya first**

The customer-facing batch adds three workflows to the existing merchant records. In the relevant business workspace, owners and managers can open **Customer access** from web or Android. Customer links work in a mobile browser.

| Workflow | Merchant | Customer |
| --- | --- | --- |
| Appointments | Choose an active service, team member and time in Kenya time. Share the appointment page or close unclaimed times. | Sign in with a confirmed email and claim an open time. The confirmed appointment appears in the merchant’s existing schedule and in the customer’s appointment history. |
| Rent | Prepare a reminder from a rent record or create a private receipt link after recording the payment reference. Replace or revoke a link when needed. | Sign in with the matching confirmed email to view and print the receipt. A link expires after 30 days. |
| Event tickets | Publish a showtime with available numbered seats and a price. For a paid hold, record the received payment reference in Tickets and open admission using the existing staff workflow. | Sign in to claim a free ticket immediately or hold a paid seat for 15 minutes and pay at the venue. Issued tickets are available as downloadable barcodes for single-use check-in. |

New appointment times, event offers and receipt links require merchant verification. Only published appointment times and showtimes appear to customers. Claimed times and ticket records are scoped to the customer account. A changed service price, duration or ticket price prompts the customer to refresh. The database confirms a claim with the corresponding appointment or ticket and rejects conflicting writes.

Rent reminders are prepared for the merchant to share from their mail app or Android share sheet. Receipts reflect payments already recorded by the property manager. Paid ticket holds use payment at the venue. Automated reminder delivery, ticket checkout, cancellation refunds and recurring appointment availability remain separate work in the pilot roadmap.

## Release acceptance

Apply the customer access migration to staging with the web and Android changes. Test customer email confirmation, the first booking under concurrent requests, a receipt shared to a different account, and both free and paid ticket flows on a phone. For paid tickets, verify the payment reference at the desk before issuing the barcode. Check access when merchant verification expires and confirm that previously issued records remain readable by the entitled account.

[Next release roadmap](next-release-roadmap.md)
