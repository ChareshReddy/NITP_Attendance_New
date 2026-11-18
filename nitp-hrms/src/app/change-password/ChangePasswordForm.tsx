"use client";
import { useActionState } from "react";
import Link from "next/link";
import { changePassword, logout } from "@/app/actions/auth";
import { FormError } from "@/components/AuthFrame";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FormError msg={state?.error} />
      <label className="field" htmlFor="current">
        {forced ? "Initial password from HR" : "Current password"}
        <input id="current" name="current" type="password" autoComplete="current-password" required className="input" />
      </label>
      <label className="field" htmlFor="next">
        New password
        <input id="next" name="next" type="password" autoComplete="new-password" required minLength={10} className="input" aria-describedby="pw-rules" />
      </label>
      <span id="pw-rules" className="meta" style={{ marginTop: -6 }}>At least 10 characters, with upper and lower case letters and a number.</span>
      <label className="field" htmlFor="confirm">
        Confirm new password
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" />
      </label>
      <button type="submit" className="btn btn-primary" disabled={pending} style={{ minHeight: 42 }}>
        {pending ? "Saving…" : "Save password"}
      </button>
      {forced ? (
        <button type="button" className="btn btn-ghost" onClick={() => logout()}>Sign out</button>
      ) : (
        <Link href="/dashboard" className="btn btn-ghost">Cancel</Link>
      )}
    </form>
  );
}
