"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ActionForm, type Result } from "./ActionForm";
import { useToast } from "./Toast";
import type { Tone } from "@/lib/tones";

type Cred = { name: string; email: string; password: string };

function CredentialModal({ cred, onClose }: { cred: Cred; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    closeRef.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose, mounted]);
  const text = `NITP People sign-in\nEmail: ${cred.email}\nInitial password: ${cred.password}\nYou'll be asked to set your own password when you first sign in.`;
  if (!mounted) return null;
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="cred-title" className="card pop" style={{ width: "min(460px,100%)", borderRadius: 24 }} onClick={(e) => e.stopPropagation()}>
        <h2 id="cred-title" className="card-title">Initial password for {cred.name}</h2>
        <p className="meta" style={{ margin: 0, fontSize: 13 }}>Share this privately. It&apos;s shown only once, and they must change it at first sign-in.</p>
        <div style={{ background: "#efe9ff", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="meta" style={{ color: "#5236b8" }}>{cred.email}</span>
          <span className="mono" style={{ fontSize: 22, userSelect: "all", wordBreak: "break-all" }}>{cred.password}</span>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Copied" : "Copy sign-in details"}
          </button>
          <button ref={closeRef} type="button" className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Form whose action returns { data: { password } }; shows the password once. */
export function CredentialForm({ action, children, className, style }: { action: (fd: FormData) => Promise<Result>; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const [cred, setCred] = useState<Cred | null>(null);
  return (
    <>
      <ActionForm action={action} className={className} style={style} onResult={(r) => r.ok && r.data?.password && setCred(r.data as Cred)}>
        {children}
      </ActionForm>
      {cred && <CredentialModal cred={cred} onClose={() => setCred(null)} />}
    </>
  );
}

export function ResetPasswordButton({ action, name }: { action: () => Promise<Result>; name: string }) {
  const [cred, setCred] = useState<Cred | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Reset ${name}'s password? They'll be signed out and must use the new initial password.`)) return;
          start(async () => {
            const r = await action();
            toast(r.message, (r.tone as Tone) ?? (r.ok ? "mint" : "rose"));
            if (r.ok && r.data?.password) setCred(r.data as Cred);
          });
        }}
      >
        {pending ? "…" : "Reset password"}
      </button>
      {cred && <CredentialModal cred={cred} onClose={() => setCred(null)} />}
    </>
  );
}
