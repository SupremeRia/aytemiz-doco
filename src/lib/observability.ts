type SafeError = { code?: string; status?: number };

export class DataAccessError extends Error {
  readonly operation:string;
  readonly incidentId:string;
  constructor(operation: string,incidentId:string) {
    super("Veri kaynağına şu anda ulaşılamıyor.");
    this.name = "DataAccessError";
    this.operation=operation;
    this.incidentId=incidentId;
  }
}

export function failDataAccess(operation: string, error: unknown): never {
  const safe = error && typeof error === "object" ? (error as SafeError) : {};
  const incidentId=crypto.randomUUID();
  console.error("[data-access]", {
    incidentId,
    operation,
    code: safe.code ?? "unknown",
    status: safe.status ?? null,
  });
  throw new DataAccessError(operation,incidentId);
}
