// src/components/ui/addressInput.tsx
"use client";

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Copy, Link } from "lucide-react";
import { Button } from './button'; // Asegúrate de que esta ruta sea correcta

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
  };
}

interface AddressInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onPlaceSelected: (address: FormattedAddress) => void;
  label?: string;
  placeholder?: string;
  // Pasamos cualquier clase adicional que queramos añadir
  className?: string; 
}

// Usamos export nombrado para que coincida con la estructura de shadcn/ui
export const AddressInput = React.forwardRef<HTMLInputElement, AddressInputProps>(
  ({ onPlaceSelected, label, placeholder, className, defaultValue = '', ...props }, forwardedRef) => {
    // Convertimos defaultValue a string para asegurarnos que es un string válido
    const initialValue = String(defaultValue || '');
    const apiKey = process.env.NEXT_PUBLIC_Maps_API_KEY;
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [inputValue, setInputValue] = useState(initialValue);
    const [autocomplete, setAutocomplete] = useState<google.maps.places.AutocompleteService | null>(null);
    const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [showPredictions, setShowPredictions] = useState(false);
    const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [mapRef, setMapRef] = useState<HTMLDivElement | null>(null);
    const [googleMap, setGoogleMap] = useState<google.maps.Map | null>(null);
    const [marker, setMarker] = useState<google.maps.Marker | null>(null);
    const [currentCoordinates, setCurrentCoordinates] = useState<{lat: number, lng: number} | null>(null);
    const [formattedAddress, setFormattedAddress] = useState<string>('');
    const [isCopied, setIsCopied] = useState<boolean>(false);
    const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);

    const inputId = React.useId();
    
    // Manejar el ref forwarded
    useEffect(() => {
      if (forwardedRef) {
        if (typeof forwardedRef === 'function') {
          forwardedRef(inputRef.current);
        } else {
          forwardedRef.current = inputRef.current;
        }
      }
    }, [forwardedRef]);

    // Mostrar mensaje de error si no hay API key
    if (!apiKey) {
      console.error("La clave de API de Google Maps no está configurada.");
      return (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Error de configuración: Falta la clave de API de Google Maps.
        </div>
      );
    }

    // Cargar el script de Google Maps API
    useEffect(() => {
      if (window.google?.maps?.places) {
        initializeAutocomplete();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=Function.prototype&v=beta`;
      script.async = true;
      script.defer = true;
      script.onload = () => initializeAutocomplete();
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }, [apiKey]);
    
    // Inicializar el mapa cuando tenemos referencia al div y coordenadas válidas
    const initMap = (lat: number, lng: number) => {
      if (!mapRef || !window.google?.maps) {
        console.warn('No se puede inicializar el mapa - referencia al div o Google Maps no disponible');
        return;
      }
      
      // Verificar el tamaño del div del mapa
      console.log('Inicializando mapa en div con dimensiones:', mapRef.offsetWidth, 'x', mapRef.offsetHeight);
      
      // Si ya existe un mapa, solo actualizamos la posición del marcador
      if (googleMap && marker) {
        marker.setPosition(new window.google.maps.LatLng(lat, lng));
        googleMap.setCenter(new window.google.maps.LatLng(lat, lng));
        return;
      }
      
      // Crear un nuevo mapa
      const mapOptions: google.maps.MapOptions = {
        center: { lat, lng },
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        scrollwheel: false,
        mapId: 'DEMO_MAP_ID', // Opcional: usar un estilo personalizado si tienes uno configurado
      };
      
      try {
        console.log('Creando nuevo mapa en:', mapRef);
        const map = new window.google.maps.Map(mapRef, mapOptions);
        setGoogleMap(map);
        
        // Añadir marcador en la ubicación
        const newMarker = new window.google.maps.Marker({
          position: { lat, lng },
          map: map,
          animation: window.google.maps.Animation.DROP,
          title: 'Ubicación seleccionada',
        });
        
        setMarker(newMarker);
        
        // Forzar una actualización del tamaño del mapa después de un momento
        setTimeout(() => {
          window.google.maps.event.trigger(map, 'resize');
          map.setCenter(new window.google.maps.LatLng(lat, lng));
        }, 300);
      } catch (error) {
        console.error('Error al crear el mapa:', error);
      }
    };

    // Inicializar servicios de Places
    const initializeAutocomplete = () => {
      try {
        if (!window.google?.maps?.places) {
          console.warn('Google Maps Places API no está disponible');
          return false;
        }

        // Inicializar servicios
        const autocompleteService = new window.google.maps.places.AutocompleteService();
        const newSessionToken = new window.google.maps.places.AutocompleteSessionToken();
        
        // Crear un elemento para el servicio de Places
        const placesDiv = document.createElement('div');
        const placesService = new window.google.maps.places.PlacesService(placesDiv);
        
        // Actualizar estados
        setAutocomplete(autocompleteService);
        setSessionToken(newSessionToken);
        setPlacesService(placesService);
        
        console.log('Servicio de autocompletado inicializado correctamente');
        return true;
      } catch (error) {
        console.error('Error al inicializar el servicio de autocompletado:', error);
        return false;
      }
    };

    // Buscar predicciones cuando el usuario escribe
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      // Limpiar predicciones si el input está vacío o es muy corto
      // Usamos trim() solo para la validación de longitud, no para el valor mostrado
      if (value.trim().length < 3) {
        setPredictions([]);
        setShowPredictions(false);
        return;
      }

      // Si no tenemos los servicios necesarios, intentar inicializarlos
      if (!autocomplete || !sessionToken) {
        console.warn('Servicio de autocompletado no inicializado');
        initializeAutocomplete();
        return;
      }

      // Verificar si el valor contiene un número: asumimos que es una dirección con número específico
      const containsNumber = /\d/.test(value);
      
      // Configuración de la búsqueda
      const request = {
        input: value,
        sessionToken: sessionToken,
        componentRestrictions: { country: 'cl' },
        types: ['address'],
        location: new window.google.maps.LatLng(-33.4489, -70.6693), // Santiago de Chile
        radius: 50000, // 50km de radio
      };

      // Realizar la búsqueda
      autocomplete.getPlacePredictions(
        request,
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            // Filtrar resultados según si el usuario está buscando con número o no
            let filteredResults = results;
            
            if (containsNumber) {
              // Si la consulta tiene un número, sólo mostrar resultados que contengan números
              filteredResults = results.filter(result => /\d/.test(result.description));
              
              // Si no hay resultados con números, mostrar todos los resultados
              if (filteredResults.length === 0) {
                filteredResults = results;
              }
            }
            
            // Eliminar duplicados
            const uniqueResults = filteredResults.filter(
              (result, index, self) => 
                index === self.findIndex(r => r.description === result.description)
            );
            
            // Ordenar: primero los resultados con número, luego alfabéticamente
            const sortedResults = [...uniqueResults].sort((a, b) => {
              // Si la consulta contiene números, priorizar coincidencias exactas
              if (containsNumber) {
                // Extraer números de las descripciones
                const numbersInQuery = value.match(/\d+/g) || [];
                const aContainsQueryNumbers = numbersInQuery.some(num => a.description.includes(num));
                const bContainsQueryNumbers = numbersInQuery.some(num => b.description.includes(num));
                
                // Si uno contiene los números de la consulta y otro no
                if (aContainsQueryNumbers !== bContainsQueryNumbers) {
                  return aContainsQueryNumbers ? -1 : 1;
                }
              }
              
              // Secundariamente, priorizar por si tiene número o no
              const aHasNumber = /\d/.test(a.description) ? 1 : 0;
              const bHasNumber = /\d/.test(b.description) ? 1 : 0;
              if (aHasNumber !== bHasNumber) {
                return bHasNumber - aHasNumber;
              }
              
              // Finalmente, ordenar alfabéticamente
              return a.description.localeCompare(b.description);
            });
            
            setPredictions(sortedResults);
            setShowPredictions(sortedResults.length > 0);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setPredictions([]);
            setShowPredictions(false);
          } else {
            console.error('Error en el servicio de autocompletado:', status);
            setPredictions([]);
            setShowPredictions(false);
          }
        }
      );
    };

    // Obtener detalles de un lugar seleccionado
    const handleSelectPlace = (placeId: string) => {
      if (!placesService || !sessionToken) return;
      
      // Mostrar indicador de carga
      const originalValue = inputValue;
      setInputValue('Cargando dirección...');

      // Campos que necesitamos de la API de Google Places
      const fields = [
        'address_component',
        'formatted_address',
        'geometry',
        'name',
        'formatted_phone_number',
        'url',
        'place_id'
      ];

      placesService.getDetails(
        {
          placeId: placeId,
          fields: fields,
          sessionToken: sessionToken,
        },
        (place, status) => {
          // Restaurar el valor del input en caso de error
          if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
            setInputValue(originalValue);
            console.error('Error al obtener detalles del lugar:', status);
            return;
          }
          
          // Actualizar el valor del input con la dirección formateada
          const displayAddress = place.formatted_address || place.name || originalValue;
          setInputValue(displayAddress);
          setShowPredictions(false);
          
          // Generar un nuevo token de sesión para la próxima búsqueda
          if (window.google?.maps?.places) {
            setSessionToken(new window.google.maps.places.AutocompleteSessionToken());
          }
          
          // Procesar la dirección seleccionada
          processSelectedPlace(place);
        }
      );
    };

    // Función para copiar coordenadas al portapapeles
    const copyCoordinates = () => {
      if (!currentCoordinates) return;
      
      const coordText = `${currentCoordinates.lat}, ${currentCoordinates.lng}`;
      navigator.clipboard.writeText(coordText).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }).catch(err => {
        console.error('Error al copiar coordenadas:', err);
      });
    };
    
    // Función para copiar enlace de Google Maps
    const copyMapLink = () => {
      if (!currentCoordinates) return;
      
      // Usar el formato universal de Google Maps que funciona tanto en móviles como en escritorio
      // Este formato abre directamente la ubicación en Google Maps
      const mapUrl = `https://www.google.com/maps/place/${currentCoordinates.lat},${currentCoordinates.lng}`;
      
      navigator.clipboard.writeText(mapUrl).then(() => {
        setIsLinkCopied(true);
        setTimeout(() => setIsLinkCopied(false), 2000);
      }).catch(err => {
        console.error('Error al copiar enlace de mapa:', err);
      });
    };
    
    // Procesar la dirección seleccionada
    const processSelectedPlace = (place: google.maps.places.PlaceResult) => {
      if (!place?.geometry?.location || !place.address_components) {
        console.warn("Objeto 'place' inválido recibido de la API de Google.");
        return;
      }

      // Extraer componentes de la dirección
      const getAddressComponent = (types: string[]) => {
        const component = place.address_components?.find(c => 
          types.some(type => c.types.includes(type))
        );
        return component?.long_name || '';
      };

      // Construir la dirección de manera más robusta
      const calle = getAddressComponent(['route']);
      const numero = getAddressComponent(['street_number']);
      const comuna = getAddressComponent(['sublocality_level_1', 'sublocality', 'administrative_area_level_3']);
      const ciudad = getAddressComponent(['locality', 'administrative_area_level_2']);
      const region = getAddressComponent(['administrative_area_level_1']);
      const pais = getAddressComponent(['country']);
      const codigoPostal = getAddressComponent(['postal_code']);

      // Construir dirección formateada
      const direccionPiezas = [];
      if (calle) direccionPiezas.push(calle);
      if (numero) direccionPiezas.push(numero);
      const direccionCalleNumero = direccionPiezas.join(' ');
      
      const direccionCompleta = [
        direccionCalleNumero,
        comuna,
        ciudad,
        region,
        pais
      ].filter(Boolean).join(', ');
      
      // Guardar la dirección formateada para mostrarla debajo del mapa
      const direccionFinal = place.formatted_address || direccionCompleta;
      setFormattedAddress(direccionFinal);

      const componentes: FormattedAddress['componentes'] = {
        calle: direccionCalleNumero || undefined,
        numero: numero || undefined,
        comuna: comuna || undefined,
        ciudad: ciudad || undefined,
        region: region || undefined,
        pais: pais || undefined,
        codigoPostal: codigoPostal || undefined,
      };

      // Obtener coordenadas para el mapa
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      
      // Actualizar el mapa si tenemos coordenadas válidas
      if (lat && lng) {
        // Guardar las coordenadas actuales en el estado para que el efecto las use
        setCurrentCoordinates({ lat, lng });
        // Mostrar el mapa
        setShowMap(true);
      }

      onPlaceSelected({
        textoCompleto: direccionFinal,
        coordenadas: {
          latitude: lat,
          longitude: lng,
        },
        componentes,
      });
    };

    // Función para limpiar el campo de dirección
    const handleClear = () => {
      setInputValue('');
      setPredictions([]);
      setShowPredictions(false);
      setShowMap(false);
      
      // Limpiar el mapa
      if (marker) {
        marker.setMap(null);
        setMarker(null);
      }
      
      onPlaceSelected({
        textoCompleto: '',
        coordenadas: { latitude: 0, longitude: 0 },
        componentes: {}
      });
      
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    // Manejar clic fuera del componente
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
          setShowPredictions(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    // Efecto para inicializar y renderizar el mapa cuando cambia showMap y tenemos mapRef disponible
    useEffect(() => {
      // Solo inicializar si el mapa es visible y tenemos coordenadas
      if (showMap && mapRef && currentCoordinates && window.google?.maps) {
        console.log('Inicializando mapa con coordenadas:', currentCoordinates);
        
        // Dar tiempo al DOM para renderizar completamente antes de inicializar el mapa
        const timer = setTimeout(() => {
          initMap(currentCoordinates.lat, currentCoordinates.lng);
          
          // Reforzar la renderización del mapa después de un tiempo adicional
          setTimeout(() => {
            if (googleMap) {
              console.log('Forzando actualización del mapa');
              window.google.maps.event.trigger(googleMap, 'resize');
              googleMap.setCenter(new window.google.maps.LatLng(currentCoordinates.lat, currentCoordinates.lng));
            }
          }, 500);
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }, [showMap, mapRef, currentCoordinates]);

    return (
      <div className={cn("grid w-full items-center gap-1.5 relative", className)}>
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <div className="relative">
          <Input
            id={inputId}
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => {
              setIsInputFocused(true);
              if (inputValue.length >= 3 && predictions.length > 0) {
                setShowPredictions(true);
              }
            }}
            onBlur={() => {
              // Pequeño retraso para permitir la selección de una predicción
              setTimeout(() => setIsInputFocused(false), 200);
            }}
            className="w-full pr-10"
            placeholder={placeholder || 'Comienza a escribir una dirección...'}
            {...props}
          />
          {inputValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Limpiar dirección</span>
            </Button>
          )}
        </div>
        
        {showPredictions && predictions.length > 0 && (
          <div 
            className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground shadow-md rounded-md border border-border overflow-hidden"
            style={{
              top: '100%',
              left: 0,
              maxHeight: '240px',
              overflowY: 'auto'
            }}
          >
            <ul>
              {predictions.map((prediction) => (
                <li 
                  key={prediction.place_id}
                  className="px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Evitar que el input pierda el foco
                    handleSelectPlace(prediction.place_id);
                  }}
                >
                  {prediction.description}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Visualización del mapa cuando hay una dirección seleccionada */}
        {showMap && (
          <div className="mt-3 rounded-md border border-border overflow-hidden">
            {/* Contenedor del mapa */}
            <div 
              ref={setMapRef}
              className="h-[200px] w-full bg-muted"
              aria-label="Mapa con la ubicación seleccionada"
            ></div>
            
            {/* Detalles de la ubicación seleccionada */}
            <div className="bg-background p-3 text-sm border-t border-border">
              {/* Dirección formateada */}
              <div className="mb-2">
                <div className="text-xs text-muted-foreground mb-1">Dirección completa:</div>
                <div className="text-foreground font-medium line-clamp-2">{formattedAddress}</div>
              </div>
              
              {/* Coordenadas con botón para copiar */}
              {currentCoordinates && (
                <div className="flex flex-col space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Coordenadas:</div>
                      <div className="text-foreground font-mono text-xs">
                        {currentCoordinates.lat.toFixed(6)}, {currentCoordinates.lng.toFixed(6)}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={copyCoordinates}
                    >
                      {isCopied ? 'Copiado!' : <><Copy className="h-3.5 w-3.5 mr-1" /> Copiar coordenadas</>}
                    </Button>
                  </div>
                  
                  {/* Botón para compartir/copiar enlace */}
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Compartir ubicación:</div>
                      <div className="text-foreground text-xs">Copiar enlace de Google Maps</div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={copyMapLink}
                      >
                        {isLinkCopied ? 'Enlace copiado!' : <><Link className="h-3.5 w-3.5 mr-1" /> Copiar enlace</>}
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs"
                        onClick={() => setShowMap(false)}
                      >
                        Ocultar mapa
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

AddressInput.displayName = "AddressInput";
