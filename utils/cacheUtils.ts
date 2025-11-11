/**
 * Utilidades de caché para reducir llamadas a API
 * Implementa caché en localStorage con expiración temporal
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live en milisegundos
}

// Espacio de nombres para caché en localStorage
const CACHE_PREFIX = 'ult_ceramic_cache:';

/**
 * Obtener datos del caché si no han expirado
 */
export function getFromCache<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!stored) return null;

    const entry: CacheEntry<T> = JSON.parse(stored);
    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      // Expirado, eliminar
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    console.debug(`[Cache] HIT: ${key} (age: ${Math.round(age / 1000)}s)`);
    return entry.data;
  } catch (error) {
    console.error('[Cache] Error reading:', error);
    return null;
  }
}

/**
 * Guardar datos en el caché
 */
export function setInCache<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    console.debug(`[Cache] WRITE: ${key} (TTL: ${Math.round(ttlMs / 1000)}s)`);
  } catch (error) {
    console.error('[Cache] Error writing:', error);
  }
}

/**
 * Limpiar caché para una clave específica
 */
export function clearCache(key: string): void {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    console.debug(`[Cache] CLEAR: ${key}`);
  } catch (error) {
    console.error('[Cache] Error clearing:', error);
  }
}

/**
 * Limpiar todo el caché
 */
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.debug(`[Cache] CLEAR ALL`);
  } catch (error) {
    console.error('[Cache] Error clearing all:', error);
  }
}

/**
 * Wrapper para llamadas a API con caché automático
 */
export async function cachedFetch<T>(
  url: string,
  ttlMs: number = 5 * 60 * 1000,
  options?: RequestInit
): Promise<T | null> {
  const cacheKey = `fetch:${url}`;

  // Intentar obtener del caché
  const cached = getFromCache<T>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    setInCache(cacheKey, data, ttlMs);
    return data;
  } catch (error) {
    console.error('[Cache] Fetch error:', error);
    return null;
  }
}

/**
 * Obtener estadísticas del caché (para debugging)
 */
export function getCacheStats(): {
  entries: number;
  size: number;
  keys: string[];
} {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    let size = 0;

    keys.forEach(key => {
      const item = localStorage.getItem(key);
      if (item) size += item.length;
    });

    return {
      entries: keys.length,
      size,
      keys: keys.map(k => k.replace(CACHE_PREFIX, ''))
    };
  } catch (error) {
    console.error('[Cache] Error getting stats:', error);
    return { entries: 0, size: 0, keys: [] };
  }
}
