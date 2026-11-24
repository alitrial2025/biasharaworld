# Kenya merchant pilot runbook

Use the local stack for disposable account and payment fixtures. Use a separate HTTPS staging environment for real provider sandboxes and a physical Android device. Prepare the first live merchant rollout after staging passes and the business has approved the provider agreements and operating policies. [Product roadmap](product-roadmap.md) · [Release checklist](backend-implementation-plan.md)

## Release gates

| Check | Evidence needed before marking it complete |
| --- | --- |
| Owner and company verification | Exercise Didit sandbox approval, decline, review, expiry and appeal on the intended staging revision. Complete the separate company registry and representative review. Confirm the migration and webhook are loaded. [Merchant verification](merchant-verification.md) |
| Payments and settlement | Put the approved Kenyan Paystack subaccount arrangement in place. Use the provider sandbox to verify card and M-Pesa. Once approved for a live pilot, reconcile the first authorised collection to the provider settlement report and merchant bank entry. Rehearse a failed payment, refund, dispute and settlement change with the responsible operator. [Kenyan payments](kenya-payments.md) |
| Email and device acceptance | Confirm real signup confirmation and password reset emails in staging. Verify the callback and sign-out on a physical Android device. Open a register, sell and refund an item, transfer and receive stock, record and export an expense, and verify the records on web. Interrupt and retry a save during the test. |
| Release and recovery | Assign owners for alerts and support. Approve privacy and terms, sign the Android build, and rehearse a staging database restore and deployment rollback. Verify the deployed website and download version using the intended release revision. |

## Payment support and reconciliation

1. On web or Android, open **Reports → Payment activity** and filter by order number or payment status. Only business owners and managers can access their own business’s records. Export each page you need for a reconciliation. The export includes order and receipt numbers, provider reference, payment method, gross KES amount, and UTC timestamps.
2. For a pending payment, choose **Check provider**. This verifies the existing Paystack reference. It can record a provider-confirmed payment if the webhook is delayed. While a checkout remains reserved, keep the original reference so support can look it up without issuing a second request or recording cash for the same order.
3. Match the gross amount to the Paystack transaction by reference, then match the net amount and fees in the settlement report to the bank statement. An online receipt confirms payment. Settlement takes a separate provider and bank check.
4. If the amount, destination, or status differs, record the order and provider reference and escalate to the authorised payment operator. Use Paystack to review refunds and disputes. Reconcile the financial adjustment before closing the case. The workspace leaves online refunds and settlement account changes to the authorised operator. Keep account numbers and payment credentials out of support messages.

## Provider activation

1. Add these five server environment variables to Vercel **Preview** for staging. Use two Didit sandbox workflows and the `sk_test_` Paystack key. Add the corresponding live credentials in **Production** after the pilot gates pass. [Vercel environment settings](https://vercel.com/biasharaworld/biasharaworld/settings/environment-variables)

   | Variable | Value |
   | --- | --- |
   | `DIDIT_API_KEY` | Didit application key with session creation and decision read access |
   | `DIDIT_WEBHOOK_SECRET` | Signing secret for this app’s Didit webhook destination |
   | `DIDIT_WORKFLOW_ID` | Published Didit User Verification workflow ID |
   | `DIDIT_COMPANY_WORKFLOW_ID` | Published Didit Business Verification workflow ID with Kenya registry checks |
   | `PAYSTACK_SECRET_KEY` | Paystack integration secret for the same environment |

2. Point Didit’s v3 `status.updated` destination to `/api/identity-verification/webhook` and Paystack’s webhook to `/api/payments/webhook` on the origin for that environment. Both aliases expose these signed endpoints. [Merchant verification setup](merchant-verification.md#provider-and-release-setup) · [Payment setup](kenya-payments.md#test-and-activate)

   | Environment | Callback origin | Supabase project |
   | --- | --- | --- |
   | Preview / staging | `https://biasharaworld-staging.vercel.app` | BiasharaOS Staging, `umwgenrzuignqmxauyzn` |
   | Production | `https://biasharaworld.vercel.app` | BiasharaOS, `rhgoiebknrpxtouswaar` |

3. Run `bash tools/deploy-provider-staging.sh` from the repository root after saving Preview variables. It builds Preview and updates the staging alias after the new deploy passes its page check. For Production, redeploy the production revision after saving its variables.
4. Run `npm run providers:check` from `web` with that environment’s values available to Node. Add `-- --probe` to check the Supabase activation migration, Paystack bank API, Didit workflows and signed webhook responses. The Didit workflow and destination reads need management read permissions. The probe sends synthetic notifications that leave business records untouched. Confirm real provider delivery with a sandbox session and payment before going live.

## Environment checks

- Apply the owner and company verification, merchant activation and customer order payment migrations to the isolated staging database before testing. Coordinate the production migration and release because merchant verification controls shop availability.
- Preview and Production use different Supabase URLs and keys. Keep `BIASHARA_PRODUCTION_SUPABASE_URL` set in Preview to block provider activation if its database URL points back to production.
- Use a mail provider and allow the intended web and Android authentication callbacks. The local Supabase setup uses Mailpit and has signup email confirmation disabled. Its recovery test verifies the local PKCE flow. Staging confirmation and real delivery are separate release checks.
- Rehearse a backup into an isolated database. Compare representative business, payment, verification and migration records, permission grants, and row-level security. Record the actual recovery time, then test the application against the restored environment. Keep backup files in protected storage and define retention for the pilot.
