import { isValidVisitorId } from "@/lib/visitor-id";

export interface BusApiState {
  count: number;
  seatCapacity: number;
  profileRevision: number;
  vacantSeatRanges: Array<[number, number, number]>;
}

const API_TIMEOUT_MS = 8_000;
let memoryVisitorId: string | null = null;

function createVisitorId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const randomPart = Math.random().toString(36).slice(2, 14);
  return `fdb-${Date.now().toString(36)}-${randomPart}`;
}

export function getOrCreateVisitorId(): string {
  if (memoryVisitorId && isValidVisitorId(memoryVisitorId)) return memoryVisitorId;
  try {
    const storedVisitorId = localStorage.getItem("fdb-visitor");
    const visitorId = isValidVisitorId(storedVisitorId) ? storedVisitorId : createVisitorId();
    localStorage.setItem("fdb-visitor", visitorId);
    memoryVisitorId = visitorId;
    return visitorId;
  } catch {
    memoryVisitorId = createVisitorId();
    return memoryVisitorId;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
  }
}

function getRetryAfterMs(response: Response): number | null {
  const value = response.headers.get("Retry-After");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

export function isRetryableRegistrationError(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status >= 500 || [408, 425, 429].includes(error.status);
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = API_TIMEOUT_MS,
): Promise<T> {
  const requestController = new AbortController();
  const externalSignal = init.signal;
  const abortFromExternal = () => requestController.abort();
  if (externalSignal?.aborted) {
    abortFromExternal();
  } else {
    externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
  }
  const timeout = window.setTimeout(() => requestController.abort(), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: requestController.signal });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(
        data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "Le serveur ne répond pas pour le moment.",
        response.status,
        getRetryAfterMs(response),
      );
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new ApiError("Réponse du serveur invalide.", 502);
    }
    return data as T;
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
}
