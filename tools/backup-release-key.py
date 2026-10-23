#!/usr/bin/env python3
"""Prepare a private backup of the encrypted release key and its public identity.

The password is delivered as a separate private file, never inside the archive,
in Git, or under the website's public directory. Keep both in secure storage.
"""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import ssl
import zipfile

PRIVATE = Path("/workspace/.config/biashara-cli/android-release")
KEYSTORE = PRIVATE / "biasharaos-release.p12"
PASSWORD = PRIVATE / "store-password"


def main():
    os.umask(0o077)
    if not KEYSTORE.is_file() or not PASSWORD.is_file():
        raise SystemExit("Build the release with the existing signing key first.")
    check = subprocess.run(
        [
            "openssl",
            "pkcs12",
            "-info",
            "-noout",
            "-in",
            str(KEYSTORE),
            "-passin",
            "file:" + str(PASSWORD),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    if "AES-256-CBC" not in check.stderr:
        raise SystemExit("The signing backup does not use the expected key encryption.")
    java = Path(os.environ["JAVA_HOME"]) / "bin/keytool"
    certificate = subprocess.run(
        [
            str(java),
            "-exportcert",
            "-rfc",
            "-keystore",
            str(KEYSTORE),
            "-storepass:file",
            str(PASSWORD),
            "-alias",
            "biasharaos",
        ],
        capture_output=True,
        check=True,
    ).stdout
    expected = json.loads(
        (Path(__file__).resolve().parents[1] / "app/release-signing.json").read_text()
    )["certificateSha256"]
    if (
        hashlib.sha256(ssl.PEM_cert_to_DER_cert(certificate.decode())).hexdigest()
        != expected
    ):
        raise SystemExit(
            "The key backup does not match the app's pinned signing identity."
        )
    directory = PRIVATE / "backups"
    directory.mkdir(mode=0o700, exist_ok=True)
    archive = directory / (
        "biasharaos-release-key-"
        + datetime.now(timezone.utc).strftime("%Y-%m-%d")
        + ".zip"
    )
    separate_password = directory / "biasharaos-release-key-password.txt"
    instructions = """BiasharaOS Android release signing-key backup

biasharaos-release.p12 contains the private signing key encrypted with AES-256.
The certificate.pem file is public and identifies this signing key.
Alias: biasharaos. Store format: PKCS12.

The password is intentionally NOT in this archive. Store the separately supplied
password file and this backup in your password manager or other secure storage.
Do not upload either to a public website, Git repository or support ticket.

To restore future cloud builds, create a private directory at
/workspace/.config/biashara-cli/android-release (permissions 0700).
Restore the .p12 there and place its password in a file named store-password.
Both files must have permissions 0600. Then run tools/build-release.py with the
Android toolchain activated. It will reuse the existing key, not replace it.

Losing this key/password can prevent signing updates compatible with installed
release APKs. Preserve both outside the temporary development workspace.
"""
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as output:
        output.write(KEYSTORE, "biasharaos-release.p12")
        output.writestr("certificate.pem", certificate)
        output.writestr("RESTORE.txt", instructions)
    separate_password.write_bytes(PASSWORD.read_bytes())
    archive.chmod(0o600)
    separate_password.chmod(0o600)
    with zipfile.ZipFile(archive) as backup:
        assert backup.read("biasharaos-release.p12") == KEYSTORE.read_bytes()
        assert all(
            PASSWORD.read_bytes().strip() not in backup.read(name)
            for name in backup.namelist()
        )
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix(".zip.sha256").write_text(digest + "  " + archive.name + "\n")
    print(
        json.dumps(
            {
                "encryptedKeyBackup": str(archive),
                "separatePasswordFile": str(separate_password),
                "sha256": digest,
                "passwordIncludedInArchive": False,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
