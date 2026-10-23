#!/usr/bin/env python3
"""Build and sign the Android release without copying signing secrets into Git.

Activate tools/cloud-env.sh first in the prepared cloud environment. The signing
key is reused on subsequent builds; preserve its private directory securely.
"""
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = Path("/workspace/.config/biashara-cli/android-release")
KEYSTORE = PRIVATE / "biasharaos-release.p12"
PASSWORD = PRIVATE / "store-password"
ALIAS = "biasharaos"


def run(args, **kwargs):
    return subprocess.run([str(a) for a in args], check=True, **kwargs)


def public_settings():
    values = {}
    for line in (ROOT / "backend.properties").read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            values[key] = value.strip()
    for key in ("SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "API_URL"):
        values[key] = os.environ.get(key, values.get(key, ""))
    if (
        values["SUPABASE_URL"] != "https://rhgoiebknrpxtouswaar.supabase.co"
        or values["API_URL"] != "https://biasharaworld.vercel.app"
        or not values["SUPABASE_PUBLISHABLE_KEY"]
        or values["SUPABASE_PUBLISHABLE_KEY"].startswith("sb_secret_")
    ):
        raise SystemExit(
            "Release requires the intended production public account/API settings."
        )
    return values


def signing_key(java):
    PRIVATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    PRIVATE.chmod(0o700)
    if KEYSTORE.exists() != PASSWORD.exists():
        raise SystemExit(
            "Signing files are incomplete. Restore the existing key; do not replace its identity."
        )
    identity = ROOT / "app/release-signing.json"
    if identity.exists() and not KEYSTORE.exists():
        raise SystemExit(
            "Restore the backed-up release key and password. This app already has a signing identity; a replacement key will not be generated."
        )
    if not KEYSTORE.exists():
        with open(
            PASSWORD, "x", opener=lambda path, flags: os.open(path, flags, 0o600)
        ) as file:
            file.write(secrets.token_urlsafe(48) + "\n")
        run(
            [
                java / "keytool",
                "-genkeypair",
                "-keystore",
                KEYSTORE,
                "-storetype",
                "PKCS12",
                "-storepass:file",
                PASSWORD,
                "-keypass:file",
                PASSWORD,
                "-alias",
                ALIAS,
                "-keyalg",
                "RSA",
                "-keysize",
                "3072",
                "-validity",
                "10000",
                "-dname",
                "CN=BiasharaOS, OU=Mobile, O=BiasharaOS, C=KE",
            ]
        )
    KEYSTORE.chmod(0o600)
    PASSWORD.chmod(0o600)
    if identity.exists():
        certificate = run(
            [
                java / "keytool",
                "-exportcert",
                "-keystore",
                KEYSTORE,
                "-storepass:file",
                PASSWORD,
                "-alias",
                ALIAS,
            ],
            capture_output=True,
        ).stdout
        expected = json.loads(identity.read_text())["certificateSha256"]
        if hashlib.sha256(certificate).hexdigest() != expected:
            raise SystemExit(
                "The signing key does not match this app's existing release identity."
            )


def main():
    os.umask(0o077)
    public = public_settings()
    java = Path(os.environ["JAVA_HOME"]) / "bin"
    android = Path(os.environ["ANDROID_HOME"]) / "build-tools/35.0.0"
    signing_key(java)
    run(
        [
            ROOT / "gradlew",
            ":app:testReleaseUnitTest",
            ":app:lintRelease",
            ":app:assembleRelease",
            "--no-daemon",
        ],
        cwd=ROOT,
    )
    output = ROOT / "app/build/outputs/apk/release"
    metadata = json.loads((output / "output-metadata.json").read_text())
    if (
        metadata["applicationId"] != "com.biashara.app"
        or len(metadata["elements"]) != 1
    ):
        raise SystemExit("Expected one release APK for the BiasharaOS application.")
    package = metadata["elements"][0]
    version = package["versionName"]
    version_code = package["versionCode"]
    unsigned = output / package["outputFile"]
    aligned = output / "biasharaos-release-aligned.apk"
    signed = output / f"biasharaos-{version}-release.apk"
    run([android / "zipalign", "-P", "16", "-f", "4", unsigned, aligned])
    run(
        [
            android / "apksigner",
            "sign",
            "--ks",
            KEYSTORE,
            "--ks-key-alias",
            ALIAS,
            "--ks-pass",
            "file:" + str(PASSWORD),
            "--min-sdk-version",
            "26",
            "--v1-signing-enabled",
            "false",
            "--v2-signing-enabled",
            "true",
            "--v3-signing-enabled",
            "true",
            "--v4-signing-enabled",
            "false",
            "--out",
            signed,
            aligned,
        ]
    )
    certificate = run(
        [android / "apksigner", "verify", "--verbose", "--print-certs", signed],
        capture_output=True,
        text=True,
    ).stdout
    run([android / "zipalign", "-c", "-P", "16", "4", signed])
    badging = run(
        [android / "aapt", "dump", "badging", signed], capture_output=True, text=True
    ).stdout
    if (
        "application-debuggable" in badging
        or f"versionCode='{version_code}'" not in badging
        or f"versionName='{version}'" not in badging
    ):
        raise SystemExit("Release metadata/debuggable checks failed.")
    with zipfile.ZipFile(signed) as archive:
        dex = [
            archive.read(name) for name in archive.namelist() if name.endswith(".dex")
        ]
        if not all(
            any(value.encode() in data for data in dex) for value in public.values()
        ):
            raise SystemExit(
                "Signed package does not contain the intended production configuration."
            )
        if PASSWORD.read_text().strip().encode() in b"".join(dex):
            raise SystemExit("Signing material was found in the package.")
    digest = hashlib.sha256(signed.read_bytes()).hexdigest()
    signed.with_suffix(".apk.sha256").write_text(digest + "  " + signed.name + "\n")
    result = {
        "file": str(signed.relative_to(ROOT)),
        "version": version,
        "versionCode": version_code,
        "bytes": signed.stat().st_size,
        "sha256": digest,
        "debuggable": False,
        "signatureVerified": True,
        "alignment16KBVerified": True,
        "certificate": certificate.splitlines(),
        "hostedApiVerified": False,
    }
    signed.with_suffix(".apk.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
