# Spectra MCPサーバー セットアップガイド

## 概要
SpectraはAI（Claude）がローカルPCの画面を自動的に見ることができるツールです。
MCP（Model Context Protocol）を使用して、AIと画面共有を実現します。

**対応しているAI製品**:
- ✅ Claude CLI（ターミナル）
- ✅ Claude Desktop（デスクトップアプリ）
- ✅ Claude Code（VS Code拡張機能）
- ✅ Gemini CLI（ターミナル）
- ✅ Codex CLI（ターミナル）

**注意**: Claude製品（CLI/Desktop/Code）は同じ設定を共有します。Gemini CLI と Codex CLI は別途設定が必要です。

## 前提条件
- macOS（現在はmacOSのみ対応）
- Node.js がインストールされていること
- Claude Pro アカウント（MCPサーバー機能を使用するため）

---

## セットアップ手順

### 1. MCPサーバーのビルド

```bash
cd mcp-server
npm install
npm run build
```

### 2. Claude CLIのインストール

```bash
npm install -g @anthropic-ai/claude-cli
```

### 3. MCPサーバーの登録

```bash
claude mcp add spectra node /Users/nao/Desktop/develop/CLI\ 画面共有アプリ/Spectra/mcp-server/dist/index.js
```

**注意**: パスは絶対パスで指定してください。上記は例なので、実際のパスに置き換えてください。

### 4. 登録確認

```bash
claude mcp list
```

以下のように表示されればOK:
```
spectra: node /path/to/Spectra/mcp-server/dist/index.js - ✓ Connected
```

### Gemini CLIのセットアップ（オプション）

Gemini CLIでも使いたい場合：

#### 1. Gemini CLIのインストール（未インストールの場合）

```bash
npm install -g @google/generative-ai-cli
```

#### 2. Spectra MCPサーバーを登録

```bash
gemini mcp add spectra node /Users/nao/Desktop/develop/CLI\ 画面共有アプリ/Spectra/mcp-server/dist/index.js
```

**注意**: パスは絶対パスで指定してください。上記は例なので、実際のパスに置き換えてください。

#### 3. 登録確認

```bash
gemini mcp list
```

以下のように表示されればOK:
```
✓ spectra: node /path/to/Spectra/mcp-server/dist/index.js (stdio) - Connected
```

### Codex CLIのセットアップ（オプション）

Codex CLIでも使いたい場合：

#### 1. Codex CLIのインストール（未インストールの場合）

公式サイトからインストール：
https://developers.openai.com/codex/

#### 2. 設定ファイルを編集

Codex CLIは`config.toml`を手動で編集する必要があります。

```bash
# 設定ファイルを開く
open ~/.codex/config.toml
```

または、エディタで直接編集：

```bash
nano ~/.codex/config.toml
```

以下を**ファイルの末尾に追加**：

```toml
[mcp_servers.spectra]
command = "node"
args = ["/Users/nao/Desktop/develop/CLI 画面共有アプリ/Spectra/mcp-server/dist/index.js"]
```

**注意**: `args`のパスは絶対パスで指定してください。上記は例なので、実際のパスに置き換えてください。

#### 3. 動作確認

Codex CLIを起動：

```bash
codex
```

起動したら、以下のように話しかけてみてください：

```
> ウィンドウ一覧を教えて
> 画面を見て、何が表示されているか教えて
```

MCPサーバーが正しく設定されていれば、Codexが自動的にSpectraのツールを使います。

---

## 使い方

### GUIアプリでキャプチャ対象を選択

```bash
cd gui
npm run electron:dev
```

GUIアプリが起動したら：
1. キャプチャしたいウィンドウまたは画面を選択
2. 選択すると自動的に`settings.json`に保存される

### Claude CLIで画面共有

#### 対話モード（推奨）

```bash
claude
```

対話モードが起動したら、普通に会話できます：

