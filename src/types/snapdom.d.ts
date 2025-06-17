declare module '@zumer/snapdom' {
  interface SnapDOMOptions {
    /** Factor de escala para la imagen de salida. Ejemplo: 2 para 2x. */
    scale?: number;
    /** Calidad para imágenes JPEG (0-1). */
    jpegQuality?: number;
    /** Color de fondo para la imagen (ej. '#FFFFFF'). */
    background?: string;
    /** Estilos CSS en línea para aplicar al elemento raíz durante la captura. */
    style?: Record<string, string>;
    /** Ancho deseado para la imagen de salida en píxeles. */
    width?: number;
    /** Alto deseado para la imagen de salida en píxeles. */
    height?: number;
  }

  interface SnapDOMResult {
    /** El Blob de la imagen capturada. */
    blob: Blob;
    /** La URL de datos (Data URL) de la imagen capturada. */
    dataURL: string;
    /** El elemento Canvas que contiene la imagen renderizada. */
    canvas: HTMLCanvasElement;
  }

  interface SnapDOMAPI {
    /**
     * Convierte un nodo DOM a un objeto Blob.
     * @param node El nodo DOM a capturar.
     * @param options Opciones de configuración para la captura.
     * @returns Una promesa que resuelve directamente al Blob de la imagen.
     */
    toBlob(node: Node, options?: SnapDOMOptions): Promise<Blob>;

    /**
     * Convierte un nodo DOM a una Data URL.
     * @param node El nodo DOM a capturar.
     * @param options Opciones de configuración para la captura.
     * @returns Una promesa que resuelve a un string con la Data URL.
     */
    toDataURL(node: Node, options?: SnapDOMOptions): Promise<string>;
    
    /**
     * Convierte un nodo DOM a un elemento Canvas.
     * @param node El nodo DOM a capturar.
     * @param options Opciones de configuración para la captura.
     * @returns Una promesa que resuelve al elemento HTMLCanvasElement.
     */
    toCanvas(node: Node, options?: SnapDOMOptions): Promise<HTMLCanvasElement>;

    /**
     * Pre-cachea recursos (como imágenes y fuentes) dentro del nodo especificado 
     * para acelerar futuras capturas. Útil si se van a realizar múltiples capturas.
     * @param node El nodo DOM raíz para el pre-cacheo (ej. document.body).
     */
    preCache(node: Node): Promise<void>;
  }

  export const snapdom: SnapDOMAPI;
}
