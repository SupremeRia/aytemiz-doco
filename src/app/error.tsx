"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[ui.error-boundary]", { digest: error.digest });
  }, [error]);

  return (
    <main className="shell grid place-items-center">
      <section className="ui-card empty-state max-w-xl" role="alert">
        <p className="eyebrow">Bağlantı sorunu</p>
        <h1>Bilgiler şu anda alınamıyor</h1>
        <p className="muted">Kayıtlarınız silinmedi. İnternet bağlantınızı kontrol edip yeniden deneyin.</p>
        <button type="button" className="ui-button ui-button--primary" onClick={reset}>Yeniden dene</button>
      </section>
    </main>
  );
}
