import './commands';

// Prevent Cypress from failing the test on uncaught exceptions from the app.
Cypress.on('uncaught:exception', () => false);
