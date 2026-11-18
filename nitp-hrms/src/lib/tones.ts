export type Tone = "mint" | "sky" | "lav" | "peach" | "lemon" | "rose" | "gray";

export const TONES: Record<Tone, { bg: string; fg: string; ac: string }> = {
  mint: { bg: "#e3f6ec", fg: "#0c6b44", ac: "#22a06b" },
  sky: { bg: "#e4efff", fg: "#1d56b0", ac: "#3b82f6" },
  lav: { bg: "#efe9ff", fg: "#5236b8", ac: "#7c5cff" },
  peach: { bg: "#ffebdf", fg: "#a8480f", ac: "#f97316" },
  lemon: { bg: "#fff4c9", fg: "#7a5a00", ac: "#e0a800" },
  rose: { bg: "#ffe5eb", fg: "#a61e45", ac: "#f43f5e" },
  gray: { bg: "#f1f0ed", fg: "#55555e", ac: "#9a9aa3" },
};

const STATUS_TONE: Record<string, Tone> = {
  Pending: "lemon",
  Approved: "mint",
  Rejected: "rose",
  Withdrawn: "gray",
  Submitted: "sky",
  "Changes requested": "peach",
  Paid: "mint",
  Processed: "mint",
  Draft: "lemon",
  Active: "mint",
  Inactive: "gray",
  Onboarding: "lav",
  In: "mint",
  Present: "mint",
  Late: "lemon",
  WFH: "sky",
  "On leave": "lav",
  Leave: "lav",
  "Not punched": "gray",
  "Punched out": "gray",
  Enrolled: "sky",
  Completed: "mint",
  Open: "lav",
};

export function statusTone(s: string): Tone {
  return STATUS_TONE[s] ?? "gray";
}

export const AVATAR_BGS = ["#e3f6ec", "#e4efff", "#efe9ff", "#ffebdf", "#fff4c9", "#ffe5eb"];

export function avatarBg(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_BGS[h % AVATAR_BGS.length];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

/** First real name token ("G Charesh Reddy" -> "Charesh"). */
export function firstName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.find((p) => p.replace(/\./g, "").length > 1) ?? parts[0] ?? name;
}
