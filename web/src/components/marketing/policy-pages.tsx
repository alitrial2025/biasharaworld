import Link from "next/link";
import { CookieControls } from "./cookie-controls";
import styles from "./policy-pages.module.css";

const updated = "24 October 2026";
function PolicyNav() {
  return (
    <nav className={styles.nav} aria-label="Policies and support">
      <Link href="/privacy">Privacy notice</Link>
      <Link href="/cookies">Cookies & storage</Link>
      <Link href="/terms">Terms of use</Link>
      <Link href="/help">Help centre</Link>
    </nav>
  );
}

export function PrivacyNotice() {
  return (
    <article className={`legal-page ${styles.article}`}>
      <span className="eyebrow">YOUR INFORMATION, EXPLAINED</span>
      <h1>Privacy notice</h1>
      <p className={styles.meta}>
        Last updated: {updated} · Website and Android app
      </p>
      <p className="legal-lead">
        This notice explains what BiasharaOS stores, why it is used, who can see
        it, and the choices you have when you manage a business or order from a
        published shop.
      </p>
      <PolicyNav />
      <div className={styles.intro}>
        <p>
          <strong>BiasharaOS is the service name.</strong> Use our{" "}
          <Link href="/contact">contact form</Link> for support, privacy
          questions or a data request. The operating legal entity, registered
          address and dedicated privacy email have not yet been confirmed for
          this early-access service; we will publish them here when confirmed.
        </p>
        <p>
          Business owners decide what customer and employee information they
          enter and whom they invite to their workspace. If a business entered
          your information, contact that business first; you can also contact us
          about access or security concerns.
        </p>
      </div>
      <section id="information">
        <h2>1. Information we handle</h2>
        <ul>
          <li>
            <strong>Account information:</strong> name, email, account
            identifiers, authentication sessions and email-confirmation or
            password-recovery requests. Supabase handles password
            authentication; passwords are not stored in your business records.
          </li>
          <li>
            <strong>Business records:</strong> business contact details,
            products, private product photos, stock, receipts, expenses,
            customer contacts and balances, suppliers, staff access, reports and
            preferences.
          </li>
          <li>
            <strong>Shop orders:</strong> the signed-in customer’s name/email,
            selected products, delivery or pickup instructions, order status and
            payment records entered by the merchant.
          </li>
          <li>
            <strong>Onboarding and verification readiness:</strong> owner
            contact details, business name/type/address, registration status and
            optional business registration number, trading history, employee
            count, revenue band, selected tools and dated declarations. These
            are self-reported readiness records, not proof of verified identity.
          </li>
          <li>
            <strong>Funding readiness and requests:</strong> requested amount
            and purpose, duration, trading history, business plan, contact
            details, self-reported revenue, costs and existing debt payments,
            optional business registration number, consent and request history.
          </li>
          <li>
            <strong>Support and operations:</strong> messages you submit,
            contact details, security and diagnostic information needed to
            deliver and protect the service. The contact service derives a
            rate-limit identifier from the requesting network address to limit
            repeated submissions.
          </li>
        </ul>
        <p>
          Government identity documents, biometrics, tax PINs, bank passwords,
          card security codes and mobile-money PINs are not requested by the
          current onboarding or funding-readiness flows. Do not put them in
          notes, product photos or support messages.
        </p>
      </section>
      <section id="purposes">
        <h2>2. How information is used</h2>
        <p>
          We use information to authenticate accounts, confirm membership and
          permissions, keep business records consistent across the website and
          app, process shop orders, retain safe retry information when a save is
          interrupted, answer support requests, and prevent misuse. Theme and
          language preferences make the interface work as you choose.
        </p>
        <p>
          KYC-readiness and funding requests are saved for your business owner
          to prepare and review. No verification provider or lending provider is
          connected in this release. Saving or submitting a readiness record
          does not verify identity, request a credit-bureau check, approve
          finance, move money or share an application with a lender. Any later
          provider process must explain its own information requirements and
          obtain any required authorization.
        </p>
      </section>
      <section id="visibility">
        <h2>3. Who can see information</h2>
        <p>
          Authorized members of your business can access its workspace according
          to their role. Business owners control invitations and access.
          Verification-readiness and funding-request records are restricted to
          the business owner through their dedicated services; they are not
          shown in the customer shop or shared staff workspace.
        </p>
        <p>
          Product photos are stored in a private Supabase bucket under a
          business-specific path. A signed-in member can read photos belonging
          to that business; Owners and Managers can manage them. If the merchant
          publishes a shop, photos of its visible products, names, prices and
          availability become publicly viewable through that shop. Hiding a
          product or unpublishing the shop blocks new public image requests.
          Someone who previously downloaded a public photo may keep their copy.
        </p>
        <p>
          Customers can access their own order history after signing in.
          Publishing a shop does not publish customer contacts, balances,
          private receipts, verification readiness or funding requests.
        </p>
      </section>
      <section id="services">
        <h2>4. Service providers and hosting</h2>
        <p>
          BiasharaOS uses Supabase for account authentication, business data and
          file storage, and Vercel to host the website and API. These services
          process information to operate the product. Network and hosting
          systems receive technical request information as part of serving a
          page or API call. Information may be processed outside the country
          where you access the service; a country-specific hosting commitment is
          not offered here.
        </p>
        <p>
          We have not added advertising trackers or an external generative-AI
          service. Business summaries use recorded business data. Camera barcode
          decoding runs on your device; camera video is not uploaded by the
          scanner. Selected product photos are resized and reencoded before
          upload, which removes their original embedded location metadata.
        </p>
      </section>
      <section id="storage">
        <h2>5. Device storage and security</h2>
        <p>
          The website retains authentication sessions, appearance preferences,
          shop baskets and safe-retry records in browser storage. The Android
          app encrypts account sessions, drafts and pending requests using
          Android Keystore. Product thumbnails may be held in device memory
          while you use the app. See the{" "}
          <Link href="/cookies">cookies and storage policy</Link> for details
          and controls.
        </p>
        <p>
          Access controls and encrypted connections help protect the service. No
          system can promise absolute security. Protect your email account, use
          a password you do not reuse elsewhere, review staff access, and sign
          out on shared devices. Never forward password-reset or confirmation
          links.
        </p>
      </section>
      <section id="retention">
        <h2>6. Retention, correction and deletion</h2>
        <p>
          Saved account and business information remains in the service until it
          is changed, removed through an available feature, or handled through a
          deletion request. Sign-out, app removal and clearing browser storage
          do not delete your server-side business records. Detaching a product
          photo removes it from the product; the old private storage object may
          remain until separately removed.
        </p>
        <p>
          The owner can edit business records and delete verification-readiness
          information through its workspace controls. Submitted funding requests
          may retain status and audit history after withdrawal. Fixed retention
          periods, including backup and operational-log schedules, have not been
          finalized. We do not promise immediate removal from backups or
          deletion of records a business must lawfully retain.
        </p>
        <p>
          To request access, a correction, export, account deletion or removal
          of an uploaded photo, use the{" "}
          <Link href="/contact">contact form</Link> and choose “Privacy & data
          request” or “Account deletion”. Tell us the account email and business
          involved, without attaching identity documents or passwords. We may
          need to confirm account ownership and the business owner’s authority
          before acting. A support request does not instantly delete an account.
        </p>
      </section>
      <section id="changes">
        <h2>7. Scope and changes</h2>
        <p>
          The service is intended for people authorized to manage a business or
          place an order, not for children to provide personal information.
          Kenya is the initial supported market; additional African markets are
          marked “Coming soon”. We will update this notice as processing changes
          and explain any new optional tracking, verification or lender
          integrations before collecting their required information.
        </p>
        <p>
          For help using the product, visit the{" "}
          <Link href="/help">help centre</Link>. For a privacy concern or
          suspected unauthorized access,{" "}
          <Link href="/contact">contact the team</Link>.
        </p>
      </section>
    </article>
  );
}

