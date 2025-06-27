// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Proporciona la ruta a tu aplicación Next.js para cargar archivos next.config.js y .env en tu entorno de prueba
  dir: './',
});

// Agrega cualquier configuración personalizada de Jest que desees aquí
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Mapeo actualizado basado en estructura de Next.js app router
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@/styles/(.*)$': '<rootDir>/src/styles/$1',
    // Manejo de estilos y archivos estáticos para evitar errores en tests
    '\.(css|less|sass|scss)$': '<rootDir>/src/__mocks__/styleMock.js',
    '\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/__mocks__/fileMock.js'
  },
};

// createJestConfig se exporta de esta manera para asegurar que pageExtensions en next.config.js se analice correctamente.
module.exports = createJestConfig(customJestConfig);