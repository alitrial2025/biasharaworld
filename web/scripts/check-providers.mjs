import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { appOrigin, diditConfig, isolatedProviderEnvironment, paystackConfig } from "../src/lib/backend/provider-config.mjs";

nextEnv.loadEnvConfig(process.cwd());
const paystack = paystackConfig();
const owner = diditConfig("user");
const company = diditConfig("business");
const origin = appOrigin();
const probe = process.argv.includes("--probe");

function check(label, passed, failure) {
  console.log(passed ? `PASS  ${label}` : `CHECK ${label} · ${failure}`);
  if (!passed) process.exitCode = 1;
}

check("Provider database isolation", isolatedProviderEnvironment(), "Set BIASHARA_PRODUCTION_SUPABASE_URL and connect Preview to a separate Supabase project.");
check("Paystack", paystack, "Set the environment's PAYSTACK_SECRET_KEY and use an HTTPS callback origin.");
check("Didit owner workflow", owner, "Set DIDIT_API_KEY, DIDIT_WEBHOOK_SECRET and DIDIT_WORKFLOW_ID.");
check("Didit company workflow", company, "Set a separate DIDIT_COMPANY_WORKFLOW_ID.");
check("Public app origin", origin, "Set NEXT_PUBLIC_APP_URL to the HTTPS app origin, or use Vercel's system environment variables.");
if (origin) console.log(`Didit webhook  ${origin}/api/identity-verification/webhook`);
if (paystack) {
  console.log(`Paystack mode  ${paystack.domain}`);
  console.log(`Paystack webhook  ${paystack.origin}/api/payments/webhook`);
}

if (probe) {
  const probeFetch = (url, options) => fetch(url, {
    ...options, signal: AbortSignal.timeout(10000), redirect: "error", cache: "no-store",
  });
  const inspect = async (label, failure, callback) => {
    try { check(label, await callback(), failure); }
    catch { check(label, false, failure); }
  };
  const appProbe = async (url, body, headers) => {
    const response = await probeFetch(url, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body });
    return response.ok && (await response.json()).received === true;
  };
  const jobs = [
    inspect("Supabase merchant verification migration", "Check the linked project, server key and migrations.", async () => {
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: probeFetch },
      });
      const { error, data } = await db.rpc("merchant_verification_status", { target_business: "00000000-0000-0000-0000-000000000000" });
      return !error && data === "business_type_required";
    }),
  ];

  if (paystack) {
    jobs.push(inspect("Paystack Kenya bank API", "Check the key and Kenyan subaccount availability.", async () => {
      const response = await probeFetch("https://api.paystack.co/bank?country=kenya&currency=KES&perPage=1", { headers: { Authorization: `Bearer ${paystack.key}` } });
      if (!response.ok) return false;
      const value = await response.json();
      return value.status === true && Array.isArray(value.data) && value.data.length > 0;
    }));
    jobs.push(inspect("Deployed Paystack webhook", "Check deployment protection and the deployed key.", () => {
      const body = JSON.stringify({ event: "biasharaos.readiness" });
      return appProbe(`${paystack.origin}/api/payments/webhook`, body, {
        "x-paystack-signature": createHmac("sha512", paystack.key).update(body).digest("hex"),
      });
    }));
  }

  if (owner && company) {
    const headers = { "x-api-key": owner.apiKey };
    jobs.push(inspect("Published Didit workflows", "Check the workflow IDs and key access to read workflows.", async () => {
      const pending = new Map([[owner.workflowId, "kyc"], [company.workflowId, "kyb"]]);
      for (let offset = 0; offset < 500 && pending.size; offset += 50) {
        const response = await probeFetch(`https://verification.didit.me/v3/workflows/?limit=50&offset=${offset}`, { headers });
        if (!response.ok) return false;
        const result = await response.json();
        for (const workflow of result.results) {
          if (workflow.status === "published" && !workflow.is_archived &&
              pending.get(workflow.workflow_id) === workflow.workflow_type) pending.delete(workflow.workflow_id);
        }
        if (!result.next) break;
      }
      return pending.size === 0;
    }));
    if (origin) {
      const url = `${origin}/api/identity-verification/webhook`;
      jobs.push(inspect("Didit webhook destination", "Check the enabled v3 destination, subscriptions, and key access to list destinations.", async () => {
        const response = await probeFetch("https://verification.didit.me/v3/webhook/destinations/", { headers });
        if (!response.ok) return false;
        const destinations = await response.json();
        const expected = { production: "live", preview: "sandbox" }[process.env.VERCEL_ENV];
        return destinations.some(destination => destination.url === url && destination.enabled &&
          destination.webhook_version === "v3" && destination.secret_last4 === owner.secret.slice(-4) &&
          (!expected || destination.environment === expected) &&
          (destination.subscribed_events?.includes("status.updated") ||
            (destination.subscribed_events?.includes("user.status.updated") &&
              destination.subscribed_events?.includes("business.status.updated"))));
      }));
      jobs.push(inspect("Deployed Didit webhook", "Check deployment protection and the deployed signing secret.", () => {
        const body = JSON.stringify({ webhook_type: "biasharaos.readiness" });
        return appProbe(url, body, {
          "x-timestamp": String(Math.floor(Date.now() / 1000)),
          "x-signature": createHmac("sha256", owner.secret).update(body).digest("hex"),
        });
      }));
    }
  }
  await Promise.all(jobs);
}
