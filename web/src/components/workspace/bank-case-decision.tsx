"use client";

import { useState, type FormEvent } from "react";
import { Button, Field } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export function BankCaseDecision({
  busy,
  cancel,
  save,
}: {
  busy: boolean;
  cancel: () => void;
  save: (reason: string) => Promise<void>;
}) {
  const [factor, setFactor] = useState<{ id: string; setupKey?: string }>();
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function begin() {
    setWorking(true);
    setError("");
    try {
      const mfa = supabase().auth.mfa;
      const listed = await mfa.listFactors();
      if (listed.error) throw listed.error;
      const existing = listed.data.totp[0];
      if (existing) {
        setFactor({ id: existing.id });
        return;
      }
      const enrolled = await mfa.enroll({
        factorType: "totp",
        issuer: "BiasharaOS",
      });
      if (enrolled.error) throw enrolled.error;
      setFactor({ id: enrolled.data.id, setupKey: enrolled.data.totp.secret });
    } catch {
      setError(
        "Could not start authenticator verification. Try again or contact your administrator.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factor || !/^\d{6}$/.test(code) || working || busy) return;
    const reason = String(
      new FormData(event.currentTarget).get("reference"),
    ).trim();
    if (!reason) return;
    setWorking(true);
    setError("");
    try {
      const verified = await supabase().auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code,
      });
      if (verified.error) {
        setError(
          "Verification failed. Enter the current code from your authenticator app.",
        );
        return;
      }
      setFactor({ id: factor.id });
      await save(reason);
    } catch {
      setError("Could not complete authenticator verification. Try again.");
    } finally {
      setCode("");
      setWorking(false);
    }
  }

  return (
    <form className="industry-form" onSubmit={confirm}>
      <Field
        label="Decision reason"
        name="reference"
        required
        maxLength={240}
      />
      {factor ? (
        <>
          {factor.setupKey && (
            <p>
              Add BiasharaOS to your authenticator app with this setup key. Keep
              it private.
              <br />
              <code className="authenticator-key">{factor.setupKey}</code>
            </p>
          )}
          <Field
            label="Authenticator code"
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
          />
        </>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => void begin()}
          disabled={working || busy}
        >
          Set up or check authenticator
        </Button>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="industry-actions">
        {factor && (
          <Button type="submit" disabled={working || busy || code.length !== 6}>
            Verify and confirm decision
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={cancel}
          disabled={working || busy}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
