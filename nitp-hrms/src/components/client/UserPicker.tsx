"use client";
import { useRouter } from "next/navigation";

export function UserPicker({ people, current, base, label = "Person" }: { people: { id: string; name: string }[]; current: string; base: string; label?: string }) {
  const router = useRouter();
  return (
    <label className="field" style={{ maxWidth: 280 }}>
      {label}
      <select
        className="input"
        value={current}
        onChange={(e) => router.push(`${base}${base.includes("?") ? "&" : "?"}u=${e.target.value}`)}
      >
        {people.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </label>
  );
}
