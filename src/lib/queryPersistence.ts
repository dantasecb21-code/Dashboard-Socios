interface PersistedQueryState<T> {
  data: T;
  updatedAt: number;
}

const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000;

export function readPersistedQuery<T>(
  key: string,
  maxAgeMs: number = DEFAULT_MAX_AGE_MS,
): PersistedQueryState<T> | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as PersistedQueryState<T>;
    if (!parsed || typeof parsed.updatedAt !== "number" || parsed.data === undefined) {
      return undefined;
    }

    if (Date.now() - parsed.updatedAt > maxAgeMs) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
}

export function writePersistedQuery<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;

  try {
    const payload: PersistedQueryState<T> = {
      data,
      updatedAt: Date.now(),
    };

    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage failures to avoid blocking live data loading.
  }
}