# Spectra

**AIエージェントのための画面共有・操作インターフェース (macOS専用)**

Spectraは、AIエージェント（Claude, ChatGPTなど）がPCの画面を「見て」、操作対象を「選ぶ」ためのブリッジアプリケーションです。
Electron製のGUIでキャプチャ対象（ウィンドウやディスプレイ）を選択し、MCP (Model Context Protocol) サーバーを通じてAIに画像を提供します。

## アーキテクチャ

このプロジェクトは3つの層で構成されています：

1.  **GUI (Electron + React)**: ユーザーがキャプチャ対象を選択するための設定画面。
2.  **MCP Server (Node.js)**: AIクライアントからのリクエストを受け付け、キャプチャを実行するサーバー。
3.  **Capture Layer (Swift)**: macOSのネイティブAPIを使用して画面キャプチャを行うCLIツール。

## 必要要件

*   macOS (Screen Recording APIを使用するため)
*   Node.js (v18以上推奨)
*   Swift (Xcode Command Line Tools)

## インストール

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd Spectra
```

### 2. Swiftキャプチャツールのビルド
キャプチャ機能の中核となるネイティブツールをコンパイルします。
```bash
cd capture/mac
swift build -c release
```
※ 初回実行時にmacOSの「画面収録」の許可を求められる場合があります。システム設定から許可してください。

### 3. MCPサーバーのセットアップ
AIとの通信を行うサーバーを準備します。
```bash
cd ../../mcp-server
npm install
npm run build
```

### 4. GUIアプリのセットアップ
設定画面を準備します。
```bash
cd ../gui
npm install
```

## 使い方

### GUIの起動（設定画面）
キャプチャ対象（ウィンドウやディスプレイ）を選択するためにGUIを起動します。

```bash
cd gui
npm run electron:dev
```

*   **Displays**: 画面全体をキャプチャ対象にします。
*   **Windows**: 特定のウィンドウをキャプチャ対象にします。
*   **Refresh List**: ウィンドウリストを更新します（新しいウィンドウを開いた時などに使用）。

### MCPサーバーの起動
AIエージェント（Claude Desktopなど）から接続するための設定です。

**Claude Desktopの設定例 (`~/Library/Application Support/Claude/claude_desktop_config.json`):**

```json
{
  "mcpServers": {
    "spectra": {
      "command": "node",
      "args": [
        "/absolute/path/to/Spectra/mcp-server/dist/index.js"
      ]
    }
  }
}
```
※ パスは実際の環境に合わせて書き換えてください。

## トラブルシューティング

### ウィンドウリストにアプリが表示されない
*   **画面収録の許可**: システム設定 > プライバシーとセキュリティ > 画面収録 で、ターミナル（iTerm2など）やSpectra（ビルド後のアプリ）が許可されているか確認してください。
*   **別スペースのウィンドウ**: macOSの制限により、現在表示されているスペース（デスクトップ）にあるウィンドウのみがリストアップされます。対象のアプリがあるスペースに移動してから「Refresh List」を押してください。

### キャプチャ画像が真っ黒になる
*   DRM保護されたコンテンツ（Netflixなど）はキャプチャできません。
*   画面収録の許可がない場合も真っ黒になることがあります。

## 開発者向け情報

*   **設定ファイル**: `settings.json` に現在のキャプチャ対象IDが保存されます。
*   **Swiftソース**: `capture/mac/Sources/mac/mac.swift`
*   **Electronメインプロセス**: `gui/electron/main.ts`