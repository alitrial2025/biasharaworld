# BiasharaOS 0.5.1 branding patch

The original emerald business doodle is preserved as a transparent PNG under `shared/brand/`. The website uses a lossless WebP export on the landing hero, shared brand callouts and the assistant conversation area. Android uses the same art, tinted for light/dark themes, on the welcome hero and assistant. Backgrounds are decorative and ignore input/accessibility focus; chat bubbles and controls remain opaque. Operational tables and financial forms stay plain.

The desktop workspace also has consistent section gaps and wrapping action groups. Funding readiness now has proper card insets, separate request rows, aligned calculator fields and spaced review sheets. A visual layout audit covered ten workspace pages at two desktop widths in both themes, plus funding at desktop/mobile sizes. Six relevant browser checks passed, including the existing funding save/retry/withdraw flow. The wallpaper/theme audit passed seven browser checks.

The landing page adds an original SVG growth accent, gentle hero-card movement, staggered section reveals and hover/focus feedback. Motion is web-only and uses CSS plus a small IntersectionObserver initializer, without an animation dependency. Reduced-motion preferences disable decorative loops; unsupported observers and JavaScript-disabled browsers retain visible content. Twelve targeted landing/download checks passed, including these fallbacks and APK integrity.

Android version is 0.5.1, code 6. Four focused UI/accessibility checks pass; both APK variants build and release lint passes with zero errors. The new debug preview certificate matches 0.5.0 so an existing preview can be updated. The underlying business workflows retain the [0.5.0 validation baseline](release-0.5.0-audit.md).

The website offers the tested preview with a checksum and test-build label. The stable release remains unsigned because the original private release key is absent; its public signing identity is unchanged. The previous chat's backup locations are documented in [Android release instructions](android-release.md). Generated older APKs are retained privately rather than uploading multiple large previews in each deployment.
