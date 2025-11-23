# Spectra

**AIエージェントのための画面共有・操作インターフェース (macOS専用)**

Spectraは、AIエージェント（Claude, Gemini, Codexなど）がPCの画面を「見て」、操作対象を「選ぶ」ためのブリッジアプリケーションです。
Electron製のGUIでキャプチャ対象（ウィンドウやディスプレイ）を選択し、MCP (Model Context Protocol) サーバーを通じてAIに画像を提供します。

## 主な機能

- **Discord風GUI**: 直感的なインターフェースでキャプチャ対象（ウィンドウ/画面）を選択
- **MCPサーバー**: AIクライアントからのリクエストに応じて画面キャプチャを提供
- **マルチクライアント対応**: Claude, Gemini, Codexなど複数のAIツールに対応

## 対応AIクライアント

| クライアント | 対応状況 | 備考 |
| --- | --- | --- |
| **Claude CLI** | ✅ 完璧 | 推奨クライアント |
| **Claude Desktop** | ✅ 完璧 | GUIで利用可能 |
| **Claude Code** | ✅ 完璧 | VS Code拡張機能 |
| **Gemini CLI** | ✅ 動作 | APIクォータ制限に注意 |
| **Codex CLI** | ✅ 動作 | キャプチャできない可能性あり（環境・モデル依存） |

## アーキテクチャ

このプロジェクトは3つの層で構成されています：

1.  **GUI (Electron + React)**: ユーザーがキャプチャ対象を選択するための設定画面。
2.  **MCP Server (Node.js)**: AIクライアントからのリクエストを受け付け、キャプチャを実行するサーバー。
3.  **Capture Layer (Swift)**: macOSのネイティブAPIを使用して画面キャプチャを行うCLIツール。

## クイックスタート

詳細なセットアップ手順は [README_MCP_SETUP.md](README_MCP_SETUP.md) を参照してください。

### 1. アプリのインストール（GUI）

**[GitHub Releases](https://github.com/naolab/Spectra/releases)** から最新の `.dmg` ファイルをダウンロードしてインストールしてください。

### 2. MCPサーバーのセットアップ（必須）

AIエージェントがSpectraを利用するには、MCPサーバーをローカルで実行する必要があります。npm経由で簡単にインストールできます。

```bash
npm install -g spectra-mcp
```

※ まだnpmに公開されていない場合は、リポジトリをクローンして `npm install -g .` でインストールしてください。

### 3. GUIの起動

インストールした「Spectra」アプリを起動し、キャプチャしたいウィンドウまたは画面を選択します。

### 3. AIクライアントから利用

**Claude CLIの場合**:

```bash
# 初回設定
claude mcp add spectra spectra-mcp

# 使う
claude "画面を見て、何が表示されているか教えて"
```

**Gemini CLIの場合**:

```bash
# 初回設定
gemini mcp add spectra spectra-mcp

# 使う
gemini "画面を見て"
```

## トラブルシューティング

### ウィンドウリストにアプリが表示されない
*   **画面収録の許可**: システム設定 > プライバシーとセキュリティ > 画面収録 で、ターミナル（iTerm2など）やSpectra（ビルド後のアプリ）が許可されているか確認してください。
*   **別スペースのウィンドウ**: macOSの制限により、現在表示されているスペース（デスクトップ）にあるウィンドウのみがリストアップされます。

### キャプチャ画像が真っ黒になる
*   DRM保護されたコンテンツ（Netflixなど）はキャプチャできません。
*   画面収録の許可がない場合も真っ黒になることがあります。

## 開発者向け情報

*   **設定ファイル**: `settings.json` に現在のキャプチャ対象IDが保存されます。
*   **Swiftソース**: `capture/mac/Sources/mac/mac.swift`
*   **Electronメインプロセス**: `gui/electron/main.ts`