/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      loginAs(email: string, password: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginAs', (email: string, password: string) => {
  const apiBase = (Cypress.env('apiUrl') as string) || '/api';
  cy.request('POST', `${apiBase}/auth/login`, { email, password })
    .its('body')
    .then((body: { token: string }) => {
      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.setItem('countdown24::token', body.token);
        },
      });
    });
});

export {};
