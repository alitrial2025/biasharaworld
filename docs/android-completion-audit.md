# Android completion audit

Baseline: current `feat/live-business-data` source, commit d24c61b. Work targets Android and the existing shared API. The web UI stays unchanged.

The audit covers account access and recovery; navigation; products and stock; basket and checkout; receipts and returns; customers and repayments; suppliers and purchasing; expenses and reports; staff and permissions; all twenty business tools; shop publishing; preferences; persistence; interrupted requests; and empty/error states.

Found: centered dialogs throughout the app; fabricated live sales counts; hard-coded sale filters; no product editor; incomplete product/customer/supplier forms; name-based customer selection; missing partial repayments; incomplete expenses/report controls; incorrect More destinations; demo copy on connected tool screens and printed records; missing role-aware controls; local drafts lost on reload; insufficient validation and failed-save recovery in sheets.

External payment gateways, lending and a generative AI provider are not configured. Existing manual payment recording, recorded business summaries, and published shop links must remain accurate about what they do.

## Completed Android work (0.3.0)

- Replaced app dialogs and selection popups with scrollable bottom sheets. Forms retain input on validation failure, expose backend errors, disable duplicate submissions, and close after a confirmed retry.
- Added full product editing, private product photos, SKU/barcode search, stock receiving with batches/expiry, and stock availability filters. Photo picker uploads use the signed-in member's token; thumbnails appear in inventory, sales, search and business tools.
- Connected customer contact fields and repayments to stable customer IDs. Added supplier details, quotes, purchasing, staff permission controls, expense editing/removal, actual reports and CSV export.
- Completed sale review, customer/payment selection, receipts, returns and printable records. Removed fabricated live metrics and misleading payment-provider copy. Long printed receipts paginate without dropping lines.
- Connected business-tool navigation, manual orders and fulfilment, shop publishing, alerts, preferences, business profile and account security. Home search opens the selected product or supplier. CameraX/ML Kit scans match only the current business catalogue, with manual entry as a fallback.
- Persisted account/business/branch-scoped drafts and pending requests in encrypted storage. An interrupted command retains its request ID across restarts; retry does not create a duplicate record. Enforced role permissions before writes and refreshed expired API sessions.
- Preserved the restored source's demo fixes, dark mode and sign-in/sign-up design. The website UI was not changed during this Android pass.

## Product-photo isolation

The deployed backend source is `a9ee85a`. Production Supabase has the private `product-images` bucket and membership/role storage policies from `20261024010000_private_product_images.sql`. Objects use `businessId/randomUuid.jpg`; only that business's members can read them, and only its Owner/Manager roles can write. The workspace API rejects missing images and paths from other businesses. Business records store private paths, not public URLs.

The Android picker downsamples photos, preserves orientation, reencodes JPEG and strips EXIF location metadata. Uploads have a 3 MB limit. Removing a photo detaches it from the product; old private objects are not automatically deleted.

## Verification

- Android debug unit/Compose suite: 40 tests passed, with the hosted integration test skipped in the default run. This combines the full 39-pass suite with the added product-search regression; all five connected-sheet tests passed after the navigation fix.
- Android lint: no errors (12 warnings and one informational suggestion in the completed lint report). Debug APK assembly passed.
- Opt-in native hosted test passed using a disposable confirmed account and the actual Kotlin HTTP client. Covered product/photo upload and read, cart refresh/hold/resume, checkout/return, customer repayments, expenses, stock counts/transfers/batches/expiry, branches/register/barcodes/promotions, supplier quotes/PO receipt, signed document IDs and conversions, variants/bundles, shop publishing/order fulfilment, rewards/preferences, and sign-out/sign-in. Temporary accounts and records were removed.
- Production image-isolation test: 16 passed, zero failed. Covered tenant separation, anonymous access, Viewer read/write permissions, invalid MIME, foreign/missing attachments, and persisted photo references. Disposable accounts, records and images were removed.
- Supporting web backend lint, typecheck and production build passed. The deployed API reports source `a9ee85a`; public website/account checks return 200 and anonymous workspace access returns 401.
- APK target/configuration checks passed, including absence of server credentials from the package and browser assets.

Physical-device camera/gallery permission flows, native printing and OEM background/restart behavior still need phone testing. The live harness uses an in-memory session store; the production app uses Android Keystore. Instrumentation was not run on a physical device/emulator.

## Delivery boundary

The installable artifact is `app/build/outputs/apk/debug/biasharaos-0.3.0-debug.apk`, intended for testing. The pinned release private key is absent from this restored workspace, so no substitute release identity was created. A compatible signed release requires restoring that key and its password. Existing payment-provider collection, lending, external generative AI and automatic notification delivery remain unconfigured; the app presents the available manual/recorded-data behavior accurately.
