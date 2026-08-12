import { useState } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

type AuthCardProps = {
  blurb: string;
  /** Path used for email magic-link / confirm redirect. Defaults to /profile. */
  redirectPath?: string;
};

type Mode = "magic" | "password-in" | "password-up";

/**
 * Single account door: magic link first (best on phone), password optional.
 * Used on profile, captain, admin, ops.
 */
export function AuthCard({ blurb, redirectPath = "/profile" }: AuthCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("magic");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}${redirectPath}` : redirectPath;

  function validEmail(value: string) {
    return value.includes("@") && value.includes(".");
  }

  async function sendMagicLink() {
    const trimmed = email.trim().toLowerCase();
    if (!validEmail(trimmed)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setSentTo(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setSentTo(trimmed);
      toast.success("Check your email for a sign-in link.");
    } catch (error) {
      // If passwordless email is disabled, fall through to password with a clear message.
      const message = error instanceof Error ? error.message : "Could not send link";
      if (/disabled|not enabled|forbidden|invalid-request/i.test(message)) {
        toast.message("Magic link isn’t enabled — use a password below.");
        setMode("password-in");
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword() {
    const trimmed = email.trim().toLowerCase();
    if (!validEmail(trimmed) || password.length < 6) {
      toast.error("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    setSentTo(null);
    try {
      if (mode === "password-in") {
        const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
        if (error) throw error;
        toast.success("Signed in");
      } else {
        const { error } = await supabase.auth.signUp({
          email: trimmed,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        setSentTo(trimmed);
        toast.success("Account created — confirm email if asked, then sign in.");
        setMode("password-in");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    const trimmed = email.trim().toLowerCase();
    if (!validEmail(trimmed)) {
      toast.error("Enter your email first, then tap reset.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (error) throw error;
      setSentTo(trimmed);
      toast.success("Password reset email sent (if that account exists).");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reset email");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel space-y-4 p-5">
      <div>
        <p className="t-title text-foreground">Account</p>
        <p className="t-body mt-1.5 text-muted-foreground">{blurb}</p>
        <p className="t-micro mt-2 text-muted-foreground">
          Live board, schedule, and pay work without signing in. Account is for roster name + private
          notes. Captains use the same door — Kevin grants scoring.
        </p>
      </div>

      {sentTo && (
        <div className="rounded-xl border border-border bg-secondary/50 px-3.5 py-3">
          <p className="t-body flex items-center gap-2 font-medium text-foreground">
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            Check {sentTo}
          </p>
          <p className="t-micro mt-1.5 text-muted-foreground">
            Open the email on this phone, tap the link, and you’ll land back in the app signed in.
            Check spam if nothing arrives in a minute.
          </p>
        </div>
      )}

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        placeholder="Email"
        className="control t-body w-full"
      />

      {mode === "magic" ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => void sendMagicLink()}
            className="press btn-gold t-body w-full"
          >
            {busy ? "Sending…" : "Email me a sign-in link"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("password-in")}
            className="t-micro w-full text-center text-muted-foreground"
          >
            Use password instead
          </button>
        </>
      ) : (
        <>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={mode === "password-in" ? "current-password" : "new-password"}
            placeholder="Password"
            className="control t-body w-full"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitPassword()}
            className="press btn-gold t-body w-full"
          >
            {busy
              ? "Working…"
              : mode === "password-in"
                ? "Sign in with password"
                : "Create account"}
          </button>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setMode(mode === "password-in" ? "password-up" : "password-in")}
              className="t-micro w-full text-center text-muted-foreground"
            >
              {mode === "password-in" ? "Need an account? Create one" : "Already have one? Sign in"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void resetPassword()}
              className="t-micro w-full text-center text-muted-foreground"
            >
              Forgot password?
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode("magic");
                setPassword("");
              }}
              className="t-micro w-full text-center text-muted-foreground"
            >
              ← Back to email link
            </button>
          </div>
        </>
      )}
    </div>
  );
}
