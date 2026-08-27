const friendly: Record<string, string> = {
  "23505": "Bu bilgiyle daha önce bir kayıt oluşturulmuş.",
  "42501": "Bu işlem için yetkiniz bulunmuyor.",
  "PGRST116": "İstenen kayıt bulunamadı.",
};

export function userError(error: { code?: string; message?: string } | null, fallback = "İşlem tamamlanamadı. Lütfen tekrar deneyin.") {
  if (!error) return fallback;
  return friendly[error.code ?? ""] ?? fallback;
}
