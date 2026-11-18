import "server-only";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const checkPassword = (p: string, h: string) => bcrypt.compare(p, h);

/** A readable initial password, e.g. "Mint-Kite-4821". No ambiguous characters. */
export function generatePassword(): string {
  const words = ["Mint", "Kite", "River", "Cedar", "Sky", "Lotus", "Amber", "Coral", "Maple", "Pearl", "Orbit", "Delta", "Quartz", "Willow", "Falcon", "Harbor"];
  const pick = () => words[randomInt(words.length)];
  return `${pick()}-${pick()}-${randomInt(1000, 10000)}`;
}

export function passwordProblem(p: string): string | null {
  if (p.length < 10) return "Use at least 10 characters.";
  if (!/[a-z]/.test(p) || !/[A-Z]/.test(p)) return "Mix upper and lower case letters.";
  if (!/\d/.test(p)) return "Include at least one number.";
  return null;
}
