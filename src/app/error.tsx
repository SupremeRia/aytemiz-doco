"use client";

import { useEffect } from "react";

function classify(digest?: string) {
  const incidentId = digest?.includes(":") ? digest.slice(digest.indexOf(":") + 1) : digest;
  if (digest?.startsWith("permission:")) {
    return {
      title: "Erişim yetkiniz yok",
      body: "Bu bilgiyi görüntülemek için gerekli yetkiye sahip değilsiniz. Yetkinizin değiştiğini düşünüyorsanız bir yöneticiyle iletişime geçin.",
      incidentId,
    };
  }
  return {
    title: "Bilgiler şu anda alınamıyor",
    body: "Veri servisine geçici olarak ulaşılamıyor. Kayıtlarınız silinmedi; lütfen yeniden deneyin.",
    incidentId,
  };
}

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[ui.error-boundary]", { digest: error.digest });
  }, [error]);

  const { title, body, incidentId } = classify(error.digest);

  return (
    <main className="shell grid place-items-center">
      <section className="ui-card empty-state max-w-xl" role="alert">
        <p className="eyebrow">Bağlantı sorunu</p>
        <h1>{title}</h1>
        <p className="muted">{body}</p>
        {incidentId ? <p className="muted">Destek kodu: {incidentId}</p> : null}
        <button type="button" className="ui-button ui-button--primary" onClick={reset}>Yeniden dene</button>
      </section>
    </main>
  );
}
