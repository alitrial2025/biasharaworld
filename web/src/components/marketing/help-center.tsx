"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, SearchField } from "@/components/ui";
import styles from "./policy-pages.module.css";

const answers = [
  {
    category: "Getting started",
    question: "How do I set up my business?",
    answer:
      "Start with the onboarding steps, create your account and confirm your email. Complete your business and contact details, choose the tools you use, and review verification readiness. Kenya is supported first; other African markets are coming soon. You can return to supported readiness drafts instead of entering everything again.",
  },
  {
    category: "Getting started",
    question:
      "I confirmed my email but cannot enter the workspace. What should I do?",
    answer:
      "Open the newest confirmation link on the device where you signed up, then sign in with the confirmed email. If you have no business yet, complete business setup. A missing or temporarily unavailable service should offer retry rather than claiming your business was deleted. If it keeps failing, send the page or app version, time, and error wording through Contact. Never send the confirmation link or your password.",
  },
  {
    category: "Getting started",
    question: "Why do the app and website show different records?",
    answer:
      "Sign in with the same email and check the business and active branch on both devices. Saved business changes are shared through the backend, but each device can have its own basket and view preferences. Refresh records on the website or refresh the app after a change on the other device. Sample demo records are separate from a real account.",
  },
  {
    category: "Sales & stock",
    question:
      "Does recording an M-Pesa, cash, card or bank payment move money?",
    answer:
      "No. Receive or confirm the money separately, then record the received payment in checkout. The saved receipt updates the business records and stock. The current product does not collect a payment or send a refund through a payment provider. Avoid recording the same payment twice.",
  },
  {
    category: "Sales & stock",
    question: "A save was interrupted. Should I enter it again?",
    answer:
      "Use Retry saved request first. It retains the original request ID so the service can return the result without creating a second product, sale or order. Do not clear browser/app data or sign out while a request is unconfirmed. Once it is confirmed, check the saved record before starting another action.",
  },
  {
    category: "Sales & stock",
    question: "How do I adjust stock or record expired goods?",
    answer:
      "Use Stocktakes to count physical quantities and finalise an adjustment with a reason. Use Expiry & batches to receive new stock with its batch and expiry date or record a write-off. Product editing changes details and photos; it does not replace stock adjustments. Expired or reserved stock may make sellable quantities lower than the total on hand.",
  },
  {
    category: "Sales & stock",
    question: "How do I record a return or a customer repayment?",
    answer:
      "For a return, choose the original receipt and product, enter the quantity and reason, and say whether the goods can return to sellable stock. Give the actual refund separately. To reduce a customer's debt, open that customer's details and record the amount received; partial repayments are supported. Check the customer's contact details before saving.",
  },
  {
    category: "Sales & stock",
    question: "How do I use barcode scanning?",
    answer:
      "Start the camera and allow permission when prompted, or enter a barcode/SKU or use a keyboard scanner. Review the matched product before saving a sale or changing its code. Scanning looks only in your current business catalogue. Camera frames are decoded on the device. If permission or hardware is unavailable, manual entry remains available.",
  },
  {
    category: "Photos",
    question: "How do I add, change or remove a product photo?",
    answer:
      "In Inventory, add or edit the product and use its photo control. Choose a supported image and wait for the upload, then save the product. Web photo upload accepts JPEG, PNG or WebP; the app uses the Android photo picker. Large photos are resized and reencoded before upload. Removing a photo detaches it from the product; it may not immediately delete the old private file.",
  },
  {
    category: "Photos",
    question: "Can another business see my product photos?",
    answer:
      "Private product photos are scoped to the business that uploaded them. Owners and Managers can upload; members of that business can read them. Another business cannot attach or read that private image. When you publish a shop, photos of its visible products become public with the listing. Hide the product or unpublish the shop to block new public requests.",
  },
  {
    category: "Photos",
    question: "Why is a product photo missing?",
    answer:
      "Wait for the upload and product save to finish, check your connection, and refresh. A removed image, expired session, lack of business access or failed download can prevent display. A product without a photo shows a generic icon. If it still fails, ask the Owner or Manager to upload it again; do not copy another business's storage path.",
  },
  {
    category: "Account & privacy",
    question: "How do I change dark mode, language or text size?",
    answer:
      "Use Preferences in the workspace or App Settings on Android. The theme can be light, dark or follow your device. Signed-in preferences are saved to your account; the website also remembers a visitor's appearance on that browser. If a screen has unreadable contrast, contact us with the screen name, theme and app/browser version. Do not include private customer details in screenshots.",
  },
  {
    category: "Account & privacy",
    question: "Why can I view a record but cannot change it?",
    answer:
      "Your business role determines which changes are allowed. Owners manage team access. Managers manage everyday business operations. Cashiers can work with supported sales and customer actions. Viewers can read supported workspace records but cannot perform business writes. Verification-readiness and funding records are owner-only. Ask the business owner to review your role rather than sharing an account.",
  },
  {
    category: "Account & privacy",
    question: "Where can I request a copy, correction or deletion of my data?",
    answer:
      "Use Contact and choose Privacy & data request or Account deletion. Provide your account email, business and what you want changed. We may need to confirm ownership and the business owner's authority. Removing the app, signing out or clearing cookies does not delete saved business records. Verification readiness also has an owner control to clear it. Do not attach an ID, password or security code to a support message.",
  },
  {
    category: "Account & privacy",
    question: "What cookies or tracking does BiasharaOS use?",
    answer:
      "This release uses essential account, safe-retry and basket storage, plus appearance preferences. Optional advertising and analytics tracking is not enabled. Read Cookies & storage for the categories, duration and browser controls. Opening help from Android uses your browser and its site-data settings.",
  },
  {
    category: "Account & privacy",
    question: "How do I report suspicious access or a security issue?",
    answer:
      "Secure the email account and reset the affected password, then review staff access with the business owner. Use Contact and choose Report a security issue. Share the time, affected screen and a description without passwords, access tokens, recovery links, identity documents or customer records. The contact form saves your message; an immediate reply is not promised.",
  },
  {
    category: "Funding & verification",
    question: "Does completing KYC readiness verify my identity?",
    answer:
      "No. The readiness flow saves self-reported owner and business information and your declarations. Draft or submitted means the information was recorded. No identity-verification provider is connected, and the current flow does not request government IDs, biometrics, tax PINs or bank credentials. Any future verification step must identify its provider and explain the required data first.",
  },
  {
    category: "Funding & verification",
    question: "What happens when I submit a funding request?",
    answer:
      "The request, consent and status history are saved privately for the business owner. Recorded · provider pending means no lender has received it through this service. Submission does not approve a loan, perform a credit check or disburse money. Review, edit or withdraw supported requests from Funding. Do not pay an upfront charge or share a PIN based only on an in-app readiness status.",
  },
  {
    category: "Funding & verification",
    question:
      "Are affordability estimates or repayment calculations loan offers?",
    answer:
      "No. Calculations use the terms and business figures you enter. Estimates can help preparation, but they do not assess lender eligibility or guarantee affordability. No interest rate, credit limit or provider decision is assigned by the current service. Any future offer must identify its lender, total charges, repayment schedule and separate terms.",
  },
] as const;
const categories = [
  "All",
  "Getting started",
  "Sales & stock",
  "Photos",
  "Account & privacy",
  "Funding & verification",
];

