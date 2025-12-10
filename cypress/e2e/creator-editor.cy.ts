const CREATOR_EMAIL = 'creator@example.com';
const CREATOR_PASSWORD = 'creatorPass!123';
const STORY_COUNTDOWN_TITLE = 'Chronicles of Us';

function logStep(prefix: 'Given' | 'When' | 'Then', message: string) {
  cy.log(`【${prefix}】${message}`);
}

function given(message: string, action: () => void | Cypress.Chainable) {
  logStep('Given', message);
  return action();
}

function when(message: string, action: () => void | Cypress.Chainable) {
  logStep('When', message);
  return action();
}

function then(message: string, action: () => void | Cypress.Chainable) {
  logStep('Then', message);
  return action();
}

function openCountdownEditorFromDashboard(day = 1) {
  cy.contains(STORY_COUNTDOWN_TITLE, { timeout: 20000 })
    .scrollIntoView()
    .click();
  cy.contains('編輯 Day', { timeout: 30000 }).should('be.visible');
  if (day !== 1) {
    switchDay(day);
  }
}

function openCountdownEditor(day = 1) {
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

describe('Feature: 創作者編輯頁面', () => {
  beforeEach(() => {
    cy.viewport(1440, 900);
    cy.loginAs(CREATOR_EMAIL, CREATOR_PASSWORD);
    cy.visit('/creator');
    cy.contains('我的倒數專案', { timeout: 30000 }).should('be.visible');
  });

  context('Scenario: 側欄快速切換不同天數', () => {
    it('讓創作者迅速跳轉到指定 Day', () => {
      given('創作者位於 Day 1 編輯頁', () => openCountdownEditorFromDashboard());

      when('從側欄點選 Day 2', () => {
        cy.contains('button', /Day\s+2/).scrollIntoView().click();
      });
      then('編輯畫面切換為 Day 2', () => {
        cy.contains('編輯 Day 2', { timeout: 10000 }).should('be.visible');
      });

      when('再點選 Day 5', () => {
        cy.contains('button', /Day\s+5/).scrollIntoView().click();
      });
      then('編輯畫面切換為 Day 5 並更新標題', () => {
        cy.contains('編輯 Day 5', { timeout: 10000 }).should('be.visible');
      });
    });
  });

  context('Scenario: Day 1 文案維護', () => {
    it('讓創作者同步更新標題與描述', () => {
      // 在測試開始時生成一次時間戳記，確保整個測試使用相同的值
      const timestamp = Date.now();
      const title = `Cypress Day 1 ${timestamp}`;
      const description = 'Cypress 自動化更新的敘述文字';
      const coverTitle = `Cypress Cover ${timestamp}`;

      given('創作者已打開 Day 1 編輯頁', () => openCountdownEditorFromDashboard());

      when('修改 Day 1 標題與描述後儲存', () => {
        cy.get('input[placeholder="例：Day 1 的故事開始"]').clear().type(title);
        cy.get('textarea[placeholder="簡短描述這一天的內容"]').clear().type(description);
        cy.contains('button', '儲存 Day 1 小卡').click();
      });

      then('系統提示儲存成功', () => {
        cy.contains('已儲存 Day 1 設定', { timeout: 10000 }).should('exist');
      });

      when('重新載入 Day 1 編輯頁', () => openCountdownEditor());
      then('表單呈現最新標題與描述', () => {
        cy.get('input[placeholder="例：Day 1 的故事開始"]').should('have.value', title);
        cy.get('textarea[placeholder="簡短描述這一天的內容"]').should('have.value', description);
      });

      when('更新封面標題並儲存', () => {
        cy.get('input[placeholder="標題 (例: DAY 1 / 24)"]').clear().type(coverTitle);
        cy.contains('button', '儲存 Day 1 小卡').click();
      });

      then('重新載入後仍帶入新封面標題', () => {
        cy.contains('已儲存 Day 1 設定', { timeout: 10000 }).should('exist');
        openCountdownEditor();
        cy.get('input[placeholder="標題 (例: DAY 1 / 24)"]').should('have.value', coverTitle);
      });
    });
  });

  context('Scenario: 上傳 CG 封面並預覽', () => {
    it('確保經 MinIO 上傳後仍可檢視', { retries: 2 }, () => {
      given('創作者停留在 Day 1 編輯頁', () => openCountdownEditorFromDashboard());

      when('透過素材上傳流程送出新圖片', () => {
        cy.get('input[placeholder="🖼️ 封面圖片網址"]')
          .first()
          .should('exist')
          .parent()
          .within(() => {
            cy.contains('button', '上傳').click();
            cy.get('input[type="file"]').selectFile('cypress/fixtures/cg-upload.png', { force: true });
          });
        cy.contains('調整素材', { timeout: 10000 }).should('be.visible');
        cy.get('canvas.cursor-crosshair', { timeout: 30000 }).should('exist');
        cy.wait(1000); // 等待圖片完全載入
        cy.contains('button', '套用並上傳', { timeout: 15000 })
          .should('not.be.disabled')
          .click();
        cy.contains('上傳中', { timeout: 60000 }).should('not.exist');
        cy.contains('圖片上傳成功', { timeout: 10000 }).should('exist');
        cy.get('input[placeholder="🖼️ 封面圖片網址"]')
          .first()
          .invoke('val')
          .then((value) => {
            expect(value).to.be.a('string').and.match(/^https?:\/\//);
            cy.wrap(value).as('uploadedUrl');
          });
      });

      when('儲存 Day 1 小卡', () => {
        cy.contains('button', '儲存 Day 1 小卡').click();
      });

      then('重新載入後仍能顯示最新的封面網址與預覽', () => {
        cy.contains('已儲存 Day 1 設定', { timeout: 10000 }).should('exist');
        openCountdownEditor();
        cy.get<string>('@uploadedUrl').then((uploadedUrl) => {
          cy.get('input[placeholder="🖼️ 封面圖片網址"]').first().should('have.value', uploadedUrl);
          cy.get('img[alt="圖片預覽"]', { timeout: 15000 }).first().should('be.visible');
        });
      });
    });
  });

  context('Scenario: 以 JSON 編輯 Day 2 CG 劇本', () => {
    it('保留完整 CG 劇情設定', () => {
      const script = {
        cover: { title: 'Cypress Day 2', description: '自動化測試覆寫的 CG 劇情' },
        startScene: 'scene1',
        scenes: [
          {
            id: 'scene1',
            label: 'Cypress Scene',
            dialogue: [{ speaker: '測試', text: 'Hello from Cypress Day 2' }],
          },
        ],
        ending: { title: '完結', message: 'Cypress 驗證完畢' },
      };
      const jsonContent = JSON.stringify(script, null, 2);

      given('創作者切換至 Day 2 並啟用 CG 劇情', () => {
        openCountdownEditorFromDashboard(2);
        cy.get('#enable-cg').check({ force: true });
        cy.contains('button', 'JSON').click();
      });

      when('貼上新的 JSON 劇本並儲存', () => {
        cy.get('textarea[placeholder="直接編輯 JSON..."]')
          .clear()
          .then(($textarea) => {
            const setter = Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype,
              'value',
            )?.set;
            setter?.call($textarea[0], jsonContent);
            $textarea[0].dispatchEvent(new Event('input', { bubbles: true }));
          });
        cy.contains('button', '儲存 Day 2 小卡').click();
      });

      then('重新載入後能看到剛貼上的內容', () => {
        cy.contains('已儲存 Day 2 設定', { timeout: 10000 }).should('exist');
        openCountdownEditor(2);
        cy.contains('button', 'JSON').click();
        cy.get('textarea[placeholder="直接編輯 JSON..."]').should('contain.value', 'Hello from Cypress Day 2');
      });
    });
  });

  context('Scenario: CG JSON 驗證提示', () => {
    it('輸入錯誤格式時不允許儲存', () => {
      given('創作者進入 Day 2 並啟用 CG 劇情', () => {
        openCountdownEditorFromDashboard(2);
        cy.get('#enable-cg').check({ force: true });
      });

      when('貼上不合法的 JSON 內容', () => {
        cy.contains('button', 'JSON').click();
        cy.get('textarea[placeholder="直接編輯 JSON..."]').clear().type('這不是 JSON');
      });

      when('嘗試儲存 Day 2 小卡', () => {
        cy.contains('button', '儲存 Day 2 小卡').click();
      });

      then('顯示格式錯誤的警告並停留在頁面', () => {
        cy.contains('CG JSON 格式錯誤，請檢查括號或逗號。', { timeout: 10000 }).should('be.visible');
        cy.contains('編輯 Day 2').should('be.visible');
      });
    });
  });

  context('Scenario: Day 3 轉為禮品卡', () => {
    it('保存禮品卡的所有欄位', () => {
      const rewardTitle = `Cypress 禮物 ${Date.now()}`;
      const rewardMessage = '這是來自 Cypress 的祝福訊息';
      const rewardImage =
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80';
      const rewardCode = `https://gift.example.com/cypress-${Date.now()}`;

      given('創作者打開 Day 3 編輯頁面', () => openCountdownEditorFromDashboard(3));

      when('切換為禮品卡並輸入所有欄位', () => {
        cy.contains('button', '禮品卡片').click();
        cy.get('input[placeholder="例：星巴克咖啡券"]').clear().type(rewardTitle);
        cy.get('textarea[placeholder="給接收者的祝福訊息"]').clear().type(rewardMessage);
        cy.get('input[placeholder="https://example.com/gift.jpg"]').clear().type(rewardImage);
        cy.get('input[placeholder="例：https://gift.com/redeem/ABC123"]').clear().type(rewardCode);
      });

      when('儲存 Day 3 小卡', () => {
        cy.contains('button', '儲存 Day 3 小卡').click();
      });

      then('重新載入後保留所有禮品欄位', () => {
        cy.contains('已儲存 Day 3 設定', { timeout: 10000 }).should('exist');
        openCountdownEditor(3);
        cy.get('input[placeholder="例：星巴克咖啡券"]').should('have.value', rewardTitle);
        cy.get('textarea[placeholder="給接收者的祝福訊息"]').should('have.value', rewardMessage);
        cy.get('input[placeholder="https://example.com/gift.jpg"]').should('have.value', rewardImage);
        cy.get('input[placeholder="例：https://gift.com/redeem/ABC123"]').should('have.value', rewardCode);
        cy.contains('button', '禮品卡片').should('have.attr', 'class').and('include', 'bg-aurora');
      });
    });
  });
});
