import { DataAccessError } from "./observability.ts";

export async function loadOptionalData<T>(
  promise: Promise<T>,
  fallback: T,
  operation: string,
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (!(error instanceof DataAccessError)) throw error;
    console.error("[optional-data]", {
      operation,
      incidentId: error.incidentId,
      kind: error.kind,
    });
    return fallback;
  }
}
