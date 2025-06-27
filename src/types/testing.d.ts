// Archivo de definición para tipos relacionados con testing
// Este archivo extiende las definiciones de Jest para incluir los matchers de Jest-DOM

import '@testing-library/jest-dom';

// Extensión global para tipos de Jest y Testing Library
declare global {
  // Agrega los tipos para los matchers personalizados de Jest-DOM
  namespace jest {
    interface Matchers<R, T> {
      // Matchers de Jest-DOM que estamos utilizando
      toHaveTextContent(text: string | RegExp): R;
      toHaveClass(...classNames: string[]): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeInTheDocument(): R;
      toBeVisible(): R;
      toBeChecked(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveValue(value: string | string[] | number): R;
      toBeRequired(): R;
      toBeValid(): R;
      toBeInvalid(): R;
      toHaveStyle(css: string): R;
      toHaveFocus(): R;
      toContainHTML(html: string): R;
      toContainElement(element: HTMLElement | null): R;
    }
  }
}
