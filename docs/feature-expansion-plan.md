# BiasharaOS: all 20 features across Android and web

Status: implemented; final UI verification is recorded in [the review guide](feature-expansion-review.md). This document retains the agreed twenty-feature scope and acceptance checklist.

## Product direction

Implement all 20 features in the Kotlin/Jetpack Compose app and the Next.js website. Each feature needs an accessible entry point, complete screens, useful sample data, working local demo interactions, and verification on both platforms. A placeholder dialog or a marketing card does not complete a feature.

Keep the established BiasharaOS identity: emerald actions, white and pastel surfaces, Inter interface text, Manrope headings, shop/product photography and the orange OS wordmark. Android uses focused screens and bottom sheets; web uses responsive workspaces, tables and side panels. Features and terminology stay consistent across them.

Continue the agreed UI-first scope. Money, stock and document interactions operate on local demo data. Camera decoding, payment gateways, email/SMS, authenticated customer access, server synchronisation and external delivery services remain later integrations. Their interfaces must describe preview behaviour accurately. Barcode sample scans, manual entry and keyboard scanner input provide a testable scanner flow now.

## Starting point before this expansion

- Android has 15 destinations in `MainActivity.kt` / `ui/Screen.kt`, a Compose `DemoStore`, and a ViewModel. Business data survives activity recreation but resets on process restart. Its scanner and settings currently open explanation dialogs.
- Web has 38 routes, a browser store under `biasharaos.demo.v1`, working local checkout and purchasing, and a responsive workspace shell. Staff tools and exports are already present; they are not counted again as new features.
- Both platforms store receipts as aggregate totals and item counts. Item-level receipt snapshots are a prerequisite for reliable returns, invoices, discounts, split payments and loyalty adjustments.
- Android colors are mostly global constants with explicit white surfaces; web also has many explicit colors and pixel-based text sizes. Dark mode and larger text require a pass over existing screens as well as new ones.
- The two demos have small catalogue/history differences. Align the expanded sample catalogue, identifiers, barcode values and example journeys so reviewers can follow the same scenario on either platform.

## Foundation work — before feature screens

1. Introduce matching domain contracts in Kotlin and TypeScript, with common example fixtures and expected results for parity tests. Keep platform implementations native; a shared backend is not required for this phase.
2. Use stable record IDs and integer minor currency units. Handle fractional KES input, discount rounding, refunds and payment allocation consistently. Validate safe ranges and format amounts for `en-KE` / `sw-KE`.
3. Add immutable sale-line snapshots, payment allocations, discounts, returns, branch stock, variants, bundle components, batches, inventory movements, register sessions, documents, customer orders, rewards and preferences.
4. Centralise mutations in store/repository commands. A sale, received transfer, finalised stocktake or refund must apply its effects once. Screens must not directly edit unrelated lists to imitate completion.
5. Persist Android demo state and preferences with a typed local DataStore repository. Retain ViewModel-driven observable UI state. Web uses a versioned store with explicit v1 migration, stable server-rendered snapshots and a visible storage-error fallback.
6. Preserve existing web demo records during migration, assigning the original Main branch. Aggregate receipts without reconstructable lines remain viewable as legacy records; explain why item-level returns are unavailable. Seed detailed receipts for the new return journeys. Never silently fabricate a user's historical line items or reset their saved data.
7. Establish two sample branches early. Each stock, sale, return, document, register and fulfilment record has a branch. Add the finished branch management UI in feature 16.
8. Introduce semantic theme and typography tokens plus an English/Kiswahili message catalogue early. Build new screens against them, then finish the existing-screen conversion in feature 20.
9. Extend navigation to carry record IDs safely. Android uses a feature destination with a saved tool identifier; web uses explicit feature routes and focused record dialogs/worksheets, plus separate shop and customer portal routes. Preserve the current main navigation habits.

## Feature checklist and acceptance criteria

The IDs below stay fixed throughout implementation. Mark Android, web and verification separately; completion requires all three.

