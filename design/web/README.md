# BiasharaOS website previews

Actual Chromium screenshots of the running Next.js production build. Shared emerald/pastel colors, Inter/Manrope fonts, generated shop and product photographs, and the same sample business as the Kotlin app.

Files ending in `1440` show desktop layouts; `390` shows the responsive phone layout. Landing, dashboard, pricing, signup, inventory, checkout and assistant screens are included. These are browser captures, not mockups.

Regenerate with `npm run capture` in `web/` while its production server runs on port 3000. The capture script also visits all 38 routes at 1440, 1024, 768, 390 and 360 px widths and fails on page errors, non-200 responses or page-wide horizontal overflow. Large tables scroll within their panels.

The app and website are UI previews. Account authentication, payments, email delivery, live AI, supplier communication and cross-device sync need backend integration.
