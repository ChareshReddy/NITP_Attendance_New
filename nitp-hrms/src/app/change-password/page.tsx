import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { firstName } from "@/lib/tones";
import { AuthFrame } from "@/components/AuthFrame";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = { title: "Set your password" };

export default async function ChangePasswordPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?expired=1");
  return (
    <AuthFrame
      title={me.mustChangePassword ? `Welcome, ${firstName(me.name)}` : "Change password"}
      sub={me.mustChangePassword ? "Set your own password before you continue. HR won't be able to see it." : "Choose a new password for your account."}
    >
      <ChangePasswordForm forced={me.mustChangePassword} />
    </AuthFrame>
  );
}
