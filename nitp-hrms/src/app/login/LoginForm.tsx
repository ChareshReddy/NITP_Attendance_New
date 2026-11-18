"use client";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { FormError } from "@/components/AuthFrame";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FormError msg={state?.error} />
      <label className="field" htmlFor="email">
        Work email
        <input id="email" name="email" type="email" autoComplete="username" required className="input" placeholder="name@nextitpoint.com" />
      </label>
      <label className="field" htmlFor="password">
        Password
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </label>
      <button type="submit" className="btn btn-primary" disabled={pending} style={{ minHeight: 42 }}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="meta" style={{ margin: 0 }}>Forgot your password? Ask HR to reset it. You&apos;ll get a new initial password.</p>
    </form>
  );
}
