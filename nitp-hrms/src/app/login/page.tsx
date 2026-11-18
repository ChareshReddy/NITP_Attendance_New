import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { AuthFrame } from "@/components/AuthFrame";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const expired = "expired" in (await searchParams);
  return (
    <AuthFrame title="Sign in" sub="Use your work email. First time here? Use the initial password HR gave you.">
      {expired && <p role="status" style={{ margin: 0, background: "#fff4c9", color: "#7a5a00", borderRadius: 12, padding: "10px 12px", font: "600 12.5px var(--font-sans)" }}>Your session ended. Sign in again.</p>}
      <LoginForm />
    </AuthFrame>
  );
}