export function CookieNotice() {
  return (
    <article className={`legal-page ${styles.article}`}>
      <span className="eyebrow">YOUR BROWSER, YOUR CHOICES</span>
      <h1>Cookies & storage</h1>
      <p className={styles.meta}>Last updated: {updated}</p>
      <p className="legal-lead">
        The website uses browser storage to keep sign-in, safe retries, baskets
        and your preferences working. This release does not enable optional
        advertising or analytics tracking.
      </p>
      <PolicyNav />
      <section>
        <h2>What “cookies” includes here</h2>
        <p>
          A cookie is a small value sent with browser requests. Local storage
          and session storage are separate browser features that retain data on
          the device. Our application primarily uses those storage features
          rather than setting an advertising cookie. Hosting or account
          infrastructure may also use technical cookies needed to deliver and
          protect their services.
        </p>
      </section>
      <section>
        <h2>What the product saves on this browser</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">
              Browser storage purposes and duration
            </caption>
            <thead>
              <tr>
                <th scope="col">Purpose</th>
                <th scope="col">Information</th>
                <th scope="col">How long it stays</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Account access</th>
                <td>
                  Supabase authentication session and token-refresh information;
                  recovery/confirmation flow information.
                </td>
                <td>
                  The session persists until sign-out, expiry or browser data is
                  cleared. Tokens are refreshed by the account service while the
                  session is valid.
                </td>
              </tr>
              <tr>
                <th scope="row">Safe saves</th>
                <td>
                  Account/business-scoped request ID and pending command needed
                  to check an interrupted save without duplicating it.
                </td>
                <td>
                  Session storage until the save is confirmed or that browser
                  session is cleared.
                </td>
              </tr>
              <tr>
                <th scope="row">Shop basket</th>
                <td>
                  Product quantities and, after an attempted order, the pending
                  request and delivery/pickup instructions.
                </td>
                <td>
                  Session storage until the order completes, the basket is
                  changed, or that browser session is cleared.
                </td>
              </tr>
              <tr>
                <th scope="row">Appearance</th>
                <td>
                  Your light, dark or device-theme preference in local storage.
                  Signed-in preferences may also be saved to your account.
                </td>
                <td>Until you change the choice or clear browser storage.</td>
              </tr>
              <tr>
                <th scope="row">Onboarding drafts</th>
                <td>
                  Non-sensitive setup choices and progress where the onboarding
                  screen offers to remember them. Do not enter identity
                  documents or credentials in a draft.
                </td>
                <td>
                  Until setup completes, the draft is cleared, or browser data
                  is removed; account-based readiness drafts are stored
                  separately in your business.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>Manage your choices</h2>
        <CookieControls />
        <p>
          Your browser’s site-data settings can delete local storage, session
          storage and cookies, or block future storage. Finish or retry any
          unconfirmed save first and check the saved records before submitting
          it again. Clearing storage signs you out and can discard unsent drafts
          or a shop basket; it does not remove saved records from your business
          account.
        </p>
        <p>
          No “accept all” action is needed for advertising or analytics that is
          not present. If optional tracking is introduced, this page and the
          relevant choice controls must be updated before it is enabled.
        </p>
      </section>
      <section>
        <h2>Android app storage</h2>
        <p>
          The Android app uses encrypted account-session, draft and safe-retry
          storage rather than browser cookies. Opening help or a policy from the
          app launches this website in your browser, where the website’s storage
          behavior applies. Android settings can remove app data; doing so does
          not delete saved business information.
        </p>
      </section>
      <section>
        <h2>Questions</h2>
        <p>
          Read the <Link href="/privacy">privacy notice</Link> or{" "}
          <Link href="/contact">send a privacy or storage question</Link>. Do
          not send passwords, security codes or identity-document images.
        </p>
      </section>
    </article>
  );
}

