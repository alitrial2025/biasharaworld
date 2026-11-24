"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, PageHeading, SelectField } from "@/components/ui";
import { useDemo } from "@/lib/store";
import { supabase } from "@/lib/supabase";

type Status = {
  enabled: boolean;
  status?: string | null;
  next?: string | null;
  requiresOwner?: boolean;
  needsStructure?: boolean;
  individual?: boolean;
  legalStructure?: "individual" | "registered_entity" | null;
  merchantStatus?: "business_type_required" | "owner_identity_required" | "company_verification_required" | "verified";
  needsSupport?: boolean;
  starting?: boolean;
  kenyaRegistryPassed?: boolean;
  representativeReview?: "Pending" | "Approved" | "Declined" | null;
};
const restartable = new Set(["Expired", "Abandoned", "Kyc Expired"]);
type Action = { action: "start" | "refresh" } | { action: "declare"; legalStructure: NonNullable<Status["legalStructure"]> };

async function requestVerification(company: boolean, action?: Action, signal?: AbortSignal): Promise<Status> {
  const { data: { session } } = await supabase().auth.getSession();
  if (!session) throw new Error("Sign in to continue.");
  const response = await fetch(company ? "/api/company-verification" : "/api/identity-verification", {
    method: action ? "POST" : "GET",
    headers: { Authorization: `Bearer ${session.access_token}`, ...(action ? { "Content-Type": "application/json" } : {}) },
    body: action ? JSON.stringify(action) : undefined,
    signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not check verification.");
  return result;
}

export function IdentityVerificationPage({ company = false }: { company?: boolean }) {
  const { store } = useDemo();
  const owner = store.workspace?.role === "Owner";
  const businessId = store.workspace?.businessId;
  const [result, setResult] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [structure, setStructure] = useState<"" | NonNullable<Status["legalStructure"]>>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!owner) return;
    const controller = new AbortController();
    async function load() {
      const status = await requestVerification(company, undefined, controller.signal);
      if (controller.signal.aborted) return;
      setResult(status);
      const returned = new URLSearchParams(window.location.search).has("verificationSessionId");
      if (returned && status.enabled && status.status) {
        const updated = await requestVerification(company, { action: "refresh" }, controller.signal);
        if (!controller.signal.aborted) setResult(updated);
      }
    }
    load().catch((failure: Error) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [owner, businessId, company]);

  async function submit(action: Action) {
    setBusy(true);
    setError("");
    try { setResult(await requestVerification(company, action)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not check verification."); }
    finally { setBusy(false); }
  }

  const ready = result?.enabled && !result.requiresOwner && !result.needsSupport && !result.starting &&
    !result.needsStructure && !result.individual && (company || !!result.legalStructure);
  const canStart = ready && (!result.status || restartable.has(result.status));
  const title = company ? "Kenyan company verification" : "Owner identity verification";
  return (
    <>
      <PageHeading title={title} description={company
        ? "Check a registered company and your authority to act for it."
        : "Declare your legal structure and verify your identity before publishing a shop or connecting payments."} />
      <section className="panel settings-panel">
        {!owner ? <p>Ask the business owner to complete verification.</p> : (
          <>
            {!company && result?.merchantStatus === "business_type_required" && (
              <form onSubmit={(event) => { event.preventDefault(); if (structure) void submit({ action: "declare", legalStructure: structure }); }}>
                <SelectField label="Legal structure" value={structure} onChange={(value) => setStructure(value === "registered_entity" || value === "individual" ? value : "")} required>
                  <option value="">Choose your legal structure</option>
                  <option value="individual">Individual or sole proprietor</option>
                  <option value="registered_entity">Company or other registered entity</option>
                </SelectField>
                <p>Choose the legal structure you trade under. Contact support if you need to change it later.</p>
                <Button type="submit" disabled={busy || !structure}>Confirm legal structure</Button>
              </form>
            )}
            {!company && result?.legalStructure && <p>{result.legalStructure === "individual" ? "Individual or sole proprietor" : "Company or other registered entity"}</p>}
            {!company && result?.legalStructure === "registered_entity" && <p><Link href="/dashboard/company-verification">Kenyan company verification</Link></p>}
            {result && !result.enabled && result.status !== "Approved" && <p>{title} is unavailable right now.</p>}
            {result?.needsStructure && <p>Declare your legal structure in <Link href="/dashboard/verification">owner identity verification</Link> first.</p>}
            {result?.individual && <p>Individual and sole-proprietor businesses complete <Link href="/dashboard/verification">owner identity verification</Link>.</p>}
            {result?.requiresOwner && <p>Complete <Link href="/dashboard/verification">owner identity verification</Link> first.</p>}
            {result?.needsSupport && <p>Contact support to update your company verification.</p>}
            {result?.starting && <p role="status">Your company session is being prepared. Reload this page and contact support if the status persists.</p>}
            {ready && <p role="status">{company ? "Didit session" : "Status"} · {result.status ?? "Not started"}</p>}
            {canStart && (
              <>
                <p>{company
                  ? "For a company, have your Certificate of Incorporation and a current BRS official search (CR12) ready. Other registered entities need their registration evidence. Provide authorization if your role is unclear. Follow the secure submission instructions."
                  : "Didit collects and processes your ID and selfie for this check. BiasharaOS saves your verification reference and status."}</p>
                <p><Link href="/privacy">BiasharaOS privacy notice</Link> · <a href="https://didit.me/terms/privacy-policy">Didit privacy policy</a></p>
                <label><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I agree to continue to Didit for {company ? "company" : "identity"} verification.</label>
                <Button disabled={busy || !consent} onClick={() => void submit({ action: "start" })}>Start verification</Button>
              </>
            )}
            {result?.next && <Button href={result.next}>Continue on Didit</Button>}
            {ready && result.status && <Button variant="secondary" disabled={busy} onClick={() => void submit({ action: "refresh" })}>Refresh status</Button>}
            {result?.status === "Declined" && <p>Contact support to ask about the result or request another review.</p>}
            {!company && result?.merchantStatus === "company_verification_required" && <p>Your identity check passed. Complete the company and representative review to activate your shop and payments.</p>}
            {!company && result?.merchantStatus === "verified" && <p>Merchant verification passed. You can publish your shop and connect a settlement account.</p>}
            {company && result?.status === "Approved" && !result.kenyaRegistryPassed && <p>The Kenyan registry check needs support review.</p>}
            {result?.representativeReview === "Pending" && <p>The Kenyan registry check passed. A reviewer will check your authority to represent the company.</p>}
            {result?.representativeReview === "Approved" && <p>Company and representative verification passed.</p>}
            {result?.representativeReview === "Declined" && <p>The representative review was declined. Contact support to request a review.</p>}
            {!result && !error && <p role="status">Checking verification…</p>}
            {error && <p role="alert">{error}</p>}
          </>
        )}
      </section>
    </>
  );
}