| ID | Feature | Android deliverable | Web deliverable | Shared acceptance scenario | Android | Web | Verified |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | Barcode scanner | Scanner frame, sample-scan action, manual code entry, found-product sheet, unknown-code and camera-unavailable states | Scanner input, keyboard scanner support, barcode editor and printable label preview | A known code selects the correct variant; an unknown code offers search; zero stock cannot be added. Label codes match catalogue codes. | [x] | [x] | [x] |
| 02 | Hold a sale | Name/hold basket, parked-basket list, resume/discard actions | Open-basket panel with switching and customer labels | Holding keeps quantities, customer and discounts without reducing stock. Resume revalidates availability and avoids merging two baskets accidentally. | [x] | [x] | [x] |
| 03 | Discounts and promotions | Amount/percentage discount sheet, promotion picker and breakdown | Promotion list/editor, active dates, product eligibility and checkout preview | Invalid/expired offers are explained; totals cannot fall below zero; the receipt preserves the applied offer and rounded discount. | [x] | [x] | [x] |
| 04 | Split payments | Add/edit payment portions with remaining amount and review | Multi-method payment panel and receipt breakdown | Cash + M-Pesa/card allocations must equal the amount due exactly. Partial, excessive and duplicate submissions cannot complete a sale. | [x] | [x] | [x] |
| 05 | Returns and refunds | Receipt lookup, eligible lines, quantities, reason, restock choice and refund review | Returns list, detailed return workflow and status history | A partial return respects previously returned quantities, original net prices and payment allocations. Restock and refund records apply once; damaged goods are not made sellable. | [x] | [x] | [x] |
| 06 | Quotations and invoices | Document list, customer/item editor, due date, detail and PDF/share preview | Quotation/invoice workspace, document editor, status filters and print/download view | Convert a quote without retyping. Issuing a document does not itself deduct stock or record payment; completing its linked demo sale updates it once. Draft/tax status is clear. | [x] | [x] | [x] |
| 07 | Daily cash register | Open shift/float, cash-in/out, closing count and variance review | Register sessions, reconciliation details and closing summary | Expected cash equals opening float plus recorded cash receipts and linked cash-ins, less cash refunds and linked cash-outs. Split payments contribute only their cash portion. | [x] | [x] | [x] |
| 08 | Stocktaking | Start count, scan/search products, enter quantities, save draft and finalise | Stocktake worksheet, differences, reasons and adjustment review | Drafts do not change stock. Finalising records one adjustment per difference. A changed stock snapshot requires review before applying the count. | [x] | [x] | [x] |
| 09 | Expiry tracking | Batch detail, expiring-soon list and expiry badges | Batch management, expiry filters/calendar and write-off review | Batch quantities reconcile to branch stock. Expired units are excluded from sellable availability; sample sales allocate eligible batches consistently. | [x] | [x] | [x] |
| 10 | Product variants and bundles | Variant selector, pack options, bundle editor/detail | Variant matrix, unique SKUs/barcodes, bundle builder and pricing preview | Each variant has its own stock identity. A bundle's availability comes from its components, and selling/returning it changes component quantities once. Prevent circular bundles. | [x] | [x] | [x] |
| 11 | Stock movement history | Product timeline with reasons, quantities and linked records | Searchable/filterable ledger and downloadable movement records | Checkout, restock, stocktake, return, expiry write-off and transfer events show the right branch and reference; balances reconcile with the current stock view. | [x] | [x] | [x] |
| 12 | Stock transfers | Source/destination, quantities, dispatch, receive and status detail | Transfer workspace, review and status history | Draft → Dispatched → Received updates each branch once. Dispatched units are in transit, not sellable at either branch; invalid or duplicate transitions are blocked. | [x] | [x] | [x] |
| 13 | Supplier comparison | Compare offers for a product or restock basket | Supplier comparison table with prices, minimums, delivery and basket total | Compare the same variant/pack quantity, include delivery fees, explain minimum-order constraints, and carry the chosen basket into a demo purchase order. | [x] | [x] | [x] |
| 14 | Delivery management | Customer-order list, packing checklist, dispatch/delivery status and failure reason | Customer fulfilment board, delivery fee editor and order timeline | Customer deliveries are distinct from supplier purchase orders. The linked order, payment status and stock event stay consistent; packing or marking delivered cannot deduct stock a second time. | [x] | [x] | [x] |
| 15 | Customer loyalty | Customer points card, history, reward selection and redemption | Reward-rule editor, customer loyalty view and activity ledger | Completing an eligible sale earns points once; redemption cannot exceed the available balance. Returns reverse the corresponding earned/redeemed value with a visible explanation. | [x] | [x] | [x] |
| 16 | Multiple branches | Persistent branch switcher, branch directory and branch summary | Branch overview/comparison, branch editor and all-branches view | Sales, stock, registers and documents filter consistently. Store-wide customer/reward records are identified as such. Transfers remain accessible from both participating branches. | [x] | [x] | [x] |
| 17 | Merchant online shop | Publish-toggle preview, visible products, shop details and storefront preview | Merchant shop editor plus a public demo catalogue, product detail, basket and checkout UI | Visibility and selected fulfilment branch control the storefront. Checkout records a clearly labelled local customer order, without charging or contacting anyone. | [x] | [x] | [x] |
| 18 | Customer portal | Clearly marked 'preview as customer' with orders, invoices, balances and rewards | Responsive demo portal with customer overview and order/document details | The portal reflects the selected sample customer's records from the same local store. Returning to merchant mode is obvious; there is no claim of secure public access or real payment. | [x] | [x] | [x] |
| 19 | Offline and sync status | Persistent connection banner, saved-on-device activity, pending/failed preview states and retry | Connection indicator and sync activity panel with review/retry/conflict examples | Local work remains available after navigation/reload/relaunch. Preview retries never claim that a server accepted data. Simulated sync states and actual network availability are distinct. | [x] | [x] | [x] |
| 20 | Personalisation and accessibility | English/Kiswahili, Light/Dark/System, text-size settings and fully updated existing screens | Matching preferences across workspace, public site, storefront and portal | Preferences persist. Interface controls, forms and core status labels switch language using the shared catalogue; identifiers and sample names stay intact. Editorial/legal copy and historical narratives retain English where documented. Both themes and larger text remain usable. | [x] | [x] | [x] |

