# MCPサーバー セットアップガイド

## 1. MCPサーバーのビルド

```bash
cd mcp-server
npm install
npm run build
```

## 2. Claude Desktopへの設定

Claude Desktopの設定ファイルに以下を追加してください。

### macOSの場合
設定ファイルの場所: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "spectra": {
      "command": "node",
      "args": [
        "/Users/nao/Desktop/develop/CLI 画面共有アプリ/Spectra/mcp-server/dist/index.js"
      ]
    }
  }
}
```

**注意**: パスは絶対パスで指定してください。

## 3. Claude Desktopの再起動

設定ファイルを保存したら、Claude Desktopを完全に終了して再起動してください。

## 4. 動作確認

Claude Desktopで以下のように話しかけてみてください：

- 「画面を見て」
- 「ウィンドウ一覧を教えて」
- 「現在の設定を確認して」

## 利用可能なツール

- `screen_capture_latest`: 設定に基づいて画面をキャプチャ
- `screen_list_windows`: ウィンドウ一覧を取得
- `screen_capture_window`: 特定のウィンドウをキャプチャ
- `screen_capture_region`: 指定領域をキャプチャ
- `settings_get`: 現在の設定を取得
- `settings_set`: 設定を更新

## トラブルシューティング

### MCPサーバーが起動しない
- Node.jsがインストールされているか確認
- `npm run build`が成功しているか確認
- パスが正しいか確認

### 画面キャプチャができない
- macOSの「画面収録」権限が付与されているか確認
  - システム設定 → プライバシーとセキュリティ → 画面収録
- GUIアプリで対象ウィンドウ/画面を選択しているか確認
