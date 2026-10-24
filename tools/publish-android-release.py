#!/usr/bin/env python3
"""Stage a verified release, or an explicitly labelled debug preview with --preview."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path)
    parser.add_argument("--preview", action="store_true", help="Publish a clearly labelled debug preview; stable releases still require the pinned key.")
    args = parser.parse_args()
    apk = args.apk.resolve()
    android = Path(os.environ["ANDROID_HOME"]) / "build-tools/35.0.0"
    def output(*command):
        return subprocess.run([str(part) for part in command], check=True, capture_output=True, text=True).stdout
    certificate = output(android / "apksigner", "verify", "--verbose", "--print-certs", apk)
    expected = json.loads((ROOT / "app/release-signing.json").read_text())["certificateSha256"]
    fingerprints = re.findall(r"Signer #\d+ certificate SHA-256 digest: ([a-f0-9]+)", certificate)
    if (not args.preview and fingerprints != [expected]) or len(fingerprints) != 1:
        raise SystemExit("APK does not match the original pinned release signing identity.")
    output(android / "zipalign", "-c", "-P", "16", "4", apk)
    metadata = output(android / "aapt", "dump", "badging", apk)
    package = re.search(r"package: name='com.biashara.app' versionCode='(\d+)' versionName='([\d.]+)'", metadata)
    if not package or ("application-debuggable" in metadata) != args.preview:
        raise SystemExit("Stable releases must be non-debuggable; --preview accepts debug test builds only.")
    check = subprocess.run(["python3", str(ROOT / "tools/check-backend-connections.py"), "--apk", str(apk)], cwd=ROOT)
    if check.returncode:
        raise SystemExit("Production connection and credential checks failed.")
    version = package.group(2)
    filename = f"biasharaos-{version}-{'preview' if args.preview else 'release'}.apk"
    destination = ROOT / "web/public/downloads" / filename
    destination.parent.mkdir(exist_ok=True, parents=True)
    shutil.copyfile(apk, destination)
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    manifest = {"available": True, "version": version, "href": f"/downloads/{filename}", "sha256": digest, "bytes": destination.stat().st_size, "minimumAndroid": "8.0"}
    if args.preview:
        manifest["buildType"] = "debug-preview"
    (ROOT / "web/src/lib" / ("android-preview.json" if args.preview else "android-release.json")).write_text(json.dumps(manifest, indent=2) + "\n")
    destination.with_suffix(".apk.sha256").write_text(f"{digest}  {filename}\n")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