## Implementation waves and dependencies

Implement each wave on Android and web together. Review the same end-to-end scenario on both before moving to the next wave.

1. **Foundations:** versioned local state, record contracts, branch ownership, receipt lines, minor-unit calculations, reusable controls, semantic tokens, message catalogues and navigation.
2. **Selling — features 01–07:** scanner lookup, held baskets, discounts, split payments, returns, quotations/invoices and cash closing. Add receipt detail and document components shared within each platform.
3. **Inventory — features 08–12:** stocktaking, batches/expiry, variants/bundles, movement history and transfers. Revisit checkout/returns against the richer stock model; keep all original catalogue journeys working.
4. **Growth and customer journeys — features 13–18:** supplier comparison, deliveries, loyalty, branch management, merchant storefront and customer portal. Complete the customer-order lifecycle and connect merchant/customer previews.
5. **Resilience and full presentation pass — features 19–20:** connection/sync previews, complete localisation, existing-screen dark mode and text scaling, accessibility, cross-platform consistency and final screenshots.
6. **Final completion review:** exercise every row of the feature matrix, update help/marketing copy, refresh the downloadable Android preview, and save current run/check instructions.

Features 16 and 20 have foundational work in wave 1 because branch scoping, themes and translations affect every other feature. Their full interfaces and acceptance checks remain explicit deliveries in later waves.

## Navigation and presentation

### Android

- Keep Home, Sales, Stock, More and the central New sale action.
- Sales: baskets, promotions, returns, documents and register sessions.
- Stock: products, counts, batches/expiry, movements and transfers.
- More: supplier comparison, deliveries, loyalty, branches, online shop, customer-view preview, connection activity and preferences.
- Expose branch selection and relevant stock/expiry alerts from Home; provide contextual shortcuts from receipt, product and customer details.
- Use full screens for workflows and records; use sheets for quick selections and confirmations. Every nested screen needs predictable Back behaviour and draft preservation.

### Web

- Keep the current workspace shell and group new destinations beneath Sales, Inventory, Customers and Business tools. Use collapsible groups and a feature search/hub to avoid an excessively long sidebar.
- Add explicit routes beneath `/dashboard/` for held baskets, promotions, returns, quotations, invoices, registers, stocktakes, batches, movements, transfers, supplier comparison, deliveries, loyalty, branches, online-shop settings and connection activity.
- Keep record details/editors in focused dialogs or inline worksheets within each feature route, with selected record IDs and contextual navigation back to their list.
- Add a separate merchant storefront surface such as `/shop/[shopSlug]` and a clearly marked sample customer surface such as `/portal/[customerId]`. These are separate from the BiasharaOS corporate landing website.
- Share one browser-local demo store across workspace, storefront and portal layouts, with safe server snapshots and no cross-request server singleton. Changes in one surface must appear in the other after navigation.
- Use wide-screen comparison/management views with touch-friendly stacked alternatives on phones. Wide tables scroll inside their panel rather than widening the page.

## Local state rules that connect the features

