# BiasharaOS 0.6.0 — Home, navigation and startup

Home uses a forest-green header with the original brand doodle, a natural-height business/branch selector, account and refresh controls, and labelled search. Four primary actions adapt to business sector and available width. Today's figures retain the existing server-backed calculations; cards become a single column at large text sizes. The sector workspace follows the figures as one concise action. Empty businesses receive an explanation instead of a blank recent-sales section.

The bottom navigation has readable labels, selected-tab semantics, larger touch targets and a height that follows text size. Operations is a top-level destination for connected businesses. Checkout continues to respect readiness and role permissions. Shared page, card, button, search and filter spacing has been improved; system bar icon contrast follows the app's selected theme.

The animated logo is an original SVG-derived emerald B with a growing orange seed, also available in `shared/brand/biashara-startup.svg`. Android uses vector resources for native launch and the same path geometry in Compose. Initial account/session/business loading determines when startup ends. There is no minimum wait or simulated percentage. Connection failure offers retry and sign-out, and recovery links retain their existing route. Disabled system animations stop the decorative loop. Native launch colors support day and night.

Funding readiness now separates recorded figures, verification status, request summaries and actions, with wrapping layouts and more readable request/calculator sheets. Backend, eligibility and provider availability rules are unchanged.

The downloadable artifact is a debug preview. The pinned stable signing key is still absent from the restored workspace. No replacement release identity is generated. See [Android release instructions](android-release.md).

Validation: 72 runnable Android checks pass (one optional hosted workflow skipped), including checkout/history, all twenty tool screens, startup recovery/reduced motion, Home search/navigation and Funding at large text sizes. Five browser checks pass for Get app navigation across mobile/desktop themes and downloaded APK bytes/hash. Debug and unsigned release APK builds, release lint (zero errors), and the production web build pass. UI captures use native Android graphics on the JVM; no physical-device test was available for this update.
