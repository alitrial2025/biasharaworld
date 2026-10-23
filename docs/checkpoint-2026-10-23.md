# Preservation checkpoint — 23 October 2026

This branch preserves the Android app, Next.js website, design assets, tests and backend work before further development. It is a work-in-progress backup, not a completed release.

The public website currently serves an earlier UI preview. The live backend integration and latest Android package have not yet been deployed together. Required follow-up includes the expanded live transfer scenario, current browser acceptance checks, email delivery configuration and final deployment verification. Consult the implementation plan and current runner reports before making readiness claims.

The last observed Android verification completed 26 JVM tests, lint and a debug build. The initial live backend suite passed 16 checks; expanded checks and the revised browser suite still need completion. The cloud workspace became unavailable during that work and has now reconnected for this backup.

Credentials, local environment files, cloud CLI state, caches and generated Android packages are deliberately excluded. Rebuild the package from the preserved source rather than treating an older downloadable APK as the current release.
