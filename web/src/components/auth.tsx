"use client";
import { T, LocalButton, LocalInput } from "@/components/locale";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Brand, Button, Field, IconBox, useToast } from "@/components/ui";
import { useDemo } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { accountReturn } from "@/lib/account-return";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthPage({
  mode,
  plan = "Starter",
  returnTo,
}: {
  mode: "login" | "signup" | "forgot";
  plan?: string;
  returnTo?: string;
}) {
  const [show, setShow] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { store } = useDemo();
  const toast = useToast();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const client = supabase();
      const destination = accountReturn(returnTo);
      const callback =
        location.origin +
        "/auth/callback" +
        (destination ? "?next=" + encodeURIComponent(destination) : "");
      if (mode === "forgot") {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + "/auth/callback?intent=recovery",
        });
        if (error) throw error;
        setSuccess(true);
        return;
      }
      const password = String(data.get("password") || "");
      if (mode === "signup") {
        const { data: result, error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: callback,
            data: {
              name: String(data.get("name") || "").trim(),
              business: String(data.get("business") || "").trim(),
            },
          },
        });
        if (error) throw error;
        if (!result.session) {
          setNotice(
            "Check your email to confirm your account, then sign in. If you already have an account, use Log in.",
          );
          return;
        }
        store.session(result.user?.id || "");
        await store.hydrate();
        router.push(destination || "/onboarding");
      } else {
        const { data: result, error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        store.session(result.user.id);
        await store.hydrate();
        toast("Welcome back.");
        router.push(
          destination || (store.workspace ? "/dashboard" : "/onboarding"),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main-content" className="auth-page">
      <aside className="auth-visual">
        <Image
          src="/images/shop.webp"
          alt="Shopkeeper looking at her phone in a Kenyan grocery store"
          fill
          priority
          sizes="(max-width: 767px) 100vw, 50vw"
        />
        <div className="auth-scrim" />
        <Brand light />
        <div className="auth-story">
          <span className="auth-eyebrow">
            <T>FOR YOUR NEXT BIG THING</T>
          </span>
          <h2>
            <T>Small shop.</T>
            <br />
            <T>Big possibilities.</T>
          </h2>
          <p>
            <T>A little less juggling.</T>
            <br />
            <T>A lot more growing.</T>
          </p>
          <div className="auth-story-badge">
            <CheckCircle2 size={17} />
            <T>Your business. All together.</T>
          </div>
        </div>
        <span className="auth-photo-caption">
          <T>Wanjiku General Shop · Illustrative shop story</T>
        </span>
      </aside>
      <section className="auth-form-area">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <div className="auth-utility-row">
          <Link href="/" className="back-link">
            <ArrowLeft size={15} />
            <T>Back to home</T>
          </Link>
          <ThemeToggle />
        </div>
        <div className="auth-form-wrap">
          {error && (
            <p role="alert" className="operation-error">
              {error}
            </p>
          )}
          {notice && (
            <>
              <p role="status" className="auth-demo-note">
                {notice}
              </p>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  const field = document.querySelector<HTMLInputElement>(
                    'input[name="email"]',
                  );
                  if (!field?.value) return;
                  setBusy(true);
                  try {
                    const { error } = await supabase().auth.resend({
                      type: "signup",
                      email: field.value,
                      options: {
                        emailRedirectTo:
                          location.origin +
                          "/auth/callback" +
                          (accountReturn(returnTo)
                            ? "?next=" +
                              encodeURIComponent(accountReturn(returnTo)!)
                            : ""),
                      },
                    });
                    if (error) throw error;
                    setNotice(
                      "A new confirmation link was requested. Check your email.",
                    );
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Could not request a new link.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Resend confirmation
              </Button>
            </>
          )}
          <T>
            {mode === "forgot" ? (
              <>
                <IconBox icon={success ? CheckCircle2 : ShieldCheck} />
                <h1>
                  <T>
                    {success ? "Check your email." : "Let’s get you back in."}
                  </T>
                </h1>
                <p>
                  <T>
                    {success
                      ? "If an account exists for this address, you will receive an email with a secure reset link."
                      : "Enter the email address you use for BiasharaOS."}
                  </T>
                </p>

                <T>
                  {success ? (
                    <Button href="/login" arrow>
                      <T>Back to sign in</T>
                    </Button>
                  ) : (
                    <form onSubmit={submit}>
                      <Field
                        label="Email address"
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                      <Button type="submit" disabled={busy} arrow>
                        <T>Send reset link</T>
                      </Button>
                    </form>
                  )}
                </T>
              </>
            ) : (
              <>
                <span className="eyebrow">
                  <T>
                    {mode === "signup"
                      ? "A SIMPLE START"
                      : "YOUR BUSINESS IS WAITING"}
                  </T>
                </span>
                <h1>
                  <T>
                    {mode === "signup"
                      ? "Your next chapter\nstarts here."
                      : "Welcome back."}
                  </T>
                </h1>
                <p>
                  <T>
                    {mode === "signup"
                      ? "Make room for a more organised day."
                      : "A clearer view of your business is one step away."}
                  </T>
                </p>

                <T>
                  {mode === "signup" && plan !== "Starter" && (
                    <div className="selected-plan">
                      <Sparkles size={17} />
                      <span>
                        <T>Exploring the</T>
                        <strong>
                          <T>{plan}</T>
                        </strong>
                        <T>plan</T>
                      </span>
                      <Link href="/pricing">
                        <T>Change</T>
                      </Link>
                    </div>
                  )}
                </T>

                <form onSubmit={submit}>
                  <T>
                    {mode === "signup" && (
                      <div className="form-grid">
                        <Field
                          label="Your name"
                          name="name"
                          placeholder="Wanjiku Njeri"
                          required
                          autoComplete="name"
                        />
                        <Field
                          label="Business name"
                          name="business"
                          placeholder="Your shop name"
                          required
                          autoComplete="organization"
                        />
                      </div>
                    )}
                  </T>

                  <Field
                    label="Email address"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                  <div className="field">
                    <div className="label-row">
                      <label htmlFor="password">
                        <T>Password</T>
                      </label>

                      <T>
                        {mode === "login" && (
                          <Link href="/forgot-password">
                            <T>Forgot password?</T>
                          </Link>
                        )}
                      </T>
                    </div>
                    <div className="password-input">
                      <LocalInput
                        id="password"
                        className="input"
                        name="password"
                        type={show ? "text" : "password"}
                        minLength={8}
                        required
                        placeholder={
                          mode === "signup"
                            ? "At least 8 characters"
                            : "Enter your password"
                        }
                        autoComplete={
                          mode === "signup"
                            ? "new-password"
                            : "current-password"
                        }
                      />
                      <LocalButton
                        type="button"
                        aria-label={show ? "Hide password" : "Show password"}
                        onClick={() => setShow(!show)}
                      >
                        <T>{show ? <EyeOff size={18} /> : <Eye size={18} />}</T>
                      </LocalButton>
                    </div>
                  </div>

                  <T>
                    {mode === "signup" && (
                      <label className="checkbox-label">
                        <LocalInput type="checkbox" required />

                        <span>
                          <T>I agree to the</T>{" "}
                          <Link href="/terms" target="_blank">
                            <T>preview terms</T>
                          </Link>{" "}
                          <T>and</T>{" "}
                          <Link href="/privacy" target="_blank">
                            <T>privacy policy</T>
                          </Link>
                          <T>.</T>
                        </span>
                      </label>
                    )}
                  </T>

                  <Button type="submit" disabled={busy} arrow>
                    <T>
                      {mode === "signup"
                        ? "Create workspace"
                        : "Continue to workspace"}
                    </T>
                  </Button>
                </form>
                <p className="auth-switch">
                  <T>
                    {mode === "signup"
                      ? "Already exploring BiasharaOS?"
                      : "New around here?"}
                  </T>{" "}
                  <T> </T>
                  <Link
                    href={
                      (mode === "signup" ? "/login" : "/signup") +
                      (accountReturn(returnTo)
                        ? "?next=" +
                          encodeURIComponent(accountReturn(returnTo)!)
                        : "")
                    }
                  >
                    <T>{mode === "signup" ? "Log in" : "Get started"}</T>
                  </Link>
                </p>
              </>
            )}
          </T>

          <div className="auth-demo-note">
            <ShieldCheck size={15} />
            <p>
              <T>
                Keep your business private. Confirm your email to get started.
              </T>
            </p>
          </div>
        </div>
        <div className="auth-bottom">
          <span>
            <T>©</T> <T>{new Date().getFullYear()}</T> <T>BiasharaOS</T>
          </span>
          <Link href="/help">
            <T>Need a little help?</T>
          </Link>
        </div>
      </section>
    </main>
  );
}

export { BusinessOnboarding as OnboardingPage } from "./business-onboarding";
