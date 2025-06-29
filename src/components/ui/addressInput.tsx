// src/components/ui/addressInput.tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Copy, Link, CircleX } from 'lucide-react';
import { Button } from './button';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { Loader2 } from 'lucide-react';

// No redeclaramos los tipos globales ya que están definidos en useGoogleMaps.ts
// Simplemente definimos tipos para uso interno del componente
type GoogleMap = any;
type GoogleMarker = any;
type GooglePlacesAutocompleteService = any;
type GooglePlacesAutocompleteSessionToken = any;
type GooglePlacesService = any;

// Definición de Tipos
export interface FormattedAddress {
  textoCompleto: string;
  coordenadas: {
    latitude: number;
    longitude: number;
  };
  componentes: {
    calle?: string;
    numero?: string;
    comuna?: string;
    ciudad?: string;
    region?: string;
    pais?: string;
    codigoPostal?: string;
    departamento?: string; // Nuevo campo para departamento
  };
}

// Omitir las propiedades de HTMLInputElement que queremos redefinir
type OmitProps = 'value' | 'defaultValue';

interface AddressInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, OmitProps> {
  onPlaceSelected?: (place: FormattedAddress) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  value?: string | FormattedAddress;
  defaultValue?: string | FormattedAddress;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

const DEBOUNCE_DELAY = 300; // ms

export const AddressInput = React.forwardRef<HTMLInputElement, AddressInputProps>(
  (
    {
      onPlaceSelected,
      label,
      placeholder,
      className,
      value,
      defaultValue = '',
      onChange,
      ...props
    },
    forwardedRef
  ) => {
    const apiKey = process.env.NEXT_PUBLIC_Maps_API_KEY || '';
    const {
      isLoaded: isGoogleMapsLoaded,
      isLoading,
      error: googleMapsError,
    } = useGoogleMaps(apiKey);

    // Función para extraer el valor de texto
    const getTextValue = useCallback((val: string | FormattedAddress | undefined): string => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      return val.textoCompleto || '';
    }, []);

    const inputRef = useRef<HTMLInputElement | null>(null);
    const [inputValue, setInputValue] = useState(
      getTextValue(value) || getTextValue(defaultValue) || ''
    );

    // Estados internos
    const [autocomplete, setAutocomplete] = useState<any>(null);
    const [placesService, setPlacesService] = useState<any>(null);
    const [sessionToken, setSessionToken] = useState<any>(null);
    const [predictions, setPredictions] = useState<Array<any>>([]);
    const [showPredictions, setShowPredictions] = useState<boolean>(false);
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [mapRef, setMapRef] = useState<HTMLDivElement | null>(null);
    const [googleMap, setGoogleMap] = useState<any | null>(null);
    const [marker, setMarker] = useState<any | null>(null);
    const [currentCoordinates, setCurrentCoordinates] = useState<{
      lat: number;
      lng: number;
    } | null>(null);
    const [formattedAddress, setFormattedAddress] = useState<string>('');
    const [departamento, setDepartamento] = useState<string>(
      (value && typeof value === 'object' && value.componentes?.departamento) || ''
    );
    const [isCopied, setIsCopied] = useState<boolean>(false);
    const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);
    const [isError, setIsError] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const inputId = React.useId();

    // Sincronizar el valor externo con el estado interno y configurar coordenadas y mapa
    useEffect(() => {
      if (value !== undefined) {
        const newValue = getTextValue(value);
        setInputValue(newValue);

        // Si el valor es un objeto FormattedAddress completo, configurar el mapa
        if (typeof value === 'object' && value.textoCompleto) {
          setFormattedAddress(value.textoCompleto);

          if (value.coordenadas) {
            const coords = {
              lat: value.coordenadas.latitude,
              lng: value.coordenadas.longitude,
            };
            setCurrentCoordinates(coords);
            setShowMap(true);
          }
        } else if (newValue.trim()) {
          // Si es solo un texto pero no está vacío, mostrar al menos el texto
          setFormattedAddress(newValue);
          setShowMap(true);
        }
      }
    }, [value, getTextValue]);

    // Inicializar servicios de Google Maps cuando esté cargada la API
    useEffect(() => {
      if (isGoogleMapsLoaded && window.google && window.google.maps && window.google.maps.places) {
        try {
          const autocompleteService = new window.google.maps.places.AutocompleteService();
          const token = new window.google.maps.places.AutocompleteSessionToken();

          setAutocomplete(autocompleteService);
          setSessionToken(token);

          if (inputRef.current) {
            const places = new window.google.maps.places.PlacesService(inputRef.current);
            setPlacesService(places);
          }
        } catch (error) {
          console.error('Error al inicializar servicios de Google Maps:', error);
          setIsError(true);
        }
      }
    }, [isGoogleMapsLoaded]);

