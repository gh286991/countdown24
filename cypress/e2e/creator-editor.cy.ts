const CREATOR_EMAIL = 'creator@example.com';
const CREATOR_PASSWORD = 'creatorPass!123';
const STORY_COUNTDOWN_TITLE = 'Chronicles of Us';

function openCountdownEditorFromDashboard(day = 1) {
  // 點擊指定的 countdown 卡片進入編輯器
  cy.contains(STORY_COUNTDOWN_TITLE, { timeout: 20000 })
    .scrollIntoView()
    .click();
  
  // 等待編輯器載入
  cy.contains('編輯 Day', { timeout: 30000 }).should('be.visible');
  
  // 如果不是 day 1，切換到指定的 day
  if (day !== 1) {
    switchDay(day);
  }
}

function openCountdownEditor(day = 1) {
  // 重新訪問 Dashboard 確保狀態乾淨
  cy.visit('/creator');
  cy.contains('我的倒數專案', { timeout: 30000 }).should('be.visible');
  
  openCountdownEditorFromDashboard(day);
}

function switchDay(day: number) {
  const dayRegex = new RegExp(`Day\\s+${day}(?!\\d)`);
  cy.contains('button', dayRegex, { timeout: 20000 })
    .scrollIntoView()
    .click();
  cy.contains(`編輯 Day ${day}`, { timeout: 20000 })
    .scrollIntoView()
    .should('be.visible');
}

