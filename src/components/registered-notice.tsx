"use client";

import { useEffect, useState } from "react";

export function RegisteredNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setVisible(new URLSearchParams(window.location.search).has("registered")));
  }, []);

  if (!visible) return null;
  return (
    <div role="status" className="mt-8 rounded-2xl border border-emerald-800 bg-emerald-950/40 p-4 text-emerald-200">
      Hesabınız oluşturuldu. Yetkilendirme tamamlanana kadar tanıtım alanını inceleyebilirsiniz.
    </div>
  );
}
