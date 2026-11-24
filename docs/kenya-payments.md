# Kenyan payments and settlement

BiasharaOS uses Paystack for the first Kenyan payment flow. The shop owner completes merchant verification, chooses a Kenyan settlement bank, and enters their account number in **Settings → Online payments** on web or **More → Online payments** on Android. The bank list comes from Paystack. Paystack receives the account number and verifies the destination. BiasharaOS keeps a masked account label and the provider recipient reference. Paystack settles directly into the merchant’s verified bank account on its payout schedule. BiasharaOS keeps the order and receipt records. [Paystack bank directory API](https://paystack.com/docs/api/miscellaneous/#bank) · [Settlement subaccounts](https://paystack.com/docs/api/subaccount/)

Customers open **My orders** after the merchant delivers their order and pay by card or M-Pesa through Paystack Checkout. The server reads the order total from its own records, locks the payment reference to that order and settlement subaccount, and verifies the result with Paystack before recording a receipt. A verified payment records the provider payment method and does not increase cash in the register. [Kenyan payment channels](https://paystack.com/docs/payments/payment-channels/) · [Split settlement](https://paystack.com/docs/payments/split-payments/)

| Rail | Status |
| --- | --- |
| Cards and M-Pesa | Paystack-hosted checkout and merchant bank settlement are wired in the branch. |
| Kenyan settlement banks | Selection uses Paystack's current list. An account must be active, verified and denominated in KES before checkout can start. |
| Customer bank transfer via PesaLink | Wired as an opt-in Paystack channel. Enable `PAYSTACK_BANK_TRANSFERS=true` after Paystack confirms availability and a test verifies the settlement destination. Paystack currently excludes DTB customers from this collection channel. |
| Direct Daraja | Requires approved Safaricom merchant shortcodes, production credentials and reconciliation for each merchant. |
| Direct Stripe | Requires supported merchant accounts and an approved Stripe Connect settlement model. The current Kenyan card channel runs through Paystack. |

The product roadmap prioritises this pilot before additional Kenyan payment rails and settlement destinations. [Payment roadmap](product-roadmap.md)

## Test and activate

1. Register the platform and settlement arrangement with Paystack Kenya. Confirm permission to onboard businesses as subaccounts, settlement schedules, fees, chargeback ownership, provider account verification and sandbox support before enabling live keys. Choose test and production environments with different keys and separate databases.
2. Apply the payment and merchant activation migrations. Set `PAYSTACK_SECRET_KEY` in the server environment. The callback uses the HTTPS app origin. Set `PAYSTACK_CALLBACK_ORIGIN` only to override that origin. Set the Paystack webhook URL to `/api/payments/webhook` on the same origin, then redeploy Vercel after saving the settings. [Paystack webhook signatures](https://paystack.com/docs/payments/webhooks/)
3. Verify a sandbox merchant's KYC and settlement status. Use a delivered test order and try card and M-Pesa checkout. Confirm the receipt is recorded exactly once, payment appears for the right order and bank destination, and the amount reconciles after provider fees. Confirm a returned browser URL alone cannot mark the order paid. [Paystack transaction verification](https://paystack.com/docs/api/transaction/#verify)
4. Before enabling live collection, agree on the support procedures for payment cancellation, refunds, disputes and settlement account changes. Use Paystack's dashboard for unresolved provider cases and refund review. This branch does not automate refunds, chargebacks, pre-delivery collection, or a platform-held wallet.

The settlement screen accepts normalized statement credits with headings `date,reference,amount_kes`. Import the provider net payout and the corresponding bank or mobile-money credit separately. Matching uses the payout reference and exact net amount. A missing statement, mismatched amount, or duplicate deposit appears as an exception for review. [Paystack settlement reports](https://paystack.com/docs/api/settlement/)

A payment preparation request may reach Paystack even if the response is interrupted. Keep the reserved reference while support checks the provider record. Once a checkout is reserved, the application blocks a separate cash receipt for the same order. If a settlement connection is interrupted, search the Paystack dashboard for the merchant reference and reconcile the recipient before retrying. Keep full account numbers out of logs, support messages and source control.