- **Receipts:** snapshot products, variants, components, quantities, prices, discounts, customer, branch, time, payment portions and any reward allocation at completion. Later edits to product prices cannot rewrite historical receipts.
- **Stock:** derive branch availability from stock/batch records and reservations. Keep quantity changes and movement records in one local transaction.
- **Held baskets and quotes:** no stock deduction or reservation; recheck availability when resumed or paid.
- **Customer orders:** storefront submission creates a local pending order. Merchant confirmation reserves stock. Dispatch consumes the reservation and records the stock movement once. Delivery changes fulfilment status; payments remain a separate local status. Cancelling before dispatch releases reservations; goods returned after dispatch use the returns flow.
- **Transfers:** dispatch removes source availability into an explicit in-transit quantity; receiving adds it at the destination once. Cancel a draft freely; reversing a dispatched transfer requires a recorded return-to-source action.
- **Counts/write-offs:** drafts are editable without stock effects. Finalisation validates the starting snapshot and records the reason and affected batch/variant.
- **Money:** allocate order-wide discounts and partial refunds deterministically to the smallest currency unit. Refund limits use original net prices, not today's catalogue price. Payment portions reconcile exactly with the amount due.
- **Balances/rewards:** reconcile opening customer balances, linked receivables, payments/credit notes and reward events through their ledgers; avoid counting the same invoice, sale or repayment twice.
- **Register:** scope sessions to a branch and prevent conflicting open sessions in the local preview. Historical fixtures outside the session do not affect its opening/closing calculation.
- **Public previews:** demo URLs do not provide identity verification. Use sample identities and describe the intended future authenticated flow in the interface where relevant.
- **Offline:** Android's bundled UI and persisted local state work without a server. Web's loaded workspace can retain local edits, but offline cold-start availability needs a service worker and cached assets; do not claim it in this UI phase. Keep a future sync adapter separate from local persistence.

## Reusable UI and state coverage

Build consistent branch selectors, amount/quantity inputs, date controls, status chips with text/icons, record timelines, item pickers, discount/payment editors, document previews, empty states and confirmation sheets/dialogs. Use the same English/Kiswahili terminology on both platforms.

For every feature, include:

- A useful populated example and an understandable first-use/empty state.
- Invalid-input feedback next to the relevant field.
- Success, cancel/back and recoverable error paths.
- Unavailable/out-of-stock/permission states where relevant.
- Draft preservation and duplicate-action protection for multi-step workflows.
- Explicit labels for local financial actions and simulated integrations.
- Keyboard/screen-reader labels, focus behaviour, readable contrast, and status information beyond colour alone.

## Verification and completion gate

### Contract and state checks

Use the same example scenarios and expected results in Kotlin and TypeScript tests for discount rounding, split-payment totals, partial returns, bundle stock, expiry availability, stale stocktakes, transfer transitions, order reservations/fulfilment, register variance and loyalty reversal. Include rejected and repeated operations, not just the happy path.

Cover web v1 migration, legacy receipt display, Android persistence/relaunch, branch isolation, preference persistence, malformed-storage recovery and browser storage unavailability. Preserve the original checkout, stock, customer and purchasing journeys as regression cases.

### Android checks

- Run `:app:assembleDebug`, `:app:testDebugUnitTest` and `:app:lintDebug` with the existing cloud toolchain.
- Extend Robolectric API 35 native-graphics UI tests to cover all 20 entry points and representative complete journeys in each wave.
- Capture new screen previews plus existing screens in dark mode, Kiswahili and larger-text configurations. Exercise a narrow phone layout and system text scaling up to 200%.
- Keep real camera/printing/device integration tests separately identified. The unstable software emulator in this cloud machine is not evidence of device verification.

### Web checks

- Run locked install when dependencies change, ESLint, TypeScript, production build and formatting checks.
- Extend Playwright coverage for all 20 features, including merchant/storefront/portal navigation and related local data changes.
- Expand the existing route capture script to all new routes; inspect desktop, tablet and phone widths, both themes and both languages across representative screens.
- Check keyboard navigation, dialog focus/escape, enlarged text/200% zoom, image loading, JavaScript errors and page-wide overflow. Retain the existing five viewport widths: 360, 390, 768, 1024 and 1440 px.

### Review artifacts and sign-off

- Maintain this feature matrix as the single completion checklist; mark a row verified only with Android and web evidence.
- Keep implementation progress separate from already passing baseline checks. Planning a feature does not mark it implemented.
- Produce refreshed Android and web screenshot sheets organised by selling, stock, growth and preferences, with comparison examples for dark mode and Kiswahili.
- Update Android/web READMEs, help content and demo disclosures to match actual implemented behaviour. New marketing claims must point to working UI.
- Refresh the Android debug APK served by the website after the final verified build.
- Update cloud setup/start instructions only if toolchain or dependency changes require it; a configuration draft is separate from publishing the environment.

The phase is complete when all 20 rows have Android, web and verification checked, the original experience still works, and the screenshots, documentation and downloadable APK match the final source.
