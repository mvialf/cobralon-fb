import { useEffect, useState } from 'react';

// Definir interfaces más completas y claras
declare global {
  interface Window {
    google?: {
      maps?: {
        places?: any;
        Map?: any;
        Marker?: any;
      }
    };
    googleMapsLoaded?: boolean;
    googleMapsLoading?: boolean;
    googleMapsError?: Error | null;
    googleMapsPromise?: Promise<void>;
    initGoogleMaps?: () => void;
    googleMapsApiKey?: string;
  }
}

/**
 * Hook para cargar la API de Google Maps una sola vez y compartir su estado
 * con todos los componentes que la necesiten.
 * 
 * @param apiKey - La clave de API de Google Maps
 * @returns Un objeto con el estado de carga y posibles errores
 */
export const useGoogleMaps = (apiKey: string) => {
  const [isLoaded, setIsLoaded] = useState(() => !!window.google?.maps?.places);
  const [isLoading, setIsLoading] = useState<boolean>(() => !!window.googleMapsLoading);
  const [error, setError] = useState<Error | null>(window.googleMapsError || null);

  useEffect(() => {
    // Si ya está cargada, actualizar estado local
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    // Si ya existe una clave de API diferente, mostrar advertencia
    if (window.googleMapsApiKey !== undefined && window.googleMapsApiKey !== apiKey) {
      console.warn(
        'Se detectaron diferentes claves de API para Google Maps. ' +
        'Se está utilizando la clave cargada anteriormente.'
      );
    }

    // Guardar la clave de API para referencia
    if (!window.googleMapsApiKey) {
      window.googleMapsApiKey = apiKey;
    }

    // Si ya existe una promesa de carga, suscribirse a ella
    if (window.googleMapsPromise) {
      setIsLoading(true);
      window.googleMapsPromise
        .then(() => {
          setIsLoaded(true);
          setIsLoading(false);
        })
        .catch(err => {
          setError(err);
          setIsLoading(false);
        });
      return;
    }

    // Si ya está cargando o cargada, solo esperar
    if (window.googleMapsLoading) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkLoaded);
          setIsLoaded(true);
        } else if (window.googleMapsError) {
          clearInterval(checkLoaded);
          setError(window.googleMapsError);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    // Crear una promesa para gestionar la carga
    window.googleMapsLoading = true;
    setIsLoading(true);
    window.googleMapsPromise = new Promise<void>((resolve, reject) => {
      // Función para limpiar recursos globales en caso de error
      const cleanup = () => {
        const script = document.getElementById('google-maps-script');
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };

      // Función de callback para cuando la API se cargue exitosamente
      window.initGoogleMaps = () => {
        window.googleMapsLoaded = true;
        window.googleMapsLoading = false;
        setIsLoading(false);
        resolve();
        // No eliminar el script porque ya está cargado correctamente
      };

      // Si ya existe un script, no crear otro
      if (document.getElementById('google-maps-script')) {
        return;
      }

      // Crear y añadir el script
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;

      // Manejar errores
      script.onerror = () => {
        cleanup();
        const mapError = new Error('Error al cargar la API de Google Maps');
        window.googleMapsError = mapError;
        window.googleMapsLoading = false;
        setIsLoading(false);
        reject(mapError);
      };

      document.head.appendChild(script);
    });

    // Suscribirse a la promesa
    window.googleMapsPromise
      .then(() => {
        setIsLoaded(true);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err);
        window.googleMapsError = err;
        setIsLoading(false);
      });

    // No es necesario limpiar porque queremos que la API se mantenga cargada
  }, [apiKey]);

  return { isLoaded, isLoading, error };
};
