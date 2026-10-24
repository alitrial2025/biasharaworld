"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldCheck, Store } from "lucide-react";
import { Brand, Button, Field, SelectField, Badge, Modal } from "./ui";
import { useDemo } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { industries, resolveIndustry } from "@/lib/industries";
import {
  africanMarkets,
  emptyVerification,
  verificationMissing,
  verificationProfile,
  type VerificationProfile,
  type VerificationRecord,
} from "@/lib/verification";

const steps = [
  "Your business",
  "Owner contact",
  "Everyday operations",
  "Registration & KYC",
  "Review & declaration",
  "Ready for business",
];
export function BusinessOnboarding({ manage = false }: { manage?: boolean }) {
  const { state, store } = useDemo();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(() => emptyVerification());
  const [status, setStatus] = useState<VerificationRecord["status"] | null>(
    null,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false),
    [loaded, setLoaded] = useState(false);
  const draftKey = useRef("");
  const writing = useRef(false);
  async function request(method = "GET", body?: unknown) {
    const targetBusiness =
      (body as { businessId?: string } | undefined)?.businessId ||
      store.workspace?.businessId;
    const {
      data: { session },
    } = await supabase().auth.getSession();
    if (!session) throw new Error("Sign in to save your onboarding details.");
    const result = await fetch(
      "/api/verification?businessId=" + targetBusiness,
      {
        method,
        headers: {
          Authorization: "Bearer " + session.access_token,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      },
    );
    const data = await result.json();
    if (!result.ok)
      throw new Error(data.error || "Could not save verification readiness.");
    return data;
  }
  useEffect(() => {
    if (!store.ready || writing.current) return;
    let active = true;
    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase().auth.getSession();
        if (!active) return;
        if (!session) {
          setLoaded(true);
          return;
        }
        draftKey.current = `biashara.onboarding.${session.user.id}.${store.workspace?.businessId || "new"}`;
        let initial = emptyVerification({
          legalName: state.profile.business,
          tradingName: state.profile.business,
          contactName:
            state.profile.name || session.user.user_metadata?.name || "",
          email: session.user.email || "",
          phone: state.profile.phone,
          businessAddress: state.profile.location,
          businessType: resolveIndustry(state.profile.type).label,
        });
        let nextStep = 0;
        let hasLocalDraft = false;
        const local = sessionStorage.getItem(draftKey.current);
        if (local) {
          try {
            const saved = JSON.parse(local);
            const parsed = verificationProfile.safeParse(saved.profile);
            if (parsed.success) {
              initial = parsed.data;
              nextStep = Math.min(4, Math.max(0, Number(saved.step) || 0));
              hasLocalDraft = true;
            }
          } catch {
            setNotice(
              "The browser draft could not be read. Your confirmed business details will be loaded.",
            );
          }
        }
        if (store.workspace?.role === "Owner") {
          const data = await request();
          if (data.verification) {
            if (!hasLocalDraft) initial = data.verification.profile;
            if (active) setStatus(data.verification.status);
          }
        }
        if (active) {
          setProfile(initial);
          setStep(nextStep);
          setLoaded(true);
        }
      } catch (e) {
        if (active) {
          setError(
            e instanceof Error ? e.message : "Could not load your draft.",
          );
          setLoaded(true);
        }
      }
    })();
    return () => {
      active = false;
    };
    // Load only when the account workspace changes, not on every profile snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.ready, store.workspace?.businessId]);
  function update<K extends keyof VerificationProfile>(
    key: K,
    value: VerificationProfile[K],
  ) {
    setProfile((p) => ({ ...p, [key]: value }));
    setNotice("");
  }
  function rememberDraft(nextStep = step) {
    if (!draftKey.current) return;
    sessionStorage.setItem(
      draftKey.current,
      JSON.stringify({ profile, step: nextStep }),
    );
  }
  function move(next: number) {
    try {
      rememberDraft(next);
      setStep(next);
      setError("");
    } catch {
      setError(
        "Browser storage is unavailable. You can continue, but keep this tab open until you save.",
      );
      setStep(next);
    }
  }
  async function save(submit: boolean) {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const parsed = verificationProfile.parse(profile);
      if (submit) {
        const missing = verificationMissing(parsed);
        if (missing.length)
          throw new Error("Complete: " + missing.join(", ") + ".");
      }
      rememberDraft();
      if (!store.workspace) {
        if (!submit) {
          setNotice(
            "Draft saved in this browser for your signed-in account. Complete setup to save it to your business.",
          );
          return;
        }
        await store.createBusiness({
          name: profile.contactName,
          business: profile.tradingName,
          location: profile.businessAddress,
          type: profile.businessType,
        });
        // A confirmed business can outlive a failed readiness save. Keep its
        // detailed draft under the business key so a reload can resume it.
        const previousKey = draftKey.current;
        if (previousKey.endsWith(".new")) {
          draftKey.current =
            previousKey.slice(0, -3) + store.workspace!.businessId;
          rememberDraft();
          sessionStorage.removeItem(previousKey);
        }
      }
      const data = await request("PUT", {
        businessId: store.workspace!.businessId,
        profile: parsed,
        submit,
      });
      setStatus(data.verification.status);
      setNotice(data.message);
      await store.hydrate();
      if (submit) {
        sessionStorage.removeItem(draftKey.current);
        setStep(5);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save your setup. Retry safely.",
      );
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  async function skipVerification() {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    setError("");
    try {
      if (!store.workspace) {
        if (
          !profile.tradingName.trim() ||
          !profile.contactName.trim() ||
          !profile.businessAddress.trim()
        ) {
          throw new Error(
            "Enter your business name, owner contact name and location before creating your workspace.",
          );
        }
        const previousKey = draftKey.current;
        await store.createBusiness({
          name: profile.contactName,
          business: profile.tradingName,
          location: profile.businessAddress,
          type: resolveIndustry(profile.businessType).label,
        });
        if (previousKey.endsWith(".new")) {
          draftKey.current =
            previousKey.slice(0, -3) + store.workspace!.businessId;
          rememberDraft();
          sessionStorage.removeItem(previousKey);
        }
      } else rememberDraft();
      router.push("/dashboard");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not open your workspace.",
      );
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  const working = busy || store.busy;
  if (!store.ready || !loaded)
    return (
      <main id="main-content" className="container section">
        <p role="status">Opening your setup…</p>
      </main>
    );
  if (!store.authenticated)
    return (
      <main id="main-content" className="container section">
        <Brand />
        <h1>Your business starts with a good plan.</h1>
        <p>
          We will guide you through your business, contact details, stock and
          sales tools, and verification readiness. Kenya is our launch market;
          expansion across Africa is coming soon.
        </p>
        <p>
          Government IDs and banking passwords are not needed to get started.
        </p>
        <div className="button-row">
          <Button href="/signup">Create your account</Button>
          <Button variant="secondary" href="/login">
            I already have an account
          </Button>
        </div>
        <p>
          <Link href="/privacy">Privacy</Link> ·{" "}
          <Link href="/terms">Terms</Link> · <Link href="/help">Help</Link>
        </p>
      </main>
    );
  if (store.workspace && store.workspace.role !== "Owner")
    return (
      <main id="main-content" className="container section">
        <h1>Business verification</h1>
        <p>
          Only the business owner can view or change private verification
          details.
        </p>
        <Button href="/dashboard">Return to workspace</Button>
      </main>
    );
  return (
    <main id="main-content" className="onboarding-page">
      <div className="container onboarding-top">
        <Brand />
        <Link href="/help">Need help?</Link>
      </div>
      <div className="onboarding-layout">
        <aside>
          <span className="eyebrow">A CLEAR START</span>
          <h2>Build your business profile, one step at a time.</h2>
          <ol>
            {steps.map((label, index) => (
              <li key={label} className={index <= step ? "current" : ""}>
                <span>{index < step ? "✓" : index + 1}</span>
                <strong>{label}</strong>
              </li>
            ))}
          </ol>
          <p>
            You can skip verification details and return later. Working tools
            stay locked until readiness is complete. Saving readiness never
            means your identity or funding has been approved.
          </p>
        </aside>
        <section className="onboarding-card">
          <span className="step-count">
            STEP {step + 1} OF {steps.length}
          </span>
          {status && (
            <Badge tone={status === "submitted" ? "amber" : "gray"}>
              {status === "submitted"
                ? "Readiness recorded · verification pending setup"
                : "Draft saved"}
            </Badge>
          )}
          {error && (
            <p role="alert" className="operation-error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="inline-note">
              {notice}
            </p>
          )}
          {step < 5 ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (step === 4) void save(true);
                else move(step + 1);
              }}
            >
              <fieldset className="sheet-fields" disabled={working}>
                <h1>{steps[step]}</h1>
                {step === 0 && (
                  <>
                    <Store />
                    <p>
                      Use the name customers know, and the legal name of your
                      business or its owner.
                    </p>
                    <Field
                      label="Business or trading name"
                      value={profile.tradingName}
                      onChange={(e) => update("tradingName", e.target.value)}
                      required
                      maxLength={200}
                    />
                    <Field
                      label="Legal business or owner name"
                      value={profile.legalName}
                      onChange={(e) => update("legalName", e.target.value)}
                      required
                      maxLength={200}
                    />
                    <SelectField
                      label="Business type"
                      value={resolveIndustry(profile.businessType).label}
                      onChange={(v) => update("businessType", v)}
                    >
                      {industries.map((industry) => (
                        <option key={industry.id} value={industry.label}>
                          {industry.label}
                        </option>
                      ))}
                    </SelectField>
                    <Field
                      label="Business address or trading location"
                      value={profile.businessAddress}
                      onChange={(e) =>
                        update("businessAddress", e.target.value)
                      }
                      required
                      maxLength={400}
                    />
                    <SelectField label="Country" value="KE" onChange={() => {}}>
                      <option value="KE">Kenya · launch market · KES</option>
                      {africanMarkets.map((country) => (
                        <option key={country} value={country} disabled>
                          {country} · Coming soon
                        </option>
                      ))}
                    </SelectField>
                    <p className="quiet-note">
                      Kenya launches first. Other African countries are coming
                      soon; account services and funding are not available there
                      yet.
                    </p>
                  </>
                )}
                {step === 1 && (
                  <>
                    <p>
                      Provide an owner contact who can confirm business details.
                      Your email account must already be confirmed.
                    </p>
                    <Field
                      label="Owner contact name"
                      value={profile.contactName}
                      onChange={(e) => update("contactName", e.target.value)}
                      required
                      maxLength={200}
                    />
                    <Field
                      label="Contact phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      required
                      maxLength={40}
                    />
                    <Field
                      label="Contact email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => update("email", e.target.value)}
                      required
                      maxLength={200}
                    />
                  </>
                )}
                {step === 2 && (
                  <>
                    <p>
                      These details help you prepare your workspace and future
                      business applications. Revenue bands are optional.
                    </p>
                    <div className="form-grid">
                      <Field
                        label="Years trading"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={profile.yearsTrading}
                        onChange={(e) =>
                          update("yearsTrading", Number(e.target.value))
                        }
                        required
                      />
                      <Field
                        label="People working in the business"
                        type="number"
                        min={1}
                        max={100000}
                        step={1}
                        value={profile.employees}
                        onChange={(e) =>
                          update("employees", Number(e.target.value))
                        }
                        required
                      />
                    </div>
                    <SelectField
                      label="Typical monthly revenue (KES)"
                      value={profile.revenueBand}
                      onChange={(v) =>
                        update(
                          "revenueBand",
                          v as VerificationProfile["revenueBand"],
                        )
                      }
                    >
                      {[
                        ["prefer_not_to_say", "Prefer not to say"],
                        ["under_50000", "Below 50,000"],
                        ["50000_250000", "50,000–250,000"],
                        ["250000_1000000", "250,000–1,000,000"],
                        ["over_1000000", "Over 1,000,000"],
                      ].map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </SelectField>
                    <p>Choose your starting tools</p>
                    {[
                      "Sales",
                      "Stock",
                      "Customers",
                      "Suppliers",
                      "Reports",
                      "Funding",
                    ].map((tool) => (
                      <label key={tool} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={profile.tools.includes(
                            tool as VerificationProfile["tools"][number],
                          )}
                          onChange={(e) =>
                            update(
                              "tools",
                              e.target.checked
                                ? [
                                    ...profile.tools,
                                    tool as VerificationProfile["tools"][number],
                                  ]
                                : profile.tools.filter((t) => t !== tool),
                            )
                          }
                        />
                        {tool}
                      </label>
                    ))}
                  </>
                )}
                {step === 3 && (
                  <>
                    <ShieldCheck />
                    <p>
                      Prepare your business verification details. An identity
                      verification provider is not connected yet. Do not upload
                      or email a national ID, passport, tax PIN, bank password
                      or biometric data.
                    </p>
                    <SelectField
                      label="Business registration status"
                      value={profile.registrationStatus}
                      onChange={(v) =>
                        update(
                          "registrationStatus",
                          v as VerificationProfile["registrationStatus"],
                        )
                      }
                    >
                      <option value="registered">Registered business</option>
                      <option value="unregistered">
                        Not registered / sole trader
                      </option>
                      <option value="in_progress">
                        Registration in progress
                      </option>
                    </SelectField>
                    {profile.registrationStatus === "registered" && (
                      <Field
                        label="Business registration number"
                        value={profile.registrationNumber}
                        onChange={(e) =>
                          update("registrationNumber", e.target.value)
                        }
                        required
                        maxLength={100}
                        hint="Use a business registration reference, not a national ID or tax PIN."
                      />
                    )}
                    <p className="inline-note">
                      Complete the required business details to unlock your
                      working tools. Identity verification and lender services
                      will be connected later; no KYC result or funding
                      eligibility is implied.
                    </p>
                  </>
                )}
                {step === 4 && (
                  <>
                    <h2>{profile.tradingName}</h2>
                    <dl className="detail-list">
                      <div>
                        <dt>Legal name</dt>
                        <dd>{profile.legalName}</dd>
                      </div>
                      <div>
                        <dt>Owner contact</dt>
                        <dd>
                          {profile.contactName} · {profile.phone}
                        </dd>
                      </div>
                      <div>
                        <dt>Location</dt>
                        <dd>{profile.businessAddress}, Kenya</dd>
                      </div>
                      <div>
                        <dt>Tools</dt>
                        <dd>{profile.tools.join(", ") || "Choose later"}</dd>
                      </div>
                      <div>
                        <dt>Registration</dt>
                        <dd>
                          {profile.registrationStatus.replaceAll("_", " ")}
                        </dd>
                      </div>
                    </dl>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={profile.declaration}
                        onChange={(e) =>
                          update("declaration", e.target.checked)
                        }
                        required
                      />
                      I am authorised to provide these business details and
                      confirm they are accurate to the best of my knowledge.
                    </label>
                    <p>
                      Read our <Link href="/privacy">Privacy policy</Link>,{" "}
                      <Link href="/cookies">Cookie policy</Link> and{" "}
                      <Link href="/terms">Terms</Link>. Only the business owner
                      can access this readiness profile. You can edit or clear
                      it later.
                    </p>
                    <p className="quiet-note">
                      Recording readiness is not verification, a loan
                      application sent to a lender, or an approval.
                    </p>
                  </>
                )}
                <div className="modal-actions">
                  {step > 0 && (
                    <Button variant="secondary" onClick={() => move(step - 1)}>
                      Back
                    </Button>
                  )}
                  <Button type="submit">
                    {working
                      ? "Saving…"
                      : step === 4
                        ? manage
                          ? "Record readiness"
                          : "Finish setup"
                        : "Continue"}
                  </Button>
                </div>
              </fieldset>
            </form>
          ) : (
            <>
              <CheckCircle2 size={36} />
              <h1>Your workspace is ready.</h1>
              <p>
                Your business details and readiness profile are saved. Identity
                verification and lender services are pending setup. Start with
                your products, customers and recorded sales.
              </p>
              <Button onClick={() => router.push("/dashboard")}>
                Open workspace
              </Button>
              <Button href="/dashboard/financing" variant="secondary">
                Prepare a funding request
              </Button>
            </>
          )}
          {step < 5 && (
            <Button
              variant="secondary"
              disabled={working}
              onClick={() => void skipVerification()}
            >
              Verify later · open limited workspace
            </Button>
          )}
          {step < 5 && (
            <Button
              variant="ghost"
              disabled={working}
              onClick={() => void save(false)}
            >
              Save draft and continue later
            </Button>
          )}
          {manage && status && (
            <Button
              variant="ghost"
              disabled={working}
              onClick={() => setDeleteOpen(true)}
            >
              Clear private readiness details
            </Button>
          )}
          <p>
            <Link href="/help">Help</Link>
            {" · "}
            <Link href="/privacy">Privacy</Link>
            {manage && (
              <>
                {" "}
                · <Link href="/dashboard">Return to workspace</Link>
              </>
            )}
          </p>
        </section>
      </div>
      <Modal
        open={deleteOpen}
        onClose={() => {
          if (!working) setDeleteOpen(false);
        }}
        title="Clear verification readiness?"
        description="Your working tools will lock again. Existing business records and funding request history remain saved."
      >
        {error && (
          <p role="alert" className="operation-error">
            {error}
          </p>
        )}
        <Button
          variant="danger"
          disabled={working}
          onClick={async () => {
            setBusy(true);
            try {
              const data = await request("DELETE");
              await store.hydrate();
              setProfile(emptyVerification());
              setStatus(null);
              setStep(0);
              setNotice(data.message);
              setDeleteOpen(false);
              if (draftKey.current) sessionStorage.removeItem(draftKey.current);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not clear details.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Clear readiness details
        </Button>
        <Button
          variant="secondary"
          disabled={working}
          onClick={() => setDeleteOpen(false)}
        >
          Keep details
        </Button>
      </Modal>
    </main>
  );
}
