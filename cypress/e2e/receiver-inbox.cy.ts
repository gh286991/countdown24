describe('Countdown24 end-to-end', () => {
  it('renders the landing page', () => {
    cy.visit('/');
    cy.contains('Countdown24 Experience').should('be.visible');
    cy.contains('立即體驗').should('be.visible');
  });

  it('allows the seeded receiver to see their inbox items', () => {
    // loginAs 已經會訪問 /receiver 並等待「我的禮物盒」出現
    cy.loginAs('receiver@example.com', 'receiverPass!123');

    // 驗證 inbox 內容
    cy.contains('Chronicles of Us', { timeout: 10000 }).should('be.visible');
    cy.contains('QR Gift Vault', { timeout: 10000 }).should('be.visible');
  });
});
