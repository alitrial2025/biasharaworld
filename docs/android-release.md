# Android signed test release

The previous version 0.2.0 (version code 2) was a non-debuggable Android release APK signed with a dedicated RSA 3072-bit key. The current source is version 0.5.0 (version code 5). Its public account project and application API point to the intended production services. See [the 0.5.0 audit](release-0.5.0-audit.md) for scope and provider/device boundaries.

The restored workspace does not contain the pinned private release key or password. The 0.5.0 unsigned release output cannot be installed until signed; the debug test APK cannot update the older signed release in place. Restore the original private key before producing a compatible release; do not generate a replacement identity. The website offers the tested 0.5.0 APK as an explicitly labelled Android preview while the stable release remains unavailable.

The previous chat “Set up biasharaworld” confirms that the backup was created at `/workspace/.config/biashara-cli/android-release/backups/biasharaos-release-key-2026-10-23.zip`, with a separate `biasharaos-release-key-password.txt`. Neither file is present in this restored workspace. Recover those private downloads from that chat to restore stable release signing.

To stage a newly tested debug preview, run `python3 tools/publish-android-release.py --preview app/build/outputs/apk/debug/biasharaos-0.5.0-debug.apk` with the toolchain activated. This checks the APK signature, package, debug flag and production configuration, then copies it to the website and writes its checksum manifest. The stable release path continues to require the original pinned certificate.

## Build and verify

```sh
source tools/cloud-env.sh
python3 tools/build-release.py
python3 tools/check-backend-connections.py --apk app/build/outputs/apk/release/biasharaos-0.5.0-release.apk
python3 tools/publish-android-release.py app/build/outputs/apk/release/biasharaos-0.5.0-release.apk
```

The release helper runs the release unit tests, lint and APK assembly. It aligns the APK, signs it with APK signature schemes v2/v3, verifies the signature and alignment, checks that it is not debuggable, and writes a SHA-256 checksum plus verification JSON next to the APK. The version/file name comes from Android build metadata. Generated packages remain outside Git.

The Compose accessibility test registers its host activity only in the JVM test application. The release APK does not gain a debug test activity just to satisfy the fixture.

## Stable signing identity

Public signing identity is pinned in `app/release-signing.json`. Private material lives outside the checkout:

- `/workspace/.config/biashara-cli/android-release/biasharaos-release.p12`
- `/workspace/.config/biashara-cli/android-release/store-password`

When restored, the directory must have permissions 0700 and both files 0600. The private key is encrypted in PKCS12 with AES-256; its password is randomly generated. Do not print it or commit private signing material. The build checks the certificate fingerprint against the pinned identity. If the key is missing or differs, the build fails rather than silently creating a replacement. Restore the backup for future builds.

The public certificate SHA-256 fingerprint is `e45fa348db25df8f04c30eba853c20e1480407de835a47082d18729ecccc7745`. Only public identity metadata is tracked in Git.

## Downloadable private backup

```sh
source tools/cloud-env.sh
python3 tools/backup-release-key.py
```

The helper creates a private ZIP under the signing directory's `backups/` folder. It contains the encrypted PKCS12 key, public certificate and restore instructions. The password is **not** inside this ZIP; a separate private password file accompanies the download. Keep both in secure storage outside this cloud workspace. Neither belongs on the public website, in a Git repository, or in a support message.

Workspace retention alone is not an independent backup. Losing the key/password can prevent signing compatible updates for installed release APKs. The backup's encrypted key bytes, certificate identity and separate password are verified against the active signing material.

## Installation and publication

The APK supports Android 8.0+. Allow installation from the app used to open the downloaded APK. An older debug preview uses a different signing key; Android cannot update it directly with this release. If installation reports that signing conflict, removing the old preview permits installation, but clears that installation's local sessions/drafts. Saved business records remain tied to the account.

The API deployment and APK are verified separately. Do not publish the debug test build as a signed release download. After restoring the release key, build and verify a signed APK against the deployed API, then copy it into `web/public/downloads/`, allow that APK in deployment exclusions, update its download link and redeploy. Never copy the key backup or password file there.