    // Manejar errores de carga de Google Maps
    useEffect(() => {
      if (googleMapsError) {
        console.error('Error al cargar Google Maps:', googleMapsError);
        setError('No se pudo cargar el servicio de mapas. Por favor, recarga la página.');
      }
    }, [googleMapsError]);

    // Resto de las funciones del componente (initMap, initializeAutocomplete, handleInputChange, etc.)
    // ... (mantener las implementaciones existentes)

    // Función para limpiar el input
    const handleClear = () => {
      setInputValue('');
      setPredictions([]);
      setShowPredictions(false);
      setCurrentCoordinates(null);
      setFormattedAddress('');

      // Notificar al componente padre
      if (onPlaceSelected) {
        onPlaceSelected({
          textoCompleto: '',
          coordenadas: { latitude: 0, longitude: 0 },
          componentes: {
            departamento,
          },
        });
      }

      // Enfocar el input después de limpiar
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    // Función para copiar al portapapeles
    const copyToClipboard = (text: string, isLink = false) => {
      navigator.clipboard.writeText(text).then(() => {
        if (isLink) {
          setIsLinkCopied(true);
          setTimeout(() => setIsLinkCopied(false), 2000);
        } else {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        }
      });
    };

    // Función para manejar la selección de una predicción
    const handleSelectPrediction = (placeId: string, description: string) => {
      if (placesService && sessionToken) {
        setIsSearching(true);
        setError(null);
        setShowPredictions(false);

        // Obtener detalles del lugar seleccionado
        placesService.getDetails(
          {
            placeId: placeId,
            fields: ['formatted_address', 'geometry', 'address_components'],
            sessionToken: sessionToken,
          },
          (place: any, status: any) => {
            if (
              window.google &&
              window.google.maps &&
              window.google.maps.places &&
              window.google.maps.places.PlacesServiceStatus &&
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              place
            ) {
              const location = place.geometry?.location;
              const addressComponents = place.address_components || [];

              // Extraer componentes de la dirección
              const getAddressComponent = (
                components: Array<{ types?: string[]; long_name?: string }>,
                type: string
              ): string => {
                if (!components) return '';
                const component = components.find(
                  (comp) => comp.types && comp.types.includes(type)
                );
                return component ? component.long_name || '' : '';
              };

              const componentes: Record<string, string> = {
                calle: getAddressComponent(addressComponents, 'route'),
                numero: getAddressComponent(addressComponents, 'street_number'),
                comuna: getAddressComponent(addressComponents, 'sublocality'),
                ciudad: getAddressComponent(addressComponents, 'locality'),
                region: getAddressComponent(addressComponents, 'administrative_area_level_1'),
                pais: getAddressComponent(addressComponents, 'country'),
                codigoPostal: getAddressComponent(addressComponents, 'postal_code'),
                departamento: departamento || '',
              };

              const formattedAddress = place.formatted_address || description;
              const coordinates = location
                ? {
                    latitude: location.lat(),
                    longitude: location.lng(),
                  }
                : { latitude: 0, longitude: 0 };

              setFormattedAddress(formattedAddress);
              setCurrentCoordinates({ lat: coordinates.latitude, lng: coordinates.longitude });

              // Crear el objeto de dirección completo
              const direccionCompleta = {
                textoCompleto: formattedAddress,
                coordenadas: coordinates,
                componentes: componentes,
              };

              // Notificar al componente padre
              if (onPlaceSelected) {
                onPlaceSelected(direccionCompleta);
              }

              // Mostrar el mapa
              setShowMap(true);
            } else {
              setPredictions([]);
              setShowPredictions(false);
            }
            setIsSearching(false);
          }
        );
      }
    };

    // Función para manejar cambios en el input con debounce
    const debounceTimer = useRef<number | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      // Notificar al componente padre
      if (onChange) {
        onChange(e);
      }

      // Limpiar predicciones si el texto es muy corto
      if (value.trim().length < 3) {
        setPredictions([]);
        setShowPredictions(false);
        return;
      }

      // Usar debounce para evitar demasiadas llamadas a la API
      const handleSearch = (value: string) => {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }

        if (value.trim().length < 3) {
          setPredictions([]);
          setShowPredictions(false);
          return;
        }

        debounceTimer.current = window.setTimeout(() => {
          if (autocomplete && sessionToken && value.trim().length >= 3) {
            autocomplete.getPlacePredictions(
              {
                input: value,
                sessionToken: sessionToken,
              },
              (predictions: any, status: any) => {
                if (
                  window.google &&
                  window.google.maps &&
                  window.google.maps.places &&
                  window.google.maps.places.PlacesServiceStatus &&
                  status === window.google.maps.places.PlacesServiceStatus.OK &&
                  predictions
                ) {
                  setPredictions(predictions);
                  setShowPredictions(true);
                } else {
                  setPredictions([]);
                  setShowPredictions(false);
                }
              }
            );
          }
        }, DEBOUNCE_DELAY);
      };

