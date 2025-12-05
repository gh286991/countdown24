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
    .then((body: { token: string; user: { role: string } }) => {
      const targetPath = body.user.role === 'creator' ? '/creator' : '/receiver';
      const expectedText = body.user.role === 'creator' ? '我的倒數專案' : '我的禮物盒';
      
      // 先訪問頁面以確保可以設置 localStorage
      cy.visit(targetPath, {
        onBeforeLoad(win) {
          win.localStorage.setItem('countdown24::token', body.token);
        },
      });
      // 等待頁面載入完成（確認登入狀態）
      cy.contains(expectedText, { timeout: 30000 }).should('be.visible');
    });
});

export {};
