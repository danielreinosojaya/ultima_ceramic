// utils/fetchWithAbort.ts
// Herramienta centralizada para manejar fetches con AbortController

type RequestKey = string;
type PendingRequest = {
  controller: AbortController;
  timeout: NodeJS.Timeout;
  url: string;
};

const pendingRequests = new Map<RequestKey, PendingRequest>();

/**
 * Ejecutar fetch con AbortController automático
 * Cancela requests IGUALES de la misma clave (no diferentes URLs)
 */
export const fetchWithAbort = async <T = any>(
  key: RequestKey,
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  // Cancelar request anterior SOLO si es la MISMA URL
  // (para evitar cancelar diferentes endpoints que usan la misma clave)
  const previous = pendingRequests.get(key);
  if (previous && previous.url === url) {
    previous.controller.abort();
    clearTimeout(previous.timeout);
    console.debug(`[fetchWithAbort] Aborted duplicate request: ${key}`);
  }

  const controller = new AbortController();
  const signal = controller.signal;

  // Timeout automático de 30 segundos
  const timeout = setTimeout(() => {
    controller.abort();
    pendingRequests.delete(key);
    console.warn(`[fetchWithAbort] Request timeout: ${key}`);
  }, 30000);

  try {
    pendingRequests.set(key, { controller, timeout, url });

    const response = await fetch(url, {
      ...options,
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as T;
    clearTimeout(timeout);
    pendingRequests.delete(key);
    return data;
  } catch (error) {
    clearTimeout(timeout);
    pendingRequests.delete(key);
    
    // No lanzar error si fue abortado (normal)
    if (error instanceof Error && error.name === 'AbortError') {
      console.debug(`[fetchWithAbort] Request aborted: ${key}`);
      throw new Error('Request cancelled');
    }
    
    throw error;
  }
};

/**
 * Cancelar todas las requests pending
 */
export const abortAllRequests = () => {
  pendingRequests.forEach((request) => {
    request.controller.abort();
    clearTimeout(request.timeout);
  });
  pendingRequests.clear();
  console.debug('[fetchWithAbort] All requests aborted');
};

/**
 * Obtener estadísticas de requests pending
 */
export const getPendingRequestStats = () => {
  return {
    count: pendingRequests.size,
    keys: Array.from(pendingRequests.keys()),
    requests: Array.from(pendingRequests.entries()).map(([key, req]) => ({
      key,
      url: req.url,
    })),
  };
};

