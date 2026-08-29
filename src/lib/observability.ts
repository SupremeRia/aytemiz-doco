type SafeError = { code?: string; status?: number };

export type DataAccessErrorKind = "permission" | "transient";

export class DataAccessError extends Error {
  readonly operation:string;
  readonly incidentId:string;
  readonly kind:DataAccessErrorKind;
  digest:string;
  constructor(operation: string,incidentId:string,kind:DataAccessErrorKind) {
    super(kind==="permission"?"Bu bilgiye erişim yetkiniz yok.":"Veri kaynağına şu anda ulaşılamıyor.");
    this.name = "DataAccessError";
    this.operation=operation;
    this.incidentId=incidentId;
    this.kind=kind;
    this.digest=`${kind}:${incidentId}`;
  }
}

function classify(safe: SafeError): DataAccessErrorKind {
  if (safe.status === 401 || safe.status === 403 || safe.code === "42501" || safe.code === "PGRST301") return "permission";
  return "transient";
}

export function failDataAccess(operation: string, error: unknown): never {
  const safe = error && typeof error === "object" ? (error as SafeError) : {};
  const incidentId=crypto.randomUUID();
  const kind=classify(safe);
  console.error("[data-access]", {
    incidentId,
    operation,
    kind,
    code: safe.code ?? "unknown",
    status: safe.status ?? null,
  });
  throw new DataAccessError(operation,incidentId,kind);
}