describe('創作者編輯頁面', () => {
  beforeEach(() => {
    cy.viewport(1440, 900);
    // loginAs 會登入並訪問 /creator，等待 Dashboard 載入完成
    cy.loginAs(CREATOR_EMAIL, CREATOR_PASSWORD);
  });

  it('更新 Day 1 標題與描述可成功儲存', () => {
    // 第一次從已載入的 Dashboard 進入
    openCountdownEditorFromDashboard();

    const title = `Cypress Day 1 ${Date.now()}`;
    const description = 'Cypress 自動化更新的敘述文字';
    const coverTitle = `Cypress Cover ${Date.now()}`;

    cy.get('input[placeholder="例：Day 1 的故事開始"]').clear().type(title);
    cy.get('textarea[placeholder="簡短描述這一天的內容"]').clear().type(description);
    cy.contains('button', '儲存 Day 1 小卡').click();
    cy.contains('已儲存 Day 1 設定', { timeout: 10000 }).should('exist');

    // 重新載入頁面驗證儲存結果
    openCountdownEditor();
    cy.get('input[placeholder="例：Day 1 的故事開始"]').should('have.value', title);
    cy.get('textarea[placeholder="簡短描述這一天的內容"]').should('have.value', description);

    cy.get('input[placeholder="標題 (例: DAY 1 / 24)"]').clear().type(coverTitle);
    cy.contains('button', '儲存 Day 1 小卡').click();
    cy.contains('已儲存 Day 1 設定', { timeout: 10000 }).should('exist');

    openCountdownEditor();
    cy.get('input[placeholder="標題 (例: DAY 1 / 24)"]').should('have.value', coverTitle);
  });

  // 注意：此測試需要 MinIO 服務正確設定並運行
  it('透過 MinIO 上傳 CG 封面並顯示預覽', { retries: 2 }, () => {
    openCountdownEditorFromDashboard();

    cy.get('input[placeholder="🖼️ 封面圖片網址"]')
      .first()
      .should('exist')
      .parent()
      .within(() => {
        cy.contains('button', '上傳').click();
        cy.get('input[type="file"]').selectFile('cypress/fixtures/cg-upload.png', { force: true });
      });

    cy.contains('調整素材', { timeout: 10000 }).should('be.visible');
    
    // 等待 canvas 元素出現（圖片載入完成後才會渲染 canvas）
    // 使用 exist 因為 canvas 可能被裁切覆蓋層擋住
    cy.get('canvas.cursor-crosshair', { timeout: 30000 }).should('exist');
    
    // 等待一下讓圖片完全載入
    cy.wait(1000);
    
    // 點擊「套用並上傳」按鈕
    cy.contains('button', '套用並上傳', { timeout: 15000 })
      .should('not.be.disabled')
      .click();
    
    // 等待「上傳中...」狀態結束（等待這個文字消失）
    cy.contains('上傳中', { timeout: 60000 }).should('not.exist');
    
    // 等待上傳成功的 toast 出現
    cy.contains('圖片上傳成功', { timeout: 10000 }).should('exist');

    cy.get('input[placeholder="🖼️ 封面圖片網址"]')
      .first()
      .invoke('val')
      .then((value) => {
        expect(value).to.be.a('string').and.match(/^https?:\/\//);
        cy.wrap(value).as('uploadedUrl');
      });

    cy.contains('button', '儲存 Day 1 小卡').click();
    cy.contains('已儲存 Day 1 設定', { timeout: 10000 }).should('exist');

    openCountdownEditor();
    cy.get<string>('@uploadedUrl').then((uploadedUrl) => {
      cy.get('input[placeholder="🖼️ 封面圖片網址"]').first().should('have.value', uploadedUrl);
      cy.get('img[alt="圖片預覽"]', { timeout: 15000 }).first().should('be.visible');
    });
  });

  it('切換 Day 2 並以 JSON 模式編輯 CG 劇本', () => {
    openCountdownEditorFromDashboard(2);

    // 先勾選「啟用 CG 開場劇情」來顯示編輯器
    cy.get('#enable-cg').check({ force: true });
    
    cy.contains('button', 'JSON').click();
    const script = {
      cover: {
        title: 'Cypress Day 2',
        description: '自動化測試覆寫的 CG 劇情',
      },
      startScene: 'scene1',
      scenes: [
        {
          id: 'scene1',
          label: 'Cypress Scene',
          dialogue: [{ speaker: '測試', text: 'Hello from Cypress Day 2' }],
        },
      ],
      ending: {
        title: '完結',
        message: 'Cypress 驗證完畢',
      },
    };

    const jsonContent = JSON.stringify(script, null, 2);
    
    // 使用 clear + type 來確保 React 狀態正確更新
    cy.get('textarea[placeholder="直接編輯 JSON..."]')
      .clear()
      .then(($textarea) => {
        // 直接設置值並觸發 input 事件
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set;
        nativeInputValueSetter?.call($textarea[0], jsonContent);
        $textarea[0].dispatchEvent(new Event('input', { bubbles: true }));
      });

    // 等待一下讓 React 狀態更新
    cy.wait(500);

    cy.contains('button', '儲存 Day 2 小卡').click();
    cy.contains('已儲存 Day 2 設定', { timeout: 10000 }).should('exist');

    openCountdownEditor(2);
    cy.get('#enable-cg').check({ force: true });
    cy.contains('button', 'JSON').click();
    cy.get('textarea[placeholder="直接編輯 JSON..."]').should('contain.value', 'Hello from Cypress Day 2');
  });

  it('將 Day 3 設為禮品卡片並填入獎勵資訊', () => {
    openCountdownEditorFromDashboard(3);

    cy.contains('button', '禮品卡片').click();

    const rewardTitle = `Cypress 禮物 ${Date.now()}`;
    const rewardMessage = '這是來自 Cypress 的祝福訊息';
    const rewardImage = 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80';
    const rewardCode = `https://gift.example.com/cypress-${Date.now()}`;

    cy.get('input[placeholder="例：星巴克咖啡券"]').clear().type(rewardTitle);
    cy.get('textarea[placeholder="給接收者的祝福訊息"]').clear().type(rewardMessage);
    cy.get('input[placeholder="https://example.com/gift.jpg"]').clear().type(rewardImage);
    cy.get('input[placeholder="例：https://gift.com/redeem/ABC123"]').clear().type(rewardCode);

    cy.contains('button', '儲存 Day 3 小卡').click();
    cy.contains('已儲存 Day 3 設定', { timeout: 10000 }).should('exist');

    openCountdownEditor(3);
    cy.get('input[placeholder="例：星巴克咖啡券"]').should('have.value', rewardTitle);
    cy.get('textarea[placeholder="給接收者的祝福訊息"]').should('have.value', rewardMessage);
    cy.get('input[placeholder="https://example.com/gift.jpg"]').should('have.value', rewardImage);
    cy.get('input[placeholder="例：https://gift.com/redeem/ABC123"]').should('have.value', rewardCode);
    cy.contains('button', '禮品卡片').should('have.attr', 'class').and('include', 'bg-aurora');
  });
});