export function HelpCenter() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const filtered = answers.filter(
    (answer) =>
      (category === "All" || answer.category === category) &&
      `${answer.question} ${answer.answer} ${answer.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <div className={styles.help}>
      <header>
        <span className="eyebrow">HELP FOR THE WEBSITE AND ANDROID APP</span>
        <h1>Find your next step.</h1>
        <p>
          Practical answers about setup, sales, photos, account access and
          funding readiness. Saved business changes are shared across your
          signed-in devices.
        </p>
      </header>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search help, photos, payments or account access…"
        className={styles.search}
      />
      <div className={styles.categories} role="group" aria-label="Help topics">
        {categories.map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={category === value}
            onClick={() => setCategory(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <p role="status">
        {filtered.length} {filtered.length === 1 ? "answer" : "answers"}
      </p>
      <section aria-label="Help answers" className={styles.answers}>
        {filtered.map((answer) => (
          <details key={answer.question}>
            <summary>{answer.question}</summary>
            <p>{answer.answer}</p>
          </details>
        ))}
        {!filtered.length && (
          <div className={styles.support}>
            <h2>No matching answers yet.</h2>
            <p>
              Try “photos”, “stock”, “account” or “funding”, or send the team
              your question.
            </p>
            <div className={styles.buttons}>
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                }}
              >
                Show all answers
              </Button>
            </div>
          </div>
        )}
      </section>
      <section className={styles.support}>
        <h2>Still need help?</h2>
        <p>
          Use the contact form to save a support or privacy request. Include
          your account email, business, app/browser version and the error
          wording. Do not send passwords, PINs, sign-in links or identity
          documents. Automated replies and an immediate response are not
          promised.
        </p>
        <div className={styles.buttons}>
          <Button href="/contact">Contact support</Button>
          <Button href="/dashboard" variant="secondary">
            Open workspace
          </Button>
        </div>
        <nav aria-label="Privacy and legal information" className={styles.nav}>
          <Link href="/privacy">Privacy notice</Link>
          <Link href="/cookies">Cookies & storage</Link>
          <Link href="/terms">Terms of use</Link>
        </nav>
      </section>
    </div>
  );
}
