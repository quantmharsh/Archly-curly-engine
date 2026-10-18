"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

type AccountDialogProps = {
  onClose: () => void;
  onSuccess: () => void;
};

export function AccountDialog({ onClose, onSuccess }: AccountDialogProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const signInSocial = async (provider: "google" | "github") => {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.social({ provider, callbackURL: "/" });
      if (result.error) {
        const label = provider[0].toUpperCase() + provider.slice(1);
        setError(`${label} sign-in could not start. Check that its OAuth credentials are configured in .env.local.`);
      }
    } catch {
      setError(`${provider[0].toUpperCase()}${provider.slice(1)} sign-in is not configured. Add its OAuth credentials to .env.local and restart the app.`);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = mode === "signup"
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) setError(result.error.message || "Could not sign in.");
      else onSuccess();
    } catch {
      setError("Account storage is unavailable. Start the local database and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="account-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
        <button className="account-dialog-close" type="button" onClick={onClose} aria-label="Close account dialog">×</button>
        <span className="account-dialog-mark">A</span>
        <h2 id="account-dialog-title">{mode === "signup" ? "Save your work everywhere" : "Welcome back"}</h2>
        <p>{mode === "signup" ? "Create an Archly account. Your local canvases stay safe while you choose what to transfer." : "Sign in to open your account canvases on this device."}</p>
        <div className="account-social-options" aria-label="Continue with a social account">
          <button type="button" onClick={() => void signInSocial("google")} disabled={busy}>
            <span className="social-google-mark" aria-hidden="true">G</span>Continue with Google
          </button>
          <button type="button" onClick={() => void signInSocial("github")} disabled={busy}>
            <svg className="social-github-mark" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.1c-3.1.67-3.75-1.32-3.75-1.32-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.72 1.15 1.72 1.15 1 .1.77 2.5 3.93 1.77.1-.71.4-1.2.7-1.48-2.48-.28-5.08-1.24-5.08-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.95 0 0 .94-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.12-1.44 3.05-1.14 3.05-1.14.61 1.53.23 2.67.11 2.95.72.78 1.15 1.78 1.15 3 0 4.3-2.6 5.23-5.1 5.5.4.34.75 1 .75 2.02V22c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"/></svg>
            Continue with GitHub
          </button>
        </div>
        <div className="account-dialog-divider"><span>or continue with email</span></div>
        <form onSubmit={submit}>
          {mode === "signup" && <label>Name<input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /></label>}
          <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <div className="account-dialog-error" role="alert">{error}</div>}
          <button className="account-dialog-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
        </form>
        <div className="account-dialog-switch">{mode === "signup" ? "Already have an account?" : "New to Archly?"}<button type="button" onClick={() => { setError(""); setMode(mode === "signup" ? "signin" : "signup"); }}>{mode === "signup" ? "Sign in" : "Create account"}</button></div>
      </section>
    </div>
  );
}
