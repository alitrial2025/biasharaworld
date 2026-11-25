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
  Store,
} from "lucide-react";
import {
  Brand,
  Button,
  Field,
  IconBox,
  SelectField,
  useToast,
} from "@/components/ui";
import { useDemo } from "@/lib/store";
import { customerReturn } from "@/lib/storefront";
import { industries, industryFor } from "@/lib/industries";
import { supabase } from "@/lib/supabase";

export function AuthPage({
  mode,
  plan = "Starter",
  next,
}: {
  mode: "login" | "signup" | "forgot";
  plan?: string;
  next?: string;
}) {
  const [show, setShow] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { store } = useDemo();
  const toast = useToast();
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const destination = customerReturn(next);
  const isCustomer = Boolean(destination && !destination.startsWith("/dashboard/"));
  const nextQuery = destination ? "?next=" + encodeURIComponent(destination) : "";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data=new FormData(event.currentTarget);
    const email=String(data.get('email')||'').trim();
    setError("");setNotice("");setBusy(true);
    try {
      const client=supabase();
      if(mode==='forgot') {
        const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/auth/callback?intent=recovery'});
        if(error)throw error;setSuccess(true);return;
      }
      const password=String(data.get('password')||'');
      if(mode==='signup') {
        const {data:result,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/auth/callback'+nextQuery,data:{name:String(data.get('name')||'').trim(),business:String(data.get('business')||'').trim()}}});
        if(error)throw error;
        if(!result.session){setNotice('Check your email to confirm your account, then sign in. If you already have an account, use Log in.');return;}
        store.session(result.user?.id||'');await store.hydrate();router.push(destination||'/onboarding');
      } else {
        const {data:result,error}=await client.auth.signInWithPassword({email,password});
        if(error)throw error;store.session(result.user.id);await store.hydrate();
        toast('Welcome back.');router.push(destination||(store.workspace?'/dashboard':'/onboarding'));
      }
    } catch(e) {setError(e instanceof Error?e.message:'Please try again.');}
    finally{setBusy(false);}
  }

  return (
    <main id="main-content" className="auth-page">
      <aside className="auth-visual">
        <Image
          src="/images/shop.webp"
          alt="Shopkeeper looking at her phone in a Kenyan grocery store"
          fill
          priority
          sizes="50vw"
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
          <T>Wanjiku General Shop · Our sample business</T>
        </span>
      </aside>
      <section className="auth-form-area">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <Link href="/" className="back-link">
          <ArrowLeft size={15} />
          <T>Back to home</T>
        </Link>
        <div className="auth-form-wrap">
          {error && <p role="alert" className="operation-error">{error}</p>}
          {notice && <p role="status" className="auth-demo-note">{notice}</p>}
          <T>
            {mode === "forgot" ? (
              <>
                <IconBox icon={success ? CheckCircle2 : ShieldCheck} />
                <h1>
                  <T>
                    {success
                      ? "Check your email."
                      : "Let’s get you back in."}
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
                    <Button href={"/login" + nextQuery} arrow>
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
                        {!isCustomer && <Field
                          label="Business name"
                          name="business"
                          placeholder="Your shop name"
                          required
                          autoComplete="organization"
                        />}
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
                          <T>I agree to the</T>
                          <Link href="/terms" target="_blank">
                            <T>preview terms</T>
                          </Link>
                          <T>and</T>
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
                        ? isCustomer ? "Create customer account" : "Create workspace"
                        : isCustomer ? "Return to shop" : "Continue to workspace"}
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
                  <Link href={(mode === "signup" ? "/login" : "/signup") + nextQuery}>
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

export function OnboardingPage() {
  const { state, store } = useDemo();
  const router = useRouter();
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!store.authenticated) {
      router.replace("/login");
      return;
    }
    const data = new FormData(event.currentTarget);
    const profile = { business: String(data.get("business")), type: String(data.get("type")), location: String(data.get("location")) };
    if (!industries.some(industry => industry.id === profile.type)) {
      setError("Choose your business type.");
      return;
    }
    try {
      if (store.workspace) await store.updateProfile(profile);
      else {
        const { data: { user } } = await supabase().auth.getUser();
        await store.createBusiness({ ...profile, name: user?.user_metadata?.name || user?.email?.split("@")[0] || "Owner" });
      }
      router.replace("/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save your business.");
    }
  }

  return (
    <main id="main-content" className="onboarding-page">
      <div className="container onboarding-top"><Brand /></div>
      <div className="onboarding-layout">
        <aside>
          <h2><T>Set up your business workspace</T></h2>
          <p><T>Your business type determines which tools appear on your dashboard. You can find other tools through search.</T></p>
        </aside>
        <section className="onboarding-card">
          <IconBox icon={Store} />
          <h1><T>Tell us about your business.</T></h1>
          {error && <p role="alert" className="operation-error">{error}</p>}
          <form onSubmit={submit} key={store.workspace?.businessId ?? "new"}>
            <Field label="Business name" name="business" defaultValue={store.workspace ? state.profile.business : ""} required maxLength={100} />
            <SelectField label="Business type" name="type" defaultValue={store.workspace ? industryFor(state.profile.type).id : ""} required>
              <option value="" disabled>Choose your business type</option>
              {industries.map(industry => <option key={industry.id} value={industry.id}>{industry.label}</option>)}
            </SelectField>
            <Field label="Location" name="location" defaultValue={store.workspace ? state.profile.location : ""} required maxLength={100} />
            <Button type="submit" disabled={!store.ready || store.busy} arrow><T>Open workspace</T></Button>
          </form>
        </section>
      </div>
    </main>
  );
}
