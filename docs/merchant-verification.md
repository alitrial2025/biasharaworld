# Merchant verification in Kenya

BiasharaOS requires merchant verification before publishing a shop, accepting new customer orders, or enabling online payments. A merchant can create a workspace and prepare stock while verification is pending. Customers confirm their email for ordinary shopping. Existing customers keep access to past orders when verification lapses.

## Who verifies and what they provide

| Merchant | Person who completes KYC | Business evidence for a separate registry review |
| --- | --- | --- |
| Individual or sole trader | The person who owns and operates the shop | The business-name registration certificate if trading under a registered business name. Confirm any relevant permit for the trade and location. |
| Kenyan incorporated company | An authorized director or representative | Certificate of Incorporation and a current Business Registration Service official search (CR12). Check the company details and the person's authority. Ask for authorization if the submitting person is absent from the search. |
| Partnership or other registered entity | An authorized partner or representative | Registration evidence for that entity type and evidence of authority to act. |

An individual who has no company documents should use the individual route and trade under their real identity, subject to applicable registration and permit requirements. A company missing its documents should obtain copies and an official search through BRS/eCitizen before claiming company verification. An incorporated business should use the company route even if the owner already passed KYC. [Kenya Business Registration Service](https://brs.go.ke/companies-registry/)

The workspace owner completes the hosted identity check. For an incorporated company, that person must be able to act for the company. The owner opens **Settings → Kenyan company verification** on web or **More → Kenyan company verification** on Android after their identity is approved. The company check runs in Didit. BiasharaOS shows a completed company verification only after the Kenyan registry result passes and an authorized BiasharaOS reviewer confirms the representative. Beneficial-owner checks and the extent of evidence required for regulated businesses depend on the provider agreement and the merchant's risk profile.

In **Owner identity verification**, the owner declares their legal structure. An individual or sole proprietor completes the identity check. A company or other registered entity also completes the Kenyan registry and representative checks. These requirements apply automatically to shop and payment activation. A legal structure is declared once. Contact support to correct it, and confirm the supporting evidence before approving a correction.

## Provider and release setup

Didit offers a free sandbox with up to 500 test sessions per sandbox application every 24 hours. Eligible organizations that sign up with a work email get USD 10 of monthly credit. Basic full KYC is listed at USD 0.33 per completed check, about 30 checks covered by that credit if used only for that product. Didit lists Kenya's IPRS lookup as a separate USD 0.75 check. Check exact document types with a Kenyan sandbox workflow before choosing production settings. Didit lists Kenya registry checks at USD 2 for the company and officers, USD 5 with direct shareholders and USD 9 with beneficial owners. [Didit pricing](https://didit.me/pricing/) · [Kenya IPRS lookup](https://docs.didit.me/core-technology/id-verification/non-doc-lookup) · [Registry pricing](https://docs.didit.me/getting-started/kyb-registry-pricing)

1. Create a **User Verification** workflow in a Didit sandbox. Start with ID capture, liveness and face matching. Read the consent requirements for your deployment and review the privacy notice, retention and access policy before collecting real documents. Use the provider's test scenarios while developing. [Create session](https://docs.didit.me/sessions-api/create-session)
2. Set `DIDIT_WORKFLOW_ID`, `DIDIT_API_KEY` and `DIDIT_WEBHOOK_SECRET` in the server environment. Configure a v3 webhook at `/api/identity-verification/webhook` and subscribe to `status.updated`. The API authenticates the raw webhook signature and reads the current decision from Didit. The web app supplies its HTTPS verification page as the callback. Approval comes from Didit’s server decision. [Didit webhooks](https://docs.didit.me/integration/webhooks)
3. Apply the owner identity migration to the sandbox Supabase project. On the web, open **Settings → Owner identity verification**. In the Android app, open **More → Owner identity verification**. Verify approval, decline, retry, expiry and review before enabling the live workflow. Confirm unauthorized users are denied and approved merchants can publish.
4. Create a separate **Business Verification** workflow for Kenya. Require the Kenyan registry check and configure secure collection of supporting documents in the provider workflow. Set `DIDIT_COMPANY_WORKFLOW_ID` to this new workflow's ID and apply the company and merchant activation migrations. Keep both workflows and the webhook in the same Didit application. Exercise the registry, document and representative steps in staging. [Business verification decision schema](https://docs.didit.me/business-verification/response-schema)
5. Confirm existing merchants have completed verification before switching traffic to the new version. Shops appear once the merchant satisfies their legal structure’s verification requirements. Keep sandbox and live credentials separate.

Merchants submit identity documents and selfies to Didit. BiasharaOS retains verification references, decision statuses and minimal reviewer audit metadata. Do not accept identity or company evidence via chat, email, the general contact form or a BiasharaOS upload field. [Kenya Office of the Data Protection Commissioner](https://www.odpc.go.ke/)

## Representative review and appeals

1. Assign an authorized BiasharaOS operator and restrict their access to the provider console and the database operator workflow. Compare the company record, incorporation certificate and current official search. Confirm that the company registration number, legal name and status match. Compare the person in the approved identity session to a director with authority in the official search, or validate an authorization letter and the signer's authority. Follow up in the approved secure channel if the evidence is missing or unclear.
2. Refresh verification and record the decision against the exact company and identity sessions inspected. The database migration exposes an operator-only function. Execute it using the authorized database operator role with the business UUID, both session UUIDs, an `Approved` or `Declined` verdict, a unique internal case reference and the operator's internal identifier. Use opaque tokens for the references. The owner, staff and the application service role cannot record the decision.

   ```sql
   select public.review_company_representative(
     '<business UUID>', '<Didit company session UUID>', '<Didit owner session UUID>',
     'Approved', '<internal case reference>', '<operator identifier>'
   );
   ```

3. Give merchants a case reference through support and a way to ask for a second review. Have the assigned operator recheck the evidence in the provider console. Record a new decision with a fresh case reference. A change of either verification session requires a fresh authority review. Unresolved or unapproved cases remain pending or declined in the workspace.
4. For a company session stuck in preparation, use the provider console to check the vendor reference `company:<business UUID>:<owner UUID>` and the configured company workflow. Verify the provider session before attaching it to the matching reservation, then refresh the decision. Clear the unlinked reservation only after checking that the provider did not create a session. Recheck the current reservation ID before making either correction.
