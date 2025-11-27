FROM node:24-alpine AS builder

WORKDIR /app

# 安裝共用工具（可選）
RUN corepack enable || true

############################
# Build server
############################
WORKDIR /app/server

# 直接複製 server 原始碼並安裝 / 建置
COPY server ./
RUN npm install && npm run build

############################
# Build client
############################
WORKDIR /app/client

COPY client ./
RUN npm install && npm run build

############################
# Runtime image
############################
FROM node:24-alpine AS runtime

WORKDIR /app/server
ENV NODE_ENV=production

# 從 builder 複製 server 執行期所需檔案
COPY --from=builder /app/server/package.json ./package.json
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/dist ./dist

# 複製前端靜態資源
WORKDIR /app/client
COPY --from=builder /app/client/dist ./dist

WORKDIR /app/server
EXPOSE 4000

CMD ["node", "dist/server.js"]

