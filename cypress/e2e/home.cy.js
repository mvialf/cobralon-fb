describe('Pruebas de la Página Principal', () => {
  beforeEach(() => {
    // Visita la página principal antes de cada prueba
    cy.visit('http://localhost:9003');
  });

  it('Carga la página principal correctamente', () => {
    // Verifica que el título de la página contenga el nombre de la aplicación
    cy.title().should('include', 'Cobralon');
    
    // Verifica que el encabezado principal exista
    cy.get('h1').should('exist');
    
    // Verifica que haya un enlace de inicio de sesión (ajusta según tu aplicación)
    cy.get('a[href*="login"]').should('exist');
  });

  it('Muestra el contenido principal', () => {
    // Verifica que exista algún contenido principal
    // Ajusta este selector según la estructura de tu aplicación
    cy.get('main').should('exist');
  });
});