```
> 画面を見て、何が表示されているか教えて
> ウィンドウ一覧を教えて
> 現在の設定を確認して
> exit（終了）
```

#### ワンショットモード

一度だけ質問したい場合：

```bash
claude "画面を見て"
claude "ウィンドウ一覧を教えて"
```

### Claude Desktopで画面共有

1. **Claude Desktopアプリを起動**
   - https://claude.ai/download からダウンロード（未インストールの場合）
   - アプリを起動（既にインストール済みの場合は再起動）

2. **新しいチャットを開始**

3. **普通に話しかける**
   ```
   画面を見て、何が表示されているか教えて
   ウィンドウ一覧を教えて
   現在の設定を確認して
   ```

### Claude Code（VS Code拡張）で画面共有

1. **VS Codeで Claude Code 拡張機能を開く**
   - サイドバーのClaudeアイコンをクリック

2. **新しいチャットを開始**

3. **普通に話しかける**
   - 「画面を見て」
   - 「ウィンドウ一覧を教えて」

**注意**: `claude mcp add`で設定すれば、Claude CLI/Desktop/Code すべてで使えます。

### Gemini CLIで画面共有

#### 対話モード（推奨）

```bash
gemini
```

対話モードが起動したら、普通に会話できます：

```
> 画面を見て、何が表示されているか教えて
> ウィンドウ一覧を教えて
> 現在の設定を確認して
> exit（終了）
```

#### ワンショットモード

一度だけ質問したい場合：

```bash
gemini "画面を見て"
gemini "ウィンドウ一覧を教えて"
```

### Codex CLIで画面共有

#### 対話モード（推奨）

```bash
codex
```

対話モードが起動したら、普通に会話できます：

```
> 画面を見て、何が表示されているか教えて
> ウィンドウ一覧を教えて
> 現在の設定を確認して
```

**注意**: Codexは自動的にSpectraのツールを使います。`/mcp`コマンドは古いバージョンでは使えない場合があります。

#### ワンショットモード

一度だけ質問したい場合：

```bash
codex "画面を見て"
codex "ウィンドウ一覧を教えて"
```

**注意**: Codexはコンテキストウィンドウが小さいため、画面キャプチャ（`screen_capture_latest`）を使うとエラーが出る場合があります。ウィンドウ一覧の取得など、画像を含まないツールは正常に動作します。

---

## 利用可能なMCPツール

Claudeが自動的に以下のツールを使用します：

- `screen_capture_latest`: 設定に基づいて画面をキャプチャ
- `screen_list_windows`: ウィンドウ一覧を取得
- `screen_capture_window`: 特定のウィンドウをキャプチャ
- `screen_capture_region`: 指定領域をキャプチャ
- `settings_get`: 現在の設定を取得
- `settings_set`: 設定を更新

---

## トラブルシューティング

### MCPサーバーが起動しない

**確認事項**:
- Node.jsがインストールされているか
- `npm run build`が成功しているか
- パスが正しいか（絶対パスで指定）

**確認コマンド**:
```bash
claude mcp list
```

### 画面キャプチャができない

**macOSの画面収録権限を確認**:
1. システム設定 → プライバシーとセキュリティ → 画面収録
2. `Terminal.app`（またはターミナルアプリ）に権限を付与

**GUIアプリで対象を選択しているか確認**:
```bash
cat settings.json
```

設定が正しく保存されているか確認してください。

### Claude CLIが見つからない

```bash
npm install -g @anthropic-ai/claude-cli
```

再インストールしてください。

---

## 配布・共有について

他の人に配布する場合：

1. **GUIアプリ + MCPサーバー**を配布
2. **README（このファイル）**を同梱
3. ユーザーは上記のセットアップ手順に従う
4. **Claude Pro課金が必要**であることを明記

---

## 今後の拡張

- Windows対応
- Linux対応
- OpenAI API対応（GPTでも使えるように）
- REST API化（汎用的なHTTP APIとして提供）
