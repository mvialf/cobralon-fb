import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Importación explícita de las extensiones de Jest-DOM para añadir los matchers personalizados
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';
import { Button, buttonVariants } from '@/components/ui/button';

describe('Button', () => {
  it('renderiza correctamente con el texto proporcionado', () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Test Button');
  });

  it('aplica la variante primaria por defecto', () => {
    const { container } = render(<Button>Test Button</Button>);
    // La clase bg-primary está en la variante default según el componente real
    expect(container.firstChild).toHaveClass('bg-primary');
  });

  it('aplica correctamente la variante destructive', () => {
    const { container } = render(<Button variant="destructive">Destructive Button</Button>);
    expect(container.firstChild).toHaveClass('bg-destructive');
  });

  it('aplica correctamente la variante outline', () => {
    const { container } = render(<Button variant="outline">Outline Button</Button>);
    expect(container.firstChild).toHaveClass('border-input');
    expect(container.firstChild).toHaveClass('bg-background');
  });

  it('aplica correctamente la variante secondary', () => {
    const { container } = render(<Button variant="secondary">Secondary Button</Button>);
    expect(container.firstChild).toHaveClass('bg-secondary');
  });

  it('aplica correctamente el tamaño sm', () => {
    const { container } = render(<Button size="sm">Small Button</Button>);
    expect(container.firstChild).toHaveClass('h-9');
  });

  it('aplica correctamente el tamaño lg', () => {
    const { container } = render(<Button size="lg">Large Button</Button>);
    expect(container.firstChild).toHaveClass('h-11');
  });

  it('aplica correctamente el tamaño icon', () => {
    const { container } = render(<Button size="icon">Icon</Button>);
    expect(container.firstChild).toHaveClass('p-2');
  });

  it('se puede deshabilitar', () => {
    render(<Button disabled>Test Button</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    // Verifica también la clase de opacidad para elementos deshabilitados
    expect(screen.getByRole('button')).toHaveClass('disabled:opacity-50');
  });

  it('renderiza un Slot cuando asChild es true', () => {
    render(
      <Button asChild>
        <a href="#">Link Button</a>
      </Button>
    );
    expect(screen.getByRole('link')).toBeInTheDocument();
    // El botón no debería existir cuando se renderiza como otro elemento
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('permite pasar una className personalizada', () => {
    const { container } = render(<Button className="mi-clase-personalizada">Custom Button</Button>);
    expect(container.firstChild).toHaveClass('mi-clase-personalizada');
    // Debe mantener también las clases por defecto
    expect(container.firstChild).toHaveClass('bg-primary');
  });
});
