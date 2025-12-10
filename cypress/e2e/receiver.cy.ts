const RECEIVER_EMAIL = 'receiver@example.com';
const RECEIVER_PASSWORD = 'receiverPass!123';

describe('Receiver flows', () => {
  beforeEach(() => {
    cy.viewport(1280, 900);
    cy.loginAs(RECEIVER_EMAIL, RECEIVER_PASSWORD);
  });

  it('shows inbox items and opens the experience page', () => {
    cy.contains('Chronicles of Us', { timeout: 20000 }).should('be.visible');
    cy.contains('QR Gift Vault').should('be.visible');

    cy.contains('Chronicles of Us').click();
    cy.url().should('include', '/receiver/experience/');
    cy.contains('掃描禮品卡解鎖', { timeout: 20000 }).should('be.visible');
  });

  it('shows locked-day dialog when clicking an unopened card', () => {
    // 先訪問 inbox 確保狀態正確
    cy.visit('/receiver');
    cy.contains('Chronicles of Us', { timeout: 20000 }).should('be.visible');
    
    // 點擊進入體驗頁面
    cy.contains('Chronicles of Us').click();
    cy.url().should('include', '/receiver/experience/');
    
    // 等待頁面完全載入
    cy.contains('掃描禮品卡解鎖', { timeout: 20000 }).should('be.visible');
    
    // 等待卡片列表載入完成
    cy.get('button[class*="rounded-2xl"]', { timeout: 10000 })
      .should('have.length.greaterThan', 0);
    
    // 等待一下讓卡片完全渲染
    cy.wait(1000);
    
    // 直接找到第一個被鎖定的卡片（有 cursor-not-allowed 類別的按鈕）
    cy.get('button.cursor-not-allowed', { timeout: 5000 })
      .first()
      .should('be.visible')
      .click();
    
    // 等待鎖定對話框出現
    cy.contains('請先掃描禮品卡或輸入解鎖碼', { timeout: 10000 }).should('be.visible');
    cy.contains('好的，我再等等').click();
    
    // 確認對話框已關閉
    cy.contains('請先掃描禮品卡或輸入解鎖碼').should('not.exist');
  });

  it('filters the gift library and toggles tabs', () => {
    cy.visit('/receiver/library');
    cy.contains('禮品卡 / 兌換卷列表', { timeout: 20000 }).should('be.visible');

    // 等待搜尋框出現
    cy.get('input[placeholder="輸入標題或專案名稱..."]', { timeout: 10000 }).should('be.visible');
    
    // 測試搜尋功能
    cy.get('input[placeholder="輸入標題或專案名稱..."]').type('Latte');
    cy.contains('Latte on me', { timeout: 10000 }).should('be.visible');
    cy.contains('Arcade night').should('not.exist');

    // 清除搜尋框
    cy.get('input[placeholder="輸入標題或專案名稱..."]').clear();
    
    // 點擊「兌換卷」標籤
    cy.contains('button', '兌換卷').click();
    
    // 等待標籤切換完成並檢查空狀態
    cy.contains('目前沒有兌換卷或符合搜尋的項目。', { timeout: 10000 }).should('be.visible');
  });
});
