#!/bin/bash

# 切換到專案根目錄
cd "$(dirname "$0")"

# 載入 nvm（如果尚未載入）
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 切換到 Node.js 24
echo "切換到 Node.js 24..."
nvm use 24

# 檢查 nvm use 是否成功
if [ $? -ne 0 ]; then
    echo "錯誤: 無法切換到 Node.js 24，請確認已安裝該版本"
    exit 1
fi

# 顯示當前 Node.js 版本
echo "當前 Node.js 版本: $(node -v)"
echo ""

# 檢查並確保 pnpm 可用
if ! command -v pnpm &> /dev/null; then
    echo "pnpm 未找到，嘗試啟用 corepack..."
    # 嘗試使用 corepack 啟用 pnpm（Node.js 16.10+ 內建）
    if command -v corepack &> /dev/null; then
        corepack enable
        corepack prepare pnpm@latest --activate
    else
        echo "正在透過 npm 安裝 pnpm..."
        npm install -g pnpm
    fi
    
    # 重新載入 PATH（確保使用當前 Node.js 版本的 bin 目錄）
    NODE_VERSION=$(node -v | sed 's/v//')
    export PATH="$NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH"
    
    # 再次檢查
    if ! command -v pnpm &> /dev/null; then
        echo "錯誤: 無法找到或安裝 pnpm，請手動執行: npm install -g pnpm"
        exit 1
    fi
fi

echo "pnpm 版本: $(pnpm -v)"
echo ""

# 啟動前端和後端（並行執行）
echo "啟動開發伺服器..."
echo "前端: http://localhost:5173 (預設 Vite 端口)"
echo "後端: 請查看 server 的日誌以確認端口"
echo ""

# 確保環境變數在背景進程中可用
export NVM_DIR
export PATH

# 取得當前 Node.js 版本的完整路徑和專案路徑
NODE_VERSION=$(node -v | sed 's/v//')
NODE_BIN="$NVM_DIR/versions/node/v$NODE_VERSION/bin"
PROJECT_DIR="$(pwd)"
export PATH="$NODE_BIN:$PATH"

# 使用 bash -c 確保在子 shell 中也能正確載入環境
bash -c "
    export NVM_DIR=\"$NVM_DIR\"
    [ -s \"\$NVM_DIR/nvm.sh\" ] && source \"\$NVM_DIR/nvm.sh\"
    nvm use 24 > /dev/null 2>&1
    export PATH=\"$NODE_BIN:\$PATH\"
    cd \"$PROJECT_DIR\"
    pnpm dev:client
" &
CLIENT_PID=$!

bash -c "
    export NVM_DIR=\"$NVM_DIR\"
    [ -s \"\$NVM_DIR/nvm.sh\" ] && source \"\$NVM_DIR/nvm.sh\"
    nvm use 24 > /dev/null 2>&1
    export PATH=\"$NODE_BIN:\$PATH\"
    cd \"$PROJECT_DIR\"
    pnpm dev:server
" &
SERVER_PID=$!

# 等待使用者中斷（Ctrl+C）
trap "echo ''; echo '正在關閉開發伺服器...'; kill $CLIENT_PID $SERVER_PID 2>/dev/null; exit" INT TERM

# 等待兩個進程
wait $CLIENT_PID $SERVER_PID

