# Countdown24 Experience

React + Express + Tailwind/SCSS 的 24 天倒數體驗平台。編輯者可以打造 CG 對話過場或 QR 禮物庫的倒數頁面，接收者透過 Token 驗證登入後即可逐日解鎖內容，並透過 QR code 兌換禮物。

## 功能亮點
- ⚛️ **前後端分離**：Vite + React 前端、Express API 後端，使用 Redux Toolkit 管理狀態。
- 🔐 **Token 驗證**：簡易的 SHA256 密碼儲存 + 自製 token 系統，提供 `/auth/register`、`/auth/login` 與 `/me` 端點。
- 🔑 **Google 登入**：前端採用 Google Identity Services，後端驗證 ID token 後自動建立或登入帳號。
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
2. 於 `.env` 或 `server/.env` 設定 `GOOGLE_CLIENT_ID`（可從 Google Cloud console 申請 OAuth 2.0 Client ID），前端會透過 `/api/config` 自動取得這組設定。
3. 專案第一次啟動會自動在 `countdown24` 資料庫建立示範使用者與倒數資料。

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

## 使用 Docker 部署

> 需求：Docker、事先建立好的 MongoDB 連線（雲端或自架）

1. 準備 `.env`（可直接沿用開發時的設定）：

   - `PORT=4000`
   - `MONGODB_URI=...`
   - `DB_NAME=countdown24`
   - `PASSWORD_SECRET=...`
   - `QR_TOKEN_SECRET=...`
   - 以及 MinIO / S3 相關設定（若有使用檔案上傳）

2. 建置 image（第一版 demo 建議使用 0.1.0 tag）：

```bash
docker build -t countdown24:0.1.0 .
```

3. 執行 container（預設會啟動 API + 提供前端靜態頁面）：

```bash
docker run --rm \
  -p 4000:4000 \
  --env-file .env \
  countdown24:0.1.0
```

啟動後：

- 後端 API：`http://localhost:4000/api`
- 前端頁面：`http://localhost:4000/`

### E2E 測試（Cypress）

專案內建一組 Cypress 端對端測試，會使用預設種子資料的接收者帳號登入並檢查收件匣。

1. 建立 Docker 測試環境（會同時啟動 MongoDB 與以生產模式建置的 API/前端）：

   ```bash
   cp docker/e2e/.env.example docker/e2e/.env
   docker compose -f docker/e2e/docker-compose.yml up --build -d
   ```

   服務啟動時會自動連線到 `mongo` 容器並套用示範資料。

2. 執行 Cypress（預設 baseUrl 為 `http://localhost:4000`，可用 `CYPRESS_BASE_URL` 覆寫）：

   ```bash
   pnpm cy:run
   # 或使用圖形化介面：pnpm cy:open
   ```

   若 API 與前端分開啟動，可以額外提供 `CYPRESS_API_URL` 來指定登入使用的 API 入口，例如 `http://localhost:4000/api`。

### 環境變數
| 變數 | 預設 | 說明 |
| --- | --- | --- |
| `PORT` | 4000 | Express 伺服器埠號 |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS 允許來源 |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` | MongoDB 連線 URI |
| `DB_NAME` | `countdown24` | MongoDB 資料庫名稱 |
| `PASSWORD_SECRET` | - | 密碼雜湊用的 HMAC key（必填，請使用隨機長字串） |
| `QR_TOKEN_SECRET` | - | 每日解鎖 QR code token 用的 HMAC key（必填，請使用隨機長字串） |
| `GOOGLE_CLIENT_ID` | - | 啟用 Google 登入所需的 OAuth 2.0 Client ID |

## 測試帳號
| 角色 | Email | 密碼 |
| --- | --- | --- |
| Creator | `creator@example.com` | `creatorPass!123` |
| Receiver | `receiver@example.com` | `receiverPass!123` |

登入後即可檢視預設的 CG 倒數與 QR 禮物專案，並體驗接收者收件匣 / 兌換頁面。

## API 總覽
- `POST /api/auth/register`、`POST /api/auth/login`、`POST /api/auth/google`
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
