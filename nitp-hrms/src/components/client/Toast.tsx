"use client";
import { Suspense, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { TONES, type Tone } from "@/lib/tones";

type ToastFn = (message: string, tone?: Tone) => void;
const Ctx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [t, setT] = useState<{ m: string; tone: Tone; k: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback<ToastFn>((m, tone = "mint") => {
    if (timer.current) clearTimeout(timer.current);
    setT({ m, tone, k: Date.now() });
    timer.current = setTimeout(() => setT(null), 3600);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <Suspense>
        <WelcomeToast />
      </Suspense>
      <div aria-live="polite" role="status">
        {t && (
          <div key={t.k} className="toast">
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: TONES[t.tone].ac, flex: "none" }} />
            {t.m}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

function WelcomeToast() {
  const sp = useSearchParams();
  const toast = useToast();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (sp.get("welcome")) {
      toast("Password saved. You're all set.", "mint");
      router.replace(path);
    }
  }, [sp, toast, router, path]);
  return null;
}
