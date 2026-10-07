"use client";

/**
 * Almacén persistente basado en localStorage con suscripción,
 * pensado para usar con useSyncExternalStore (evita setState en efectos
 * y es seguro para hidratación).
 */

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribePersist(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function readPersist(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePersist(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* almacenamiento no disponible */
  }
  notify();
}

/**
 * Snapshot cacheado: devuelve el mismo valor (identidad estable) mientras
 * el contenido en localStorage no cambie. Requisito de useSyncExternalStore.
 */
const cache = new Map<string, { raw: string | null; value: unknown }>();

export function persistSnapshot<T>(
  key: string,
  parse: (raw: string) => T,
  fallback: T
): T {
  const raw = readPersist(key);
  const entry = cache.get(key);
  if (entry && entry.raw === raw) return entry.value as T;
  const value = raw === null ? fallback : parse(raw);
  cache.set(key, { raw, value });
  return value;
}
