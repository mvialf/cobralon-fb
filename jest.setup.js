// jest.setup.js
import '@testing-library/jest-dom';

// Extensión global para los tipos de Jest Dom
// Esto añade compatibilidad para todos los matchers como toHaveClass, toBeInTheDocument, etc.
import '@testing-library/jest-dom/extend-expect';

// Configuraciones globales para las pruebas
// Mock de funciones que pueden no estar disponibles en el entorno de prueba
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Obsoleto
    removeListener: jest.fn(), // Obsoleto
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock para la función de IntersectionObserver si se usa en la aplicación
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  disconnect() {
    return null;
  }
  observe() {
    return null;
  }
  takeRecords() {
    return [];
  }
  unobserve() {
    return null;
  }
};