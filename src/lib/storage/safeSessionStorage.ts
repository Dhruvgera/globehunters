const memoryFallback = new Map<string, string>();

export function getSessionItem(key: string) {
  try {
    return window.sessionStorage.getItem(key) ?? memoryFallback.get(key) ?? null;
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

export function setSessionItem(key: string, value: string) {
  memoryFallback.set(key, value);
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Privacy modes may expose Storage while denying access. Memory keeps this tab usable.
  }
}

export function removeSessionItem(key: string) {
  memoryFallback.delete(key);
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Nothing else to remove when browser storage is unavailable.
  }
}
