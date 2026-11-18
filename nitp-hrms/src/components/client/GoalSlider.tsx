"use client";
import { useState, useTransition } from "react";
import { setGoalProgress } from "@/app/actions/growth";
import { useToast } from "./Toast";

export function GoalSlider({ id, value, color, label, disabled }: { id: string; value: number; color: string; label: string; disabled?: boolean }) {
  const [v, setV] = useState(value);
  const [, start] = useTransition();
  const toast = useToast();
  const commit = () => {
    if (v === value) return;
    start(async () => {
      const r = await setGoalProgress(id, v);
      if (!r.ok) {
        toast(r.message, "rose");
        setV(value);
      }
    });
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", height: 22, display: "flex", alignItems: "center", flex: 1 }} className="goal-track">
        <div style={{ position: "absolute", left: 0, right: 0, height: 8, borderRadius: 8, background: "rgba(255,255,255,.9)" }} />
        <div style={{ position: "absolute", left: 0, height: 8, borderRadius: 8, width: `${v}%`, background: color, transition: "width .15s" }} />
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={v}
          disabled={disabled}
          aria-label={label}
          onChange={(e) => setV(Number(e.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
          style={{ position: "relative", width: "100%", margin: 0, opacity: 0, cursor: disabled ? "default" : "pointer", height: 22 }}
        />
      </div>
      <span className="mono tnum" style={{ fontSize: 14, width: 44, textAlign: "right" }}>{v}%</span>
    </div>
  );
}
