describe('Feature: Landing Page', () => {
  it('顯示倒數體驗的招牌內容', () => {
    cy.visit('/');
    cy.contains('Countdown24 Experience').should('be.visible');
    cy.contains('立即體驗').should('be.visible');
    cy.contains('行銷色塊').should('be.visible');
  });
});