      handleSearch(value);
    };

    // Limpiar el timer al desmontar
    useEffect(() => {
      return () => {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
      };
    }, []);

    // Renderizado del componente
    return (
      <div className={cn('grid w-full items-center gap-1.5 relative', className)}>
        {label && (
          <Label htmlFor={inputId}>
            {label}
          </Label>
        )}
        <div className='relative flex gap-2'>
          <div className='flex-1'>
            <Input
              id={inputId}
              ref={(node) => {
                inputRef.current = node;
                if (forwardedRef) {
                  if (typeof forwardedRef === 'function') {
                    forwardedRef(node);
                  } else {
                    forwardedRef.current = node;
                  }
                }
              }}
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => {
                setIsInputFocused(true);
                if (inputValue.length >= 3 && predictions.length > 0) {
                  setShowPredictions(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setIsInputFocused(false), 200);
              }}
              placeholder={placeholder || 'Buscar dirección...'}
              className={cn('w-full', className)}
              disabled={props.disabled}
              required={props.required}
              name={props.name}
              autoComplete={props.autoComplete}
            />
          </div>
          <div className='w-24'>
            <Input
              type='text'
              placeholder='Depto'
              value={departamento}
              onChange={(e) => {
                const newDepto = e.target.value;
                setDepartamento(newDepto);
                if (onPlaceSelected && value && typeof value === 'object') {
                  onPlaceSelected({
                    ...value,
                    componentes: {
                      ...value.componentes,
                      departamento: newDepto,
                    },
                  });
                }
              }}
              className='w-full'
            />
          </div>
          {inputValue && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0 text-primary hover:text-primary/80 transition-colors'
              onClick={handleClear}
            >
              <CircleX className='h-5 w-5' />
              <span className='sr-only'>Limpiar dirección</span>
            </Button>
          )}
        </div>

        {/* Mostrar predicciones */}
        {showPredictions && predictions.length > 0 && isInputFocused && (
          <div className='absolute z-[100] w-full top-full left-0 mt-1 bg-card text-card-foreground border border-border rounded-md shadow-lg max-h-60 overflow-auto'>
            {predictions.map((prediction) => (
              <div
                key={prediction.place_id}
                className='px-4 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors'
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectPrediction(prediction.place_id, prediction.description);
                }}
              >
                {prediction.description}
              </div>
            ))}
          </div>
        )}

        {/* Mostrar mapa después de seleccionar una dirección */}
        {showMap && currentCoordinates && (
          <div className='mt-4 border rounded-md overflow-hidden'>
            <div
              ref={(node) => {
                if (node && window.google && window.google.maps && (!mapRef || !googleMap)) {
                  // Permitir reinicialización
                  setMapRef(node);
                  // Inicializar el mapa
                  try {
                    if (
                      typeof window.google.maps.Map === 'function' &&
                      typeof window.google.maps.Marker === 'function'
                    ) {
                      const map = new window.google.maps.Map(node, {
                        center: currentCoordinates,
                        zoom: 16,
                        disableDefaultUI: true,
                        zoomControl: true,
                      });

                      // Agregar marcador
                      const newMarker = new window.google.maps.Marker({
                        position: currentCoordinates,
                        map: map,
                        title: formattedAddress,
                      });

                      setGoogleMap(map);
                      setMarker(newMarker);
                    }
                  } catch (err) {
                    console.error('Error al inicializar el mapa:', err);
                    setError('No se pudo cargar el mapa. Por favor, recarga la página.');
                  }
                }
              }}
              className='w-full h-48 bg-gray-100'
            />
            <div className='p-3 bg-white border-t border-gray-200 flex justify-between items-center'>
              <div className='truncate flex-1'>
                <p className='text-sm font-medium text-gray-900 truncate'>{formattedAddress}</p>
                {currentCoordinates && (
                  <p className='text-xs text-gray-500 truncate'>
                    {currentCoordinates.lat.toFixed(6)}, {currentCoordinates.lng.toFixed(6)}
                  </p>
                )}
              </div>
              <div className='flex space-x-2 ml-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-8 px-2 text-xs'
                  onClick={() => copyToClipboard(formattedAddress, false)}
                >
                  {isCopied ? '¡Copiado!' : <Copy className='h-3.5 w-3.5' />}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-8 px-2 text-xs'
                  onClick={() => {
                    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formattedAddress)}&query_place_id=${encodeURIComponent(`${currentCoordinates.lat},${currentCoordinates.lng}`)}`;
                    copyToClipboard(url, true);
                  }}
                >
                  {isLinkCopied ? '¡Enlace copiado!' : <Link className='h-3.5 w-3.5' />}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className='relative w-full'>
          {(isLoading || isSearching) && (
            <div className='absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin' />
            </div>
          )}
        </div>

        {/* Mostrar errores */}
        {error && <div className='mt-2 text-sm text-red-600'>{error}</div>}
      </div>
    );
  }
);

AddressInput.displayName = 'AddressInput';
