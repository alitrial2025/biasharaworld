#!/usr/bin/env python3
"""Check shared production targets without printing credentials.

Use --online for hosted health checks after cloud network access is available.
This reads ignored configuration and never rewrites it or deploys anything.
"""
import argparse
import json
import pathlib
import re
import sys
import urllib.error
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
AUTH = "https://rhgoiebknrpxtouswaar.supabase.co"
WEB = "https://biasharaworld.vercel.app"


def settings(path):
    values = {}
    for line in path.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--online", action="store_true")
    parser.add_argument(
        "--apk", type=pathlib.Path, help="Inspect this APK instead of the debug output."
    )
    args = parser.parse_args()
    results = []

    def check(name, condition, detail=None):
        results.append(
            {
                "check": name,
                "passed": bool(condition),
                **({"detail": detail} if detail else {}),
            }
        )

    web = settings(ROOT / "web/.env.local")
    native = settings(ROOT / "backend.properties")
    public = web.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    secret = web.get("SUPABASE_SECRET_KEY", "")
    check("web production account target", web.get("NEXT_PUBLIC_SUPABASE_URL") == AUTH)
    check(
        "Android uses the same account project and public key",
        native.get("SUPABASE_URL") == AUTH
        and native.get("SUPABASE_PUBLISHABLE_KEY") == public
        and bool(public),
    )
    check("Android uses the hosted application API", native.get("API_URL") == WEB)
    check("server credential configured separately", bool(secret) and public != secret)
    check(
        "native configuration contains no server credential",
        bool(secret) and secret not in (ROOT / "backend.properties").read_text(),
    )
    link = json.loads((ROOT / ".vercel/project.json").read_text())
    check(
        "checkout linked to the intended hosting project",
        link.get("projectId") == "prj_yPKKqhYLJF7MQm8QU3oTJxkZZVUx"
        and link.get("orgId") == "team_VFcEGDg8mcrF0HmaZKdtQyPI",
    )

    static = ROOT / "web/.next/static"
    apk = args.apk or ROOT / "app/build/outputs/apk/debug/app-debug.apk"
    if args.apk:
        check("requested Android package exists", apk.is_file())
    if static.exists() and secret:
        files = [p for p in static.rglob("*") if p.is_file()]
        check(
            "browser assets contain no server credential",
            bool(files) and all(secret.encode() not in p.read_bytes() for p in files),
        )
        check(
            "browser build includes the production account configuration",
            any(AUTH.encode() in p.read_bytes() for p in files)
            and bool(public)
            and any(public.encode() in p.read_bytes() for p in files),
        )
    if apk.exists() and secret:
        with zipfile.ZipFile(apk) as archive:
            dex = [
                archive.read(n)
                for n in archive.namelist()
                if re.fullmatch(r"classes\d*\.dex", n)
            ]
            check(
                "Android package contains no server credential",
                bool(dex) and all(secret.encode() not in data for data in dex),
            )
            check(
                "Android package includes production targets",
                any(AUTH.encode() in data for data in dex)
                and any(WEB.encode() in data for data in dex),
            )

    if args.online:
        for name, url, expected, headers in [
            (
                "hosted account service",
                AUTH + "/auth/v1/health",
                200,
                {"apikey": public},
            ),
            ("public website", WEB, 200, {}),
            (
                "hosted workspace rejects anonymous requests",
                WEB + "/api/workspace",
                401,
                {},
            ),
        ]:
            try:
                response = urllib.request.urlopen(
                    urllib.request.Request(url, headers=headers), timeout=15
                )
                check(name, response.status == expected, "HTTP " + str(response.status))
            except urllib.error.HTTPError as error:
                check(name, error.code == expected, "HTTP " + str(error.code))
            except urllib.error.URLError as error:
                reason = (
                    "Cloud proxy denied the connection"
                    if "403" in str(error.reason)
                    else "Hosted connection unavailable"
                )
                check(name, False, reason)
    print(
        json.dumps({"checks": results, "hostedChecksRequested": args.online}, indent=2)
    )
    return 0 if all(r["passed"] for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
