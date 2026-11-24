"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, PageHeading, SelectField } from "@/components/ui";
import { useDemo } from "@/lib/store";
import { supabase } from "@/lib/supabase";

type Settlement = {
  status: "unavailable" | "verification_required" | "unconnected" | "pending" | "connected";
  verification?: "business_type_required" | "owner_identity_required" | "company_verification_required";
  banks?: { code: string; name: string }[];
  bankName?: string;
  lastFour?: string;
};
async function settlementRequest(input?: { bankCode: string; accountNumber: string }, signal?: AbortSignal): Promise<Settlement> {
  const { data: { session } } = await supabase().auth.getSession();
  if (!session) throw new Error("Sign in to continue.");
  const response = await fetch("/api/payments/settlement", {
    method: input ? "POST" : "GET",
    headers: { Authorization: `Bearer ${session.access_token}`, ...(input ? { "Content-Type": "application/json" } : {}) },
    body: input ? JSON.stringify(input) : undefined, signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not check settlement setup.");
  return result;
}

export function PaymentSettingsPage() {
  const { store } = useDemo();
  const owner = store.workspace?.role === "Owner";
  const businessId = store.workspace?.businessId;
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!owner) return;
    const controller = new AbortController();
    settlementRequest(undefined, controller.signal).then(setSettlement).catch((failure: Error) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [businessId, owner]);

  async function update(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const form = event?.currentTarget;
    const fields = form && new FormData(form);
    const input = fields ? { bankCode: String(fields.get("bank") ?? ""), accountNumber: String(fields.get("account") ?? "").trim() } : undefined;
    form?.reset();
    setError("");
    setBusy(true);
    try { setSettlement(await settlementRequest(input)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not check settlement setup."); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHeading title="Online payments" description="Connect a Kenyan bank account to receive settlement from card and M-Pesa payments.">
        {owner && <Button href="/dashboard/payment-activity" variant="secondary">Payment activity</Button>}
      </PageHeading>
      <section className="panel settings-panel">
        {!owner && <p>Ask the business owner to manage settlement.</p>}
        {owner && !settlement && !error && <p role="status">Checking settlement setup…</p>}
        {settlement?.status === "unavailable" && <p>Online payment setup is unavailable.</p>}
        {settlement?.status === "verification_required" && (
          <p>Complete <Link href={settlement.verification === "company_verification_required" ? "/dashboard/company-verification" : "/dashboard/verification"}>merchant verification</Link> to connect a settlement account.</p>
        )}
        {settlement?.status === "unconnected" && (
          <form onSubmit={update}>
            <SelectField name="bank" label="Settlement bank" required>
              <option value="">Choose your bank</option>
              {settlement.banks?.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
            </SelectField>
            <Field name="account" label="Bank account number" type="password" inputMode="numeric" autoComplete="off" required pattern="[0-9]{6,24}" maxLength={24} />
            <p>Paystack receives these details for verification and settlement. BiasharaOS saves the bank name and last four digits.</p>
            <Button type="submit" disabled={busy || !settlement.banks?.length}>Connect bank account</Button>
          </form>
        )}
        {settlement?.bankName && <p>{settlement.bankName} · ending {settlement.lastFour}</p>}
        {settlement?.status === "pending" && <p role="status">Paystack must verify the account before customers can pay online.</p>}
        {settlement?.status === "connected" && <p role="status">Settlement account verified. Customers can pay delivered orders by card or M-Pesa.</p>}
        {owner && <Button variant="secondary" disabled={busy} onClick={() => void update()}>Check settlement status</Button>}
        {error && <p role="alert">{error}</p>}
      </section>
    </>
  );
}
