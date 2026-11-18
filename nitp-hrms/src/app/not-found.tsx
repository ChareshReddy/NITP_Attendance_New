import Link from "next/link";
import { AuthFrame } from "@/components/AuthFrame";

export default function NotFound() {
  return (
    <AuthFrame title="Page not found" sub="That page doesn't exist or you don't have access to it.">
      <Link href="/dashboard" className="btn btn-primary">Go to dashboard</Link>
    </AuthFrame>
  );
}
