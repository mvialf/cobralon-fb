/**
 * Normaliza un texto para búsqueda, eliminando acentos, signos de puntuación
 * y normalizando espacios.
 * 
 * @param text - Texto a normalizar
 * @returns Texto normalizado para búsqueda
 */
export const normalizeSearchText = (text: string): string => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    // Eliminar acentos
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // Eliminar signos de puntuación y caracteres especiales
    .replace(/[.,/#!$%\^&\*;:{}=\-_`~()¿?¡!\[\]"']/g, '')
    // Normalizar espacios múltiples a uno solo
    .replace(/\s+/g, ' ')
    // Eliminar espacios al inicio y final
    .trim();
};

/**
 * Función de filtro para componentes Command de shadcn/ui que soporta
 * búsqueda insensible a acentos y signos de puntuación.
 */
export const commandFilter = (value: string, search: string): number => {
  const normalizedSearch = normalizeSearchText(search);
  const normalizedValue = normalizeSearchText(value);
  return normalizedValue.includes(normalizedSearch) ? 1 : 0;
};
