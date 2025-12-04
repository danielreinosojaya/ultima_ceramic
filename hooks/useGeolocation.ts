import { useState, useEffect, useRef } from 'react';

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

export interface UseGeolocationResult {
  coords: GeolocationCoordinates | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
}

export function useGeolocation(): UseGeolocationResult {
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalización no soportada en este navegador');
      return;
    }

    setLoading(true);
    setError(null);

    // Usar getCurrentPosition con timeout más agresivo
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords;
        console.log('[useGeolocation] Ubicación obtenida:', { latitude, longitude, accuracy });
        setCoords({ latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed });
        setLoading(false);
      },
      (err) => {
        console.error('[useGeolocation] Error:', err.code, err.message);
        let errorMsg = 'Error al obtener ubicación';
        
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            errorMsg = 'Permiso de ubicación denegado. Habilita GPS en configuración del navegador.';
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMsg = 'Ubicación no disponible. Intenta en otro lugar o acerca-te a una ventana.';
            break;
          case 3: // TIMEOUT
            errorMsg = 'Tiempo de espera excedido. Intenta de nuevo.';
            break;
        }
        
        console.error('[useGeolocation] Error message:', errorMsg);
        setError(errorMsg);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,  // Aumentado a 12 segundos
        maximumAge: 5000  // Permite usar ubicación en caché si es reciente (5s)
      }
    );
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { coords, loading, error, requestLocation };
}
