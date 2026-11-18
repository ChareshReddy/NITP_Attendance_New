"use client";
import { useRef, useTransition } from "react";
import { useToast } from "./Toast";
import type { Tone } from "@/lib/tones";

export type Result = { ok: boolean; message: string; tone?: string; data?: Record<string, string> };

/** A form that posts to a server action, shows the result as a toast, and resets on success. */
export function ActionForm({
  action,
  children,
  className,
  style,
  reset = true,
  onResult,
  onChange,
  confirmText,
}: {
  action: (fd: FormData) => Promise<Result>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  reset?: boolean;
  onResult?: (r: Result) => void;
  onChange?: (fd: FormData) => void;
  confirmText?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <form
      ref={ref}
      className={className}
      style={style}
      aria-busy={pending}
      onChange={onChange ? (e) => onChange(new FormData(e.currentTarget)) : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (confirmText && !window.confirm(confirmText)) return;
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await action(fd);
          toast(r.message, (r.tone as Tone) ?? (r.ok ? "mint" : "rose"));
          if (r.ok && reset) ref.current?.reset();
          onResult?.(r);
        });
      }}
    >
      <fieldset disabled={pending} style={{ border: 0, margin: 0, padding: 0, minWidth: 0, display: "contents" }}>
        {children}
      </fieldset>
    </form>
  );
}

/** A single button that runs a server action. */
export function ActionButton({
  action,
  children,
  className = "btn btn-ghost btn-sm",
  confirmText,
  style,
  label,
  disabled,
}: {
  action: () => Promise<Result>;
  children: React.ReactNode;
  className?: string;
  confirmText?: string;
  style?: React.CSSProperties;
  label?: string;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      className={className}
      style={style}
      aria-label={label}
      disabled={pending || disabled}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          const r = await action();
          toast(r.message, (r.tone as Tone) ?? (r.ok ? "mint" : "rose"));
        });
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}
