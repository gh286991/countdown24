describe('Countdown24 end-to-end', () => {
  it('renders the landing page', () => {
    cy.visit('/');
    cy.contains('Countdown24 Experience').should('be.visible');
    cy.contains('立即體驗').should('be.visible');
  });

  it('allows the seeded receiver to see their inbox items', () => {
    cy.loginAs('receiver@example.com', 'receiverPass!123');

    cy.visit('/receiver');
    cy.contains('我的禮物盒').should('be.visible');
    cy.contains('Chronicles of Us').should('be.visible');
    cy.contains('QR Gift Vault').should('be.visible');
  });
});
