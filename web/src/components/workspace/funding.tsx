"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, Plus, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Modal,
  PageHeading,
  SelectField,
  StatCard,
} from "@/components/ui";
import { useDemo } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { money } from "@/lib/data";
import { minor } from "@/lib/operations";
import {
  compareFundingTerms,
  emptyFundingDraft,
  fundingPurposes,
  fundingStatus,
  type FundingApplication,
  type FundingDraft,
  type FundingWorkspace,
} from "@/lib/funding";

type Save = {
  businessId: string;
  id: string;
  revision: number;
  requestId: string;
  action: "save" | "submit" | "withdraw";
  payload: FundingDraft;
};
async function fundingApi(businessId: string, body?: Save) {
  const {
    data: { session },
  } = await supabase().auth.getSession();
  if (!session) throw new Error("Sign in to access funding requests.");
  const response = await fetch("/api/funding?businessId=" + businessId, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + session.access_token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(result.error || "Could not confirm this funding request."),
      { status: response.status },
    );
  return result;
}

export function FundingPageContent() {
  const { state, store } = useDemo();
  if (store.workspace?.role !== "Owner")
    return (
      <>
        <PageHeading
          title="Business funding"
          description="Funding requests and financial plans are private to the business owner."
        />
        <EmptyState
          icon={ShieldCheck}
          title="Owner access required"
          description="Ask your business owner to prepare or review funding requests."
        />
      </>
    );
  return (
    <OwnerFunding
      key={store.workspace.businessId}
      businessId={store.workspace.businessId}
      email={state.profile.email}
      phone={state.profile.phone}
    />
  );
}
function OwnerFunding({
  businessId,
  email,
  phone,
}: {
  businessId: string;
  email: string;
  phone: string;
}) {
  const [workspace, setWorkspace] = useState<FundingWorkspace | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [pending, setPending] = useState<Save | null>(null);
  const pendingKey = useRef("");
  const [editor, setEditor] = useState<{
    id: string;
    revision: number;
    payload: FundingDraft;
  } | null>(null);
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<FundingApplication | null>(null);
  const [withdraw, setWithdraw] = useState<FundingApplication | null>(null);
  const [notice, setNotice] = useState("");
  const [conflictId, setConflictId] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError("");
    try {
      const {
        data: { session },
      } = await supabase().auth.getSession();
      if (!session) throw new Error("Sign in to access funding requests.");
      pendingKey.current = `biashara.funding.pending.${session.user.id}.${businessId}`;
      const saved = sessionStorage.getItem(pendingKey.current);
      if (saved) {
        const parsed = JSON.parse(saved) as Save;
        if (
          parsed.businessId !== businessId ||
          !parsed.requestId ||
          !parsed.payload
        )
          throw new Error(
            "A saved funding request could not be restored. Contact support before submitting it again.",
          );
        setPending(parsed);
      }
      const result: FundingWorkspace = await fundingApi(businessId);
      setWorkspace(result);
      return result;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load funding requests.",
      );
      return null;
    }
  }, [businessId]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  async function save(request: Save) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (pending && request.requestId !== pending.requestId)
        throw new Error(
          "Retry the unconfirmed funding request before making another change.",
        );
      if (!pendingKey.current)
        throw new Error("Refresh funding requests before saving.");
      sessionStorage.setItem(pendingKey.current, JSON.stringify(request));
      setPending(request);
      const result = await fundingApi(businessId, request);
      setWorkspace((current) =>
        current
          ? {
              ...current,
              applications: [
                result.application,
                ...current.applications.filter(
                  (a) => a.id !== result.application.id,
                ),
              ],
            }
          : current,
      );
      sessionStorage.removeItem(pendingKey.current);
      setPending(null);
      setEditor(null);
      setWithdraw(null);
      setDetails(null);
      setConflictId(null);
      setNotice(
        request.action === "submit"
          ? "Your funding request is recorded. A lending provider is not connected; no credit check or lender submission has taken place."
          : request.action === "withdraw"
            ? "Funding request withdrawn."
            : "Funding draft saved to your business account.",
      );
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status && status < 500) {
        sessionStorage.removeItem(pendingKey.current);
        setPending(null);
        if (status === 409) {
          const latest = await load();
          const saved = latest?.applications.find((a) => a.id === request.id);
          if (
            saved &&
            (saved.revision !== request.revision || saved.status !== "draft")
          )
            setConflictId(request.id);
        }
      }
      setError(
        e instanceof Error
          ? e.message
          : "Save unconfirmed. Retry the saved request safely.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  const makeRequest = (action: Save["action"], application = editor) =>
    application && {
      businessId,
      id: application.id,
      revision: application.revision,
      requestId: crypto.randomUUID(),
      action,
      payload: application.payload,
    };
  const change = (name: keyof FundingDraft, value: string | boolean) =>
    setEditor((current) =>
      current
        ? { ...current, payload: { ...current.payload, [name]: value } }
        : current,
    );
  const draft = editor?.payload;
  const disabled = busy || !!pending;
  const status = (
    <>
      {error && (
        <p role="alert" className="operation-error">
          {error}
        </p>
      )}
      {busy && <p role="status">Saving funding request…</p>}
      {conflictId && !busy && (
        <div className="inline-note">
          <p>
            A saved version changed. Your unsaved fields are still here. Load
            the latest version before saving again.
          </p>
          <Button
            variant="secondary"
            onClick={async () => {
              setBusy(true);
              try {
                const latest = await load();
                const saved = latest?.applications.find(
                  (a) => a.id === conflictId,
                );
                if (!saved) {
                  if (latest)
                    setError(
                      "The saved request is unavailable. Your unsaved fields have been kept.",
                    );
                  return;
                }
                setWithdraw(null);
                if (saved.status === "draft") {
                  setEditor({
                    id: saved.id,
                    revision: saved.revision,
                    payload: saved.payload,
                  });
                  setStep(0);
                  setNotice(
                    "Latest saved draft loaded. Review its details before saving.",
                  );
                } else {
                  setEditor(null);
                  setDetails(saved);
                }
                setConflictId(null);
              } finally {
                setBusy(false);
              }
            }}
          >
            Load latest saved version
          </Button>
        </div>
      )}
      {pending && !busy && (
        <div className="inline-note">
          <p>
            A funding save is unconfirmed. Retry its original request safely.
          </p>
          <Button onClick={() => void save(pending)}>
            Retry funding request
          </Button>
        </div>
      )}
    </>
  );
  return (
    <>
      <PageHeading
        eyebrow="PLAN YOUR NEXT CHAPTER"
        title="Business funding"
        description="Prepare your financial picture, compare terms and keep your funding requests together."
      >
        <Button
          variant="secondary"
          icon={RefreshCw}
          disabled={busy}
          onClick={() => void load()}
        >
          Refresh
        </Button>
        <Button
          icon={Plus}
          disabled={disabled || !workspace}
          onClick={() => {
            setEditor({
              id: crypto.randomUUID(),
              revision: 0,
              payload: emptyFundingDraft(email, phone),
            });
            setStep(0);
            setError("");
            setConflictId(null);
          }}
        >
          New funding request
        </Button>
      </PageHeading>
      <section className="panel funding-availability">
        <Badge>Kenya · launch market</Badge>
        <p>
          Funding preparation is available in Kenya (KES). Lending-provider
          connection is pending. Requests are stored with BiasharaOS; no loan
          offer, approval, credit check or disbursement is created.
        </p>
        <p className="quiet-note">
          Other African markets — including Uganda, Tanzania, Rwanda, Ghana,
          Nigeria and South Africa — coming soon.
        </p>
      </section>
      {status}
      {notice && (
        <p role="status" className="inline-note">
          {notice}
        </p>
      )}
      {workspace && (
        <>
          <div className="stats-grid three-stats">
            <StatCard
              label="Net sales · last 30 days"
              value={`KES ${money(workspace.readiness.sales30)}`}
              icon={Wallet}
            />
            <StatCard
              label="Operating profit · last 30 days"
              value={`KES ${money(workspace.readiness.profit30)}`}
              icon={Wallet}
            />
            <StatCard
              label="Recorded receipts · last 30 days"
              value={String(workspace.readiness.receipts30)}
              icon={FileText}
            />
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Your funding readiness</h2>
                <p>
                  These business-wide checks describe record completeness. They
                  do not assess creditworthiness or guarantee finance.
                </p>
              </div>
              <Badge
                tone={
                  workspace.verificationStatus === "submitted"
                    ? "green"
                    : "amber"
                }
              >
                {workspace.verificationStatus === "submitted"
                  ? "Business readiness submitted"
                  : "Business readiness needed"}
              </Badge>
            </div>
            <ul>
              <li>
                {workspace.readiness.receipts30
                  ? "Recent sales records available"
                  : "Record sales to build a trading history"}
              </li>
              <li>
                {workspace.readiness.products
                  ? "Product catalogue available"
                  : "Add products and keep stock records current"}
              </li>
              <li>
                Expenses recorded over 30 days: KES{" "}
                {money(workspace.readiness.expenses30)}
              </li>
              <li>
                Identity verification and lending assessment: provider setup
                pending
              </li>
            </ul>
            <Button href="/dashboard/verification" variant="secondary">
              Review business verification readiness
            </Button>
            <Button href="/dashboard/reports" variant="ghost">
              Review business reports
            </Button>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>Your requests and drafts</h2>
              <span className="muted">Latest 100 records · owner only</span>
            </div>
            {workspace.applications.length ? (
              <div className="funding-list">
                {workspace.applications.map((application) => (
                  <article key={application.id} className="funding-list-item">
                    <div>
                      <strong>
                        {application.payload.amount
                          ? `KES ${money(Number(application.payload.amount))}`
                          : "Amount not entered"}{" "}
                        · {application.payload.purpose}
                      </strong>
                      <p>
                        {fundingStatus(application.status)} ·{" "}
                        {new Date(application.updated_at).toLocaleDateString(
                          "en-KE",
                          { timeZone: "Africa/Nairobi" },
                        )}
                      </p>
                      <small>Reference {application.id.slice(0, 8)}</small>
                    </div>
                    <div className="button-row">
                      <Button
                        variant="secondary"
                        disabled={disabled}
                        onClick={() => {
                          setConflictId(null);
                          if (application.status === "draft") {
                            setEditor({
                              id: application.id,
                              revision: application.revision,
                              payload: application.payload,
                            });
                            setStep(0);
                          } else setDetails(application);
                        }}
                      >
                        {application.status === "draft"
                          ? "Continue draft"
                          : "View request"}
                      </Button>
                      {application.status !== "withdrawn" && (
                        <Button
                          variant="ghost"
                          disabled={disabled}
                          onClick={() => {
                            setConflictId(null);
                            setWithdraw(application);
                          }}
                        >
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="Start with a clear plan"
                description="Create a funding draft, save it to your account and return when your business information is ready."
              />
            )}
          </section>
        </>
      )}
      <FundingCalculator />
      <section className="panel">
        <h2>Before you borrow</h2>
        <p>
          Compare total repayment, fees, repayment dates, late charges,
          collateral and early-settlement terms directly with a licensed
          provider. Borrowing is optional. Confirm a repayment plan against your
          real cash flow.
        </p>
        <Link href="/help">Get help</Link> ·{" "}
        <Link href="/privacy">Privacy policy</Link> ·{" "}
        <Link href="/terms">Terms</Link>
      </section>
      <Modal
        open={!!editor}
        onClose={() => {
          if (!busy) {
            setEditor(null);
            setConflictId(null);
          }
        }}
        title="Prepare your funding request"
        description={`Step ${step + 1} of 4 · ${["Funding needs", "Business finances", "Contact details", "Review and consent"][step]}`}
        wide
      >
        {draft && (
          <>
            <fieldset className="sheet-fields" disabled={disabled}>
              {step === 0 && (
                <div className="form-grid">
                  <Field
                    label="Requested amount (KES)"
                    type="number"
                    min="0.01"
                    max="10000000"
                    step="0.01"
                    value={draft.amount}
                    onChange={(e) => change("amount", e.target.value)}
                  />
                  <SelectField
                    label="What would you use it for?"
                    value={draft.purpose}
                    onChange={(v) => change("purpose", v)}
                  >
                    {fundingPurposes.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </SelectField>
                  <Field
                    label="Requested repayment months"
                    type="number"
                    min="1"
                    max="36"
                    value={draft.months}
                    onChange={(e) => change("months", e.target.value)}
                  />
                  <p className="quiet-note">
                    Requested terms express your needs. A provider has not
                    offered these terms.
                  </p>
                </div>
              )}
              {step === 1 && (
                <>
                  <div className="form-grid">
                    <Field
                      label="Typical monthly revenue (KES)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.monthlyRevenue}
                      onChange={(e) => change("monthlyRevenue", e.target.value)}
                    />
                    <Field
                      label="Typical monthly business costs (KES)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.monthlyCosts}
                      onChange={(e) => change("monthlyCosts", e.target.value)}
                    />
                    <Field
                      label="Existing monthly debt payments (KES)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.monthlyDebtPayments}
                      onChange={(e) =>
                        change("monthlyDebtPayments", e.target.value)
                      }
                    />
                    <Field
                      label="Years trading"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={draft.tradingYears}
                      onChange={(e) => change("tradingYears", e.target.value)}
                    />
                    <Field
                      label="Business registration number (optional)"
                      value={draft.registrationNumber}
                      onChange={(e) =>
                        change("registrationNumber", e.target.value)
                      }
                    />
                  </div>
                  <label className="field">
                    How would the funding help, and how would you repay it?
                    <textarea
                      className="input"
                      rows={4}
                      maxLength={2000}
                      value={draft.plan}
                      onChange={(e) => change("plan", e.target.value)}
                    />
                  </label>
                </>
              )}
              {step === 2 && (
                <div className="form-grid">
                  <Field
                    label="Contact email"
                    type="email"
                    value={draft.contactEmail}
                    onChange={(e) => change("contactEmail", e.target.value)}
                  />
                  <Field
                    label="Contact phone"
                    type="tel"
                    value={draft.contactPhone}
                    onChange={(e) => change("contactPhone", e.target.value)}
                  />
                  <p className="quiet-note">
                    Do not enter bank passwords, payment PINs or government
                    identity numbers in this request.
                  </p>
                </div>
              )}
              {step === 3 && (
                <>
                  <dl className="detail-list">
                    <div>
                      <dt>Market</dt>
                      <dd>Kenya · KES</dd>
                    </div>
                    <div>
                      <dt>Amount and purpose</dt>
                      <dd>
                        {draft.amount || "Not entered"} · {draft.purpose}
                      </dd>
                    </div>
                    <div>
                      <dt>Requested period</dt>
                      <dd>{draft.months} months</dd>
                    </div>
                    <div>
                      <dt>Contact</dt>
                      <dd>
                        {draft.contactEmail} · {draft.contactPhone}
                      </dd>
                    </div>
                  </dl>
                  <p>
                    {draft.plan ||
                      "Add a business plan before recording the request."}
                  </p>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={draft.consent}
                      onChange={(e) => change("consent", e.target.checked)}
                    />
                    I confirm these figures are accurate and consent to storing
                    this funding request with BiasharaOS. No data is sent to a
                    lender.
                  </label>
                  <p>
                    Read the <Link href="/privacy">privacy policy</Link> and{" "}
                    <Link href="/terms">terms</Link>. Provider verification,
                    decisions, offers and payments remain unavailable.
                  </p>
                  {workspace?.verificationStatus !== "submitted" && (
                    <p className="operation-error">
                      Submit your business verification readiness before
                      recording this request. You can save a draft now.
                    </p>
                  )}
                </>
              )}
            </fieldset>
            {status}
            <div className="modal-actions">
              <Button
                variant="secondary"
                disabled={disabled}
                onClick={() => {
                  const request = makeRequest("save");
                  if (request) void save(request);
                }}
              >
                Save draft
              </Button>
              {step > 0 && (
                <Button
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button disabled={disabled} onClick={() => setStep(step + 1)}>
                  Continue
                </Button>
              ) : (
                <Button
                  disabled={
                    disabled ||
                    !draft.consent ||
                    workspace?.verificationStatus !== "submitted"
                  }
                  onClick={() => {
                    const request = makeRequest("submit");
                    if (request) void save(request);
                  }}
                >
                  Record funding request
                </Button>
              )}
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={!!details}
        onClose={() => setDetails(null)}
        title="Funding request details"
      >
        <p>{details && fundingStatus(details.status)}</p>
        <p>
          {details?.payload.amount} KES · {details?.payload.purpose} ·{" "}
          {details?.payload.months} requested months
        </p>
        <p>{details?.payload.plan}</p>
        <p>
          This request has not been sent to a lender. No offer or eligibility
          decision has been made.
        </p>
        <h3>Activity</h3>
        <ul>
          {details?.history.map((event, i) => (
            <li key={i}>
              {event.action === "save"
                ? "Draft saved"
                : event.action === "submit"
                  ? "Request recorded · provider pending"
                  : "Request withdrawn"}{" "}
              ·{" "}
              {new Date(event.at).toLocaleString("en-KE", {
                timeZone: "Africa/Nairobi",
              })}
            </li>
          ))}
        </ul>
      </Modal>
      <Modal
        open={!!withdraw}
        onClose={() => {
          if (!busy) setWithdraw(null);
        }}
        title="Withdraw this funding request?"
        description="The request remains in your private history and cannot be edited after withdrawal."
      >
        {status}
        <div className="modal-actions">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setWithdraw(null)}
          >
            Keep request
          </Button>
          <Button
            variant="danger"
            disabled={disabled}
            onClick={() => {
              const request = makeRequest("withdraw", withdraw);
              if (request) void save(request);
            }}
          >
            Withdraw request
          </Button>
        </div>
      </Modal>
    </>
  );
}
function FundingCalculator() {
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState("6");
  const [rate, setRate] = useState("");
  const [fees, setFees] = useState("0");
  let result: ReturnType<typeof compareFundingTerms> | null = null;
  let error = "";
  if (amount && months && rate !== "")
    try {
      result = compareFundingTerms(
        minor(amount),
        Number(months),
        Number(rate),
        minor(fees),
      );
    } catch (e) {
      error = e instanceof Error ? e.message : "Check the terms.";
    }
  return (
    <section className="panel">
      <h2>Compare a provider’s quoted terms</h2>
      <p>
        Enter terms you received directly. This estimate assumes equal monthly
        repayments on a reducing balance, with fees paid separately. It is not a
        loan offer; a provider’s repayment schedule may differ.
      </p>
      <div className="form-grid">
        <Field
          label="Comparison amount (KES)"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Field
          label="Comparison months"
          type="number"
          min="1"
          max="120"
          value={months}
          onChange={(e) => setMonths(e.target.value)}
        />
        <Field
          label="Quoted annual interest (%)"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <Field
          label="Total quoted fees (KES)"
          type="number"
          min="0"
          step="0.01"
          value={fees}
          onChange={(e) => setFees(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="operation-error">
          {error}
        </p>
      )}
      {result && (
        <div className="inline-note" role="status">
          <p>
            Estimated monthly repayment: KES {money(result.monthly / 100)} ·
            Total including fees: KES {money(result.total / 100)} · Finance
            cost: KES {money(result.cost / 100)}
          </p>
        </div>
      )}
    </section>
  );
}
