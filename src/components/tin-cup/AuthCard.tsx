import { useId, useState } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { writeSeat } from "@/lib/seat";
import {
  isAlreadyRegistered,
  isInvalidLogin,
  isRateLimited,
  isUnconfirmedEmail,
} from "@/lib/auth-messages";

type AuthCardProps = {
  blurb: string;
  redirectPath?: string;
};

type Mode = "password-in" | "password-up" | "magic";

/**
 * Password first — reliable on a phone when magic-link email is rate-limited.
 */
export function AuthCard({ blurb, redirectPath = "/profile" }: AuthCardProps) {
  const formId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("password-in");
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
      const message = error instanceof Error ? error.message : "Could not send link";
      if (
        isRateLimited(message) ||
        /disabled|not enabled|forbidden|invalid-request/i.test(message)
      ) {
        setMode("password-in");
        toast.message(
          isRateLimited(message)
            ? "Email link is rate-limited — use your password."
            : "Use a password instead.",
        );
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
      if (mode === "password-up") {
        const { data, error } = await supabase.auth.signUp({
          email: trimmed,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        const ghost =
          Boolean(data.user) && !data.session && (data.user?.identities?.length ?? 1) === 0;
        if (ghost) {
          setMode("password-in");
          toast.message("That email already has an account — sign in.");
        } else if (data.session) {
          writeSeat("account");
          toast.success("You're in. Claim your roster name next.");
        } else {
          setSentTo(trimmed);
          setMode("password-in");
          toast.success("Account created — check your email or just sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
        if (error) throw error;
        writeSeat("account");
        toast.success("Signed in");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      if (isAlreadyRegistered(message)) {
        setMode("password-in");
        toast.message("That email already has an account — sign in.");
      } else if (isUnconfirmedEmail(message)) {
        toast.error("Confirm the email we sent, then sign in.");
      } else if (isInvalidLogin(message)) {
        toast.error("Email or password doesn't match. Create an account if you're new.");
      } else {
        toast.error(message);
      }
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
      toast.success("Reset email sent. Open it on this phone and tap Reset password.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send reset email";
      if (isRateLimited(message)) {
        toast.error(
          "Email is rate-limited. Try again in a few minutes, or sign in with a password.",
        );
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface space-y-4 p-5">
      <div>
        <h2 className="t-title text-foreground">
          {mode === "password-up" ? "Create account" : mode === "magic" ? "Email link" : "Sign in"}
        </h2>
        <p className="t-micro mt-1.5 text-muted-foreground">{blurb}</p>
        <p className="t-micro mt-1.5 text-muted-foreground">
          Stay signed in on this phone until you sign out.
        </p>
      </div>

      {sentTo && (
        <div className="rounded-xl border border-border bg-secondary/50 px-3.5 py-3">
          <p className="t-body flex items-center gap-2 font-medium text-foreground">
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            Check {sentTo}
          </p>
          <p className="t-micro mt-1.5 text-muted-foreground">
            {mode === "magic"
              ? "Open the email on this phone. Spam if it isn't there in a minute."
              : "Open it on this phone and tap Reset password. Then set a new one. Check spam if it isn't there in a minute."}
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor={`${formId}-email`} className="t-micro font-semibold text-foreground">
          Email
        </label>
        <input
          id={`${formId}-email`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="you@example.com"
          className="control t-body min-h-12 w-full"
        />
      </div>

      {mode === "magic" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void sendMagicLink()}
          className="press btn-gold t-body min-h-12 w-full"
        >
          {busy ? "Sending…" : "Email me a sign-in link"}
        </button>
      ) : (
        <>
          <div className="space-y-1.5">
            <label htmlFor={`${formId}-password`} className="t-micro font-semibold text-foreground">
              Password
            </label>
            <input
              id={`${formId}-password`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === "password-in" ? "current-password" : "new-password"}
              placeholder="At least 6 characters"
              className="control t-body min-h-12 w-full"
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitPassword()}
            className="press btn-gold t-body min-h-12 w-full"
          >
            {busy ? "Working…" : mode === "password-up" ? "Create account" : "Sign in"}
          </button>
        </>
      )}

      <div className="flex flex-col gap-2 pt-1">
        {mode === "magic" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("password-in")}
            className="press min-h-11 t-micro text-center font-semibold text-foreground"
          >
            Use password instead
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("magic")}
            className="press t-micro min-h-11 w-full text-center text-muted-foreground"
          >
            Email me a link instead
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => setMode(mode === "password-up" ? "password-in" : "password-up")}
          className="press t-micro min-h-11 w-full text-center text-muted-foreground"
        >
          {mode === "password-up"
            ? "Already have an account? Sign in"
            : "Need an account? Create one"}
        </button>
        {mode !== "magic" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void resetPassword()}
            className="press t-micro min-h-11 w-full text-center text-muted-foreground"
          >
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );
}
