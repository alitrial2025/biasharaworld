# BiasharaOS 0.5.0

This update adds one shared catalog of 20 business sectors and 60 administrative workflows to Android and the web. The selected sector determines the focused workspace and recommended tools. Other shared tools remain accessible. Changing sectors preserves earlier operational records.

Operational records support typed fields, workflow statuses, manual payment/refund history, settled-record archiving, optimistic revisions and persisted idempotent recovery. Booking workflows prevent overlapping reservations for the same resource, including maintenance blocks. Paginated reads retain older records. These administrative records do not automatically post inventory or accounting entries.

Owners may defer business readiness during onboarding. Working tools remain locked behind a persistent reminder until the mandatory details and declaration are submitted. API, database and private-photo access enforce the same prerequisite; clearing readiness relocks access. Essential setup, preferences, support and safe confirmation of previously committed requests remain available. Completing readiness is explicitly separate from identity verification. The identity, payment collection and lending providers remain unconfigured. Kenya is the launch market; other African markets are marked as coming soon.

The public website includes a searchable sector directory, “Get app” navigation and Google Play/App Store icons marked as coming soon. Android downloads are controlled by a verified release manifest. The build rejects a missing or mismatched advertised APK; the staging helper verifies the original pinned signing certificate, release flags, alignment and production configuration before enabling the link.

## Android signing boundary

The source version is 0.5.0, version code 5. The original release private key/password are absent from the restored workspace, including the documented `/workspace/.config/biashara-cli/android-release/` location. Searches found only debug keys. The pinned public certificate remains unchanged. An unsigned release package and a debug test package can be built, but neither is published as an installable signed release. Restore the original private key and password before enabling public APK downloads. Store listings also require their actual published listing URLs.

After restoration:

```sh
source tools/cloud-env.sh
python3 tools/build-release.py
python3 tools/publish-android-release.py app/build/outputs/apk/release/biasharaos-0.5.0-release.apk
```

Run the hosted Android workflow check against the deployed API before publishing, then rebuild and redeploy the website with the staged APK. The manifest exposes only public version, size, path and checksum metadata. Never publish the key or its backup.

## Scope limits

Sector support covers business administration. Clinical patient records, bank/mobile-money movement, government customs filings, fleet GPS, identity checks and lender underwriting are not implemented or implied by the sector forms. Funding requests remain readiness/tracking records without lender submission or disbursement. No claim of a completion percentage, regulatory approval or production lending readiness is made.

## Validation

- Production Next.js build and full web lint pass. Across the full regression and focused rerun after fixes, 106 distinct browser/domain cases pass. Two email-delivery cases require a local SMTP fixture and remain skipped; the public APK integrity case remains skipped until the original signing key is restored.
- Real hosted Supabase with the local production API: 43 industry/access checks, 29 existing workspace checks, 23 product-photo checks and 31 funding checks pass. Disposable test accounts, businesses and photos are cleaned up.
- Industry coverage validates all 60 workflow schemas and all 20 responsive workspaces, including dark mode, relevant tools, role restrictions, pagination, conflict review, safe retry after a committed response is lost, and verification skip/resume.
- Android debug and release unit/Compose suites each run 65 cases: 64 pass, one hosted opt-in case is skipped by default, and none fail. The default skip is exercised separately against the deployed API before final delivery.
- The release staging helper rejects a debug APK whose certificate differs from the pinned signing identity. The signed release helper stops with an explicit key-restoration message while the key is absent; it does not generate a new identity.

Verification logs and generated packages are retained outside source control. Local API tests exercise the hosted database/storage but do not by themselves establish a successful Vercel deployment or a physical-device/store release. Deployment-source checks and the opt-in native hosted workflow are recorded separately after publication.
