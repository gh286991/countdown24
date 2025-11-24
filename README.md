# Countdown24 Experience

React + Express + Tailwind/SCSS 的 24 天倒數體驗平台。編輯者可以打造 CG 對話過場或 QR 禮物庫的倒數頁面，接收者透過 Token 驗證登入後即可逐日解鎖內容，並透過 QR code 兌換禮物。

## 功能亮點
- ⚛️ **前後端分離**：Vite + React 前端、Express API 後端，使用 Redux Toolkit 管理狀態。
- 🔐 **Token 驗證**：簡易的 SHA256 密碼儲存 + 自製 token 系統，提供 `/auth/register`、`/auth/login` 與 `/me` 端點。
- 🎮 **CG 對話倒數**：建立 24 天內的照片 + 雙行文字，模擬遊戲過場劇情。
- 🎁 **QR 禮物倒數**：建立 24 張 QR 禮物卡，內建線上 QR 產生器 URL。
- 👥 **角色區隔**：Creator 儀表板可建立/編輯/指派倒數；Receiver 擁有專屬收件匣與體驗頁面。
- 🎨 **Tailwind + SCSS**：使用 Tailwind 元件搭配自訂玻璃擬真 SCSS 風格，呼應 24-day 主題。

## 專案結構
```
countdown24/
├── client/   # React + Tailwind + Redux Toolkit
├── server/   # Express API、token、MongoDB 資料庫
├── pnpm-workspace.yaml
└── README.md
```

## 快速開始
> 需求：Node.js 18+、pnpm 8+、本機 MongoDB（預設連線 `mongodb://127.0.0.1:27017`）

1. 先啟動 MongoDB：`mongod --port 27017 --dbpath <你的資料夾>`
2. 專案第一次啟動會自動在 `countdown24` 資料庫建立示範使用者與倒數資料。

```bash
# 安裝所有套件
pnpm install

# 啟動 API（http://localhost:4000）
pnpm --filter server dev

# 另開終端，啟動前端（http://localhost:5173）
pnpm --filter client dev
```

部署前可執行：
```bash
pnpm --filter client build      # 輸出靜態檔案到 client/dist
PORT=4000 pnpm --filter server start
```

### 環境變數
| 變數 | 預設 | 說明 |
| --- | --- | --- |
| `PORT` | 4000 | Express 伺服器埠號 |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS 允許來源 |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` | MongoDB 連線 URI |
| `DB_NAME` | `countdown24` | MongoDB 資料庫名稱 |

## 測試帳號
| 角色 | Email | 密碼 |
| --- | --- | --- |
| Creator | `creator@example.com` | `creatorPass!123` |
| Receiver | `receiver@example.com` | `receiverPass!123` |

登入後即可檢視預設的 CG 倒數與 QR 禮物專案，並體驗接收者收件匣 / 兌換頁面。

## API 總覽
- `POST /api/auth/register`、`POST /api/auth/login`
- `GET /api/me`：回傳使用者 + 倒數/指派清單
- `GET /api/countdowns`：Creator 取得所有倒數；Receiver 取得指派清單摘要
- `POST /api/countdowns`：建立 CG 或 QR 倒數（支援 `recipientEmails` 指派）
- `PUT /api/countdowns/:id`：更新倒數內容
- `POST /api/countdowns/:id/assign`：以使用者 ID 或 Email 指派接收者
- `GET /api/countdowns/:id`：Creator/Receiver 取用詳細內容
- `GET /api/receiver/inbox`、`GET /api/receiver/countdowns/:assignmentId`

## 開發筆記
- 首次啟動會將示範使用者、倒數與指派寫入 MongoDB，之後可自行清除或替換。
- 若需圖片上傳，可串接 S3 或 Cloudinary 後將 URL 填入表單。
- QR code 目前使用免費 API 產生圖片，可替換為自家服務或預先產出的圖片。

歡迎依需求擴充推播、群組協作或動畫效果，打造更沉浸的 24 Days 體驗！
