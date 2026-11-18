"use client";
import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="card" style={{ maxWidth: 520 }}>
      <h2 className="card-title">This page couldn&apos;t load</h2>
      <p className="meta" style={{ margin: 0, fontSize: 13 }}>
        The database may be unreachable for a moment. Try again; if it keeps happening, tell HR{error.digest ? ` and quote reference ${error.digest}` : ""}.
      </p>
      <button type="button" className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={reset}>Try again</button>
    </section>
  );
}