export function TermsNotice() {
  return (
    <article className={`legal-page ${styles.article}`}>
      <span className="eyebrow">USING BIASHARAOS</span>
      <h1>Terms of use</h1>
      <p className={styles.meta}>Last updated: {updated} · Early access</p>
      <PolicyNav />
      <p className="legal-lead">
        BiasharaOS is an early-access business workspace for keeping the records
        you enter. These terms explain the current product and its limits.
      </p>
      <section>
        <h2>Your account and authority</h2>
        <p>
          Use the service only for a business you are authorized to manage, or
          for your own customer orders. Keep sign-in details private, enter
          accurate information, and invite only authorized people. You are
          responsible for permission to enter customer, employee and supplier
          information and to publish product photos.
        </p>
      </section>
      <section>
        <h2>Records, payments and orders</h2>
        <p>
          Check saved stock, balances, receipts and reports against your real
          business activity. A recorded payment is a payment a business says it
          received; it is not an independent confirmation of money movement.
          Purchase orders and fulfilment statuses are business records. Contact
          suppliers, drivers and customers separately when an action requires
          it. Automatic payment collection is not connected.
        </p>
        <p>
          Published shop products and their visible photos are public. Merchants
          set availability, delivery arrangements and how payment is received.
          Customers should confirm those arrangements with the merchant.
          BiasharaOS does not make every product listing or transaction a
          verified offer.
        </p>
      </section>
      <section>
        <h2>Verification and funding readiness</h2>
        <p>
          Readiness information and funding requests can be saved and submitted
          for your business records. No verification or lending provider is
          connected. No identity-verification result, credit decision, loan
          offer, approval or disbursal is promised. Calculator results based on
          your inputs are estimates, not offers or financial advice. Any future
          provider’s terms, required authorization and eligibility process will
          be explained separately.
        </p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>
          Do not access another business without permission, misuse customer
          information, upload unlawful content, or attempt to bypass security
          and storage rules. Do not submit identity documents, bank credentials
          or payment PINs through notes, product images or support forms. The
          current service supports Kenya first; other African markets are coming
          soon.
        </p>
      </section>
      <section>
        <h2>Availability and early-access plans</h2>
        <p>
          Features can change and service interruptions may occur. Keep exports
          of important business records and review unconfirmed saves before
          retrying. Pricing pages describe proposed plans; choosing a displayed
          plan does not by itself create a paid subscription. Actual
          paid-service terms must be presented before a charge is agreed.
        </p>
      </section>
      <section>
        <h2>Privacy, support and account requests</h2>
        <p>
          The <Link href="/privacy">privacy notice</Link> and{" "}
          <Link href="/cookies">cookies and storage policy</Link> explain how
          information is handled. Use the <Link href="/help">help centre</Link>{" "}
          or <Link href="/contact">contact form</Link> for support and
          account/deletion requests. The operating legal entity, registered
          address and dedicated support email have not yet been confirmed; this
          service currently provides its contact form for those requests.
          Automated replies and an immediate response are not promised.
        </p>
      </section>
    </article>
  );
}
