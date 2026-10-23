#!/usr/bin/env python3
"""Real local Postgres 17 + Supabase Auth/PostgREST, isolated from production.

Uses small official images because the full CLI Postgres image exceeds the cloud
machine's Docker layer space. Credentials remain in mode-0600 files outside Git.
"""
import base64, hashlib, hmac, json, os, pathlib, secrets, subprocess, sys, time, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
PRIVATE = pathlib.Path("/workspace/.config/biashara-cli/local-backend")
CONFIG = PRIVATE / "environment.json"
NAMES = [
    "biashara_test_db",
    "biashara_test_auth",
    "biashara_test_rest",
    "biashara_test_mail",
]
IMAGES = [
    "postgres:17-alpine@sha256:eee6c6e1b0894fa4fe0075eb054af9fd1cf39a35321c2d4110626cfe506411fb",
    "ghcr.io/supabase/gotrue:v2.197.0",
    "ghcr.io/supabase/postgrest:v16.5",
    "ghcr.io/supabase/mailpit:v1.31.3",
]


def run(args, **kw):
    return subprocess.run(args, check=True, **kw)


def private(name, value):
    p = PRIVATE / name
    p.write_text(value)
    p.chmod(0o600)
    return p


def jwt(secret, role):
    def enc(value):
        return base64.urlsafe_b64encode(
            json.dumps(value, separators=(",", ":")).encode()
        ).rstrip(b"=")

    body = (
        enc({"alg": "HS256", "typ": "JWT"})
        + b"."
        + enc(
            {
                "role": role,
                "iss": "supabase-local",
                "iat": int(time.time()),
                "exp": int(time.time()) + 31536000,
            }
        )
    )
    return (
        body
        + b"."
        + base64.urlsafe_b64encode(
            hmac.new(secret.encode(), body, hashlib.sha256).digest()
        ).rstrip(b"=")
    ).decode()


def env_file(name, values):
    return private(name, "\n".join(k + "=" + str(v) for k, v in values.items()) + "\n")


def sql(statement):
    return run(
        [
            "docker",
            "exec",
            "-i",
            NAMES[0],
            "psql",
            "-v",
            "ON_ERROR_STOP=1",
            "-U",
            "postgres",
            "-d",
            "postgres",
        ],
        input=statement,
        text=True,
        stdout=subprocess.DEVNULL,
    )


def health():
    for path in ["/auth/v1/health", "/rest/v1/"]:
        r = urllib.request.urlopen(
            urllib.request.Request(
                "http://127.0.0.1:54321" + path,
                headers={
                    "apikey": json.loads(CONFIG.read_text())[
                        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
                    ]
                },
            ),
            timeout=5,
        )
        if r.status != 200:
            raise RuntimeError("Local service is not healthy.")


def schema_manifest():
    return {
        p.name: hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted((ROOT / "supabase/migrations").glob("*.sql"))
    }


def launch_gateway():
    log = open(PRIVATE / "gateway.log", "ab")
    process = subprocess.Popen(
        ["node", str(ROOT / "tools/local-gateway.mjs"), str(CONFIG)],
        stdin=subprocess.DEVNULL,
        stdout=log,
        stderr=log,
        start_new_session=True,
    )
    private("gateway.pid", str(process.pid))


def resume():
    marker = PRIVATE / "initialized.json"
    if not marker.exists() or json.loads(marker.read_text()) != schema_manifest():
        raise SystemExit(
            "Local schema is incomplete or migrations changed. Inspect the test services; no data was reset."
        )
    run(["docker", "start", *NAMES], stdout=subprocess.DEVNULL)
    for _ in range(45):
        try:
            urllib.request.urlopen("http://127.0.0.1:54325/health", timeout=2)
            urllib.request.urlopen("http://127.0.0.1:54326/", timeout=2)
            break
        except Exception:
            time.sleep(1)
    else:
        raise SystemExit(
            "Retained local services did not become healthy. Inspect the test containers."
        )
    try:
        health()
        return
    except Exception:
        launch_gateway()
    for _ in range(20):
        try:
            health()
            print("Retained local account and data services restarted.")
            return
        except Exception:
            time.sleep(1)
    raise SystemExit("Local gateway did not restart. Inspect its private log.")


