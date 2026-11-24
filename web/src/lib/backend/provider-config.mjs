import { z } from "zod";

/** @param {string | undefined} value */
function httpsOrigin(value) {
  if (!value || !URL.canParse(value)) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.href !== `${url.origin}/`) return null;
  return url.origin;
}

export function appOrigin() {
  const configured = httpsOrigin(process.env.NEXT_PUBLIC_APP_URL?.trim());
  if (configured) return configured;
  const host = process.env.VERCEL_ENV === "production"
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL
    : process.env.VERCEL_URL;
  return host ? httpsOrigin(`https://${host}`) : null;
}

export function isolatedProviderEnvironment() {
  if (process.env.VERCEL_ENV !== "preview") return true;
  const production = httpsOrigin(process.env.BIASHARA_PRODUCTION_SUPABASE_URL?.trim());
  const preview = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return !!production && !!preview && URL.canParse(preview) && new URL(preview).origin !== production;
}

export function paystackConfig() {
  if (!isolatedProviderEnvironment()) return null;
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key || !/^sk_(test|live)_[a-zA-Z0-9]+$/.test(key)) return null;
  const override = process.env.PAYSTACK_CALLBACK_ORIGIN?.trim();
  const origin = override ? httpsOrigin(override) : appOrigin();
  const domain = key.startsWith("sk_test_") ? "test" : "live";
  const vercel = process.env.VERCEL_ENV;
  if (!origin || (vercel === "production" && domain !== "live") ||
      (vercel === "preview" && domain !== "test")) return null;
  return { key, origin, domain };
}

/** @param {"user" | "business"} kind */
export function diditConfig(kind) {
  if (!isolatedProviderEnvironment()) return null;
  const apiKey = process.env.DIDIT_API_KEY?.trim();
  const secret = process.env.DIDIT_WEBHOOK_SECRET?.trim();
  const ownerWorkflow = process.env.DIDIT_WORKFLOW_ID?.trim();
  const envWorkflow = kind === "business" ? process.env.DIDIT_COMPANY_WORKFLOW_ID?.trim() : ownerWorkflow;
  const workflow = z.uuid().safeParse(envWorkflow);
  if (!apiKey || !secret || !workflow.success || (kind === "business" && workflow.data === ownerWorkflow)) return null;
  return { apiKey, workflowId: workflow.data, secret };
}
