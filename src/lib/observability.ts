type SafeError = { code?: string; status?: number };

export class DataAccessError extends Error {
  constructor(readonly operation: string) {
    super("Veri kaynağına şu anda ulaşılamıyor.");
    this.name = "DataAccessError";
  }
}

export function failDataAccess(operation: string, error: unknown): never {
  const safe = error && typeof error === "object" ? (error as SafeError) : {};
  console.error("[data-access]", {
    operation,
    code: safe.code ?? "unknown",
    status: safe.status ?? null,
  });
  throw new DataAccessError(operation);
}