def start():
    PRIVATE.mkdir(parents=True, exist_ok=True)
    PRIVATE.chmod(0o700)
    if CONFIG.exists():
        try:
            health()
            print("Local account and data services already healthy.")
            return
        except Exception:
            pass
    if any(
        subprocess.run(
            ["docker", "inspect", name],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        ).returncode
        == 0
        for name in NAMES
    ):
        resume()
        return
    for image in IMAGES:
        if subprocess.run(
            ["docker", "image", "inspect", image],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        ).returncode:
            run(["docker", "pull", image], stdout=subprocess.DEVNULL)
    secret = secrets.token_urlsafe(48)
    password = secrets.token_urlsafe(30)
    settings = {
        "NEXT_PUBLIC_SUPABASE_URL": "http://127.0.0.1:54321",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": jwt(secret, "anon"),
        "SUPABASE_SECRET_KEY": jwt(secret, "service_role"),
        "NEXT_PUBLIC_APP_URL": "http://127.0.0.1:3002",
        "NODE_USE_ENV_PROXY": "1",
    }
    private("environment.json", json.dumps(settings))
    subprocess.run(
        ["docker", "network", "create", "biashara_test"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    def container(name, image, port, variables):
        file = env_file(name + ".env", variables)
        run(
            [
                "docker",
                "run",
                "-d",
                "--name",
                name,
                "--network",
                "biashara_test",
                "--env-file",
                str(file),
                "-p",
                "127.0.0.1:" + port,
                image,
            ],
            stdout=subprocess.DEVNULL,
        )

    container(NAMES[0], IMAGES[0], "54322:5432", {"POSTGRES_PASSWORD": password})
    for _ in range(60):
        if (
            subprocess.run(
                ["docker", "exec", NAMES[0], "pg_isready", "-U", "postgres"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            ).returncode
            == 0
        ):
            break
        time.sleep(1)
    else:
        raise SystemExit("Local Postgres failed to start.")
    sql(
        f"""create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
 create role authenticator login noinherit password '{password}';grant anon,authenticated,service_role to authenticator;
 create role supabase_auth_admin login createrole password '{password}';
 create schema auth authorization supabase_auth_admin;
 grant usage on schema auth,public to anon,authenticated,service_role,authenticator;
 create extension if not exists pgcrypto;
 """
    )
    container(NAMES[3], IMAGES[3], "54324:8025", {})
    container(
        NAMES[1],
        IMAGES[1],
        "54325:9999",
        {
            "GOTRUE_API_HOST": "0.0.0.0",
            "GOTRUE_API_PORT": 9999,
            "API_EXTERNAL_URL": "http://127.0.0.1:54321",
            "GOTRUE_SITE_URL": "http://127.0.0.1:3002",
            "GOTRUE_URI_ALLOW_LIST": "http://127.0.0.1:3002/auth/callback**,http://localhost:3001/auth/callback**,biasharaos://auth/callback",
            "GOTRUE_DB_DRIVER": "postgres",
            "GOTRUE_DB_DATABASE_URL": f"postgres://supabase_auth_admin:{password}@{NAMES[0]}:5432/postgres?search_path=auth",
            "GOTRUE_DB_NAMESPACE": "auth",
            "GOTRUE_JWT_SECRET": secret,
            "GOTRUE_JWT_EXP": 3600,
            "GOTRUE_JWT_AUD": "authenticated",
            "GOTRUE_JWT_ADMIN_ROLES": "service_role",
            "GOTRUE_JWT_DEFAULT_GROUP_NAME": "authenticated",
            "GOTRUE_EXTERNAL_EMAIL_ENABLED": "true",
            "GOTRUE_MAILER_AUTOCONFIRM": "false",
            "GOTRUE_PASSWORD_MIN_LENGTH": 8,
            "GOTRUE_SMTP_HOST": NAMES[3],
            "GOTRUE_SMTP_PORT": 1025,
            "GOTRUE_SMTP_ADMIN_EMAIL": "accounts@biashara.test",
            "GOTRUE_SMTP_SENDER_NAME": "BiasharaOS",
            "GOTRUE_MAILER_URLPATHS_CONFIRMATION": "/auth/v1/verify",
            "GOTRUE_MAILER_URLPATHS_RECOVERY": "/auth/v1/verify",
            "GOTRUE_RATE_LIMIT_EMAIL_SENT": 1000,
        },
    )
    for _ in range(60):
        try:
            urllib.request.urlopen("http://127.0.0.1:54325/health", timeout=2)
            break
        except Exception:
            time.sleep(1)
    else:
        raise SystemExit(
            "Local account service failed to start. Inspect its container log."
        )
    sql(
        "create or replace function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;create or replace function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role'$$;create or replace function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;"
    )
    for migration in sorted((ROOT / "supabase/migrations").glob("*.sql")):
        sql("begin;\n" + migration.read_text() + "\ncommit;")
    container(
        NAMES[2],
        IMAGES[2],
        "54326:3000",
        {
            "PGRST_DB_URI": f"postgres://authenticator:{password}@{NAMES[0]}:5432/postgres",
            "PGRST_DB_SCHEMAS": "public",
            "PGRST_DB_ANON_ROLE": "anon",
            "PGRST_JWT_SECRET": secret,
        },
    )
    launch_gateway()
    for _ in range(30):
        try:
            health()
            private("initialized.json", json.dumps(schema_manifest()))
            print("Local Postgres 17, account, email capture and REST checks passed.")
            return
        except Exception:
            time.sleep(1)
    raise SystemExit("Local gateway readiness check failed.")


if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else "status"
    if command == "start":
        start()
    elif command == "status":
        health()
        print("Local account and data services healthy.")
    elif command == "run":
        health()
        environment = {**os.environ, **json.loads(CONFIG.read_text())}
        args = sys.argv[2:]
        args = args[1:] if args and args[0] == "--" else args
        if not args:
            raise SystemExit("Provide a command to run.")
        raise SystemExit(subprocess.call(args, cwd=ROOT, env=environment))
    else:
        raise SystemExit("Usage: local-backend.py start|status|run -- command")
