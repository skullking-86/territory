# 営業CRM アプリ 仕様書

**バージョン**: 1.0  
**作成日**: 2026-04-16  
**対象事業部**: 張り替え王 / ロジキング

---

## 1. アプリ概要

営業担当者が外回りしながらスマホで使える、軽量CRMアプリ。  
店舗の営業状況をリスト＋マップで管理し、チームで共有するためのツール。

### フェーズ構成

| フェーズ | 内容 | 状態 |
|---|---|---|
| Phase 1 | PWAアプリ + localStorage（単体端末で動く） | ✅ 完成 |
| Phase 2 | Firebase連携（チームでリアルタイム共有） | 🔧 設定待ち |
| Phase 3 | LINEbot / Discord bot連携（自動入力） | 📅 予定 |

---

## 2. 機能一覧

### 2-1. 店舗管理
- 店舗の追加・編集・削除
- 事業部ごとの切り替え（張り替え王 / ロジキング）
- 住所入力 → 自動ジオコーディング → マップにピン表示

### 2-2. ステータス管理（パイプライン）

| ステータス | 意味 |
|---|---|
| ⚪ 未営業 | まだ訪問していない |
| 🔵 訪問済み | 訪問済み・手応え未確認 |
| 🟡 検討中 | 先方が検討中 |
| 🔥 見込みあり | 受注確度が高い |
| 🔄 再訪予定 | 今年中など再訪スケジュール確定 |
| 🟢 契約済み | 成約 |
| ❌ 見送り | 今回は対象外 |

### 2-3. 店舗詳細
- 基本情報（店舗名・住所・担当者・メモ）
- 次回アクション + 予定日（期限超過で赤色警告）
- 訪問履歴タイムライン（日付・訪問者・内容）
- ミニマップ表示

### 2-4. 表示モード
- **リストビュー**: ステータスフィルター付きカード一覧
- **マップビュー**: ピンの色 = ステータス、タップで詳細ポップアップ

### 2-5. データ管理
- **CSVインポート**: 過去データを一括登録
- **CSVエクスポート**: バックアップ・Excel連携用
- **Firebase連携**（Phase 2）: チームリアルタイム同期

### 2-6. PWA対応
- スマホのホーム画面に追加可能（ネイティブアプリっぽく動作）
- オフライン時もアプリは起動可（データはローカルキャッシュ）

---

## 3. ファイル構成

```
eigyo-app/
├── index.html       - HTMLシェル（CDNロード）
├── style.css        - UIスタイル
├── app.js           - アプリ全ロジック
├── manifest.json    - PWA設定
├── sw.js            - Service Worker（オフライン対応）
├── SPEC.md          - この仕様書
└── icon-192.png     - アプリアイコン（要追加）
└── icon-512.png     - アプリアイコン（要追加）
```

---

## 4. データ構造

### Store オブジェクト

```json
{
  "id": "store_1713200000_abc12",
  "businessUnit": "harigae",
  "name": "〇〇クリーニング",
  "address": "東京都新宿区〇〇1-2-3",
  "lat": 35.6894,
  "lng": 139.6917,
  "contact": "田中 様",
  "status": "promising",
  "nextAction": "見積もりを再送",
  "nextActionDate": "2026-04-20",
  "notes": "先月訪問済み。社長が前向きだった。",
  "visits": [
    {
      "id": "v_1713100000",
      "date": "2026-04-10",
      "person": "鈴木",
      "note": "社長と面談。前向きな反応。来月再訪の約束。"
    }
  ],
  "createdAt": "2026-04-01T09:00:00.000Z",
  "updatedAt": "2026-04-16T10:30:00.000Z"
}
```

### CSVインポート フォーマット

```csv
店舗名,住所,担当者,ステータス,メモ,次回アクション,次回日付
〇〇クリーニング,東京都新宿区〇〇1-2-3,田中 様,見込みあり,社長が前向き,見積もり再送,2026-04-20
△△ランドリー,神奈川県横浜市〇〇,,,,,
```

ステータスの日本語対応：
- 未営業 / 訪問済み / 検討中 / 見込みあり / 再訪予定 / 契約済み / 見送り

---

## 5. Firebase設定手順（Phase 2）

### Step 1: Firebaseプロジェクト作成

1. [https://console.firebase.google.com/](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例：`eigyo-crm`）
4. Googleアナリティクスは「無効」でOK
5. 「プロジェクトを作成」

### Step 2: Firestoreデータベース作成

1. 左メニュー「Firestore Database」をクリック
2. 「データベースの作成」をクリック
3. モード: **本番環境モード**（後でルール設定）
4. ロケーション: **asia-northeast1（東京）**
5. 「完了」

### Step 3: Webアプリ登録・設定情報取得

1. プロジェクト設定（⚙️）→「アプリを追加」→「</>（Web）」
2. アプリのニックネームを入力（例：`eigyo-crm-web`）
3. 「アプリを登録」をクリック
4. 表示された `firebaseConfig` をコピーする

```javascript
// このような情報が表示される
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "eigyo-crm.firebaseapp.com",
  projectId: "eigyo-crm",
  storageBucket: "eigyo-crm.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### Step 4: セキュリティルール設定

Firestore → ルール タブで以下を貼り付け：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /stores/{storeId} {
      allow read, write: if true; // Phase2開始時の暫定設定
    }
  }
}
```

> ⚠️ 後で認証を追加してセキュリティを強化することを推奨

### Step 5: app.js に Firebase を組み込む

`app.js` の先頭に以下を追加（Claudeに依頼すれば自動で組み込み対応）：

```javascript
// Firebase設定
const firebaseConfig = {
  // Step 3でコピーした設定を貼り付け
};
```

### Step 6: ホスティング（Firebase Hosting）

```bash
# Firebase CLIをインストール
npm install -g firebase-tools

# ログイン
firebase login

# 初期化
firebase init hosting

# デプロイ
firebase deploy
```

デプロイ後、`https://eigyo-crm.web.app` のようなURLでアクセス可能になる。

---

## 6. デプロイ方法（Phase 1 - Firebase Hostingなし）

### GitHub Pages（無料）

1. GitHubにリポジトリを作成
2. `eigyo-app/` フォルダの中身をすべてプッシュ
3. Settings → Pages → Source: `main branch / root`
4. `https://ユーザー名.github.io/リポジトリ名/` でアクセス可能

### ローカルで動かす場合

```bash
# Python 3がある場合
cd eigyo-app
python3 -m http.server 8080

# Node.jsがある場合
npx serve .
```

ブラウザで `http://localhost:8080` を開く。

> ⚠️ `file://` プロトコルでは Service Worker が動作しないため、必ずサーバー経由で開くこと

---

## 7. スマホでホーム画面に追加する方法

### iPhone (Safari)

1. Safariでアプリを開く
2. 下の共有ボタン（□↑）をタップ
3. 「ホーム画面に追加」をタップ
4. 「追加」をタップ

### Android (Chrome)

1. Chromeでアプリを開く
2. 右上メニュー（⋮）をタップ
3. 「ホーム画面に追加」をタップ

---

## 8. 今後の拡張予定（Phase 3）

### LINEbot連携
- 営業担当者がLINEで「〇〇クリーニング 田中様 見込みあり 来月再訪」と送る
- botがClaude APIで構造化 → Firestoreに自動登録

### Discord bot連携
- 特定チャンネルに投稿 → 自動でCRMに反映

### 通知機能
- 次回アクション日が近い（3日前）にPush通知

### 写真添付
- 店舗外観・名刺・資料の写真をFirebase Storageに保存

---

## 9. 使用技術・ライブラリ

| 技術 | 用途 | ライセンス |
|---|---|---|
| Vanilla JS | アプリロジック | - |
| Leaflet.js 1.9.4 | マップ表示 | BSD-2 |
| OpenStreetMap | 地図タイル | ODbL |
| Nominatim | 住所→座標変換 | ODbL |
| Firebase (予定) | リアルタイムDB・ホスティング | Apache 2.0 |
| Service Worker | オフライン対応 | - |

---

## 10. 制限事項・注意点

- **Nominatim利用規約**: 大量リクエスト（1秒1件以上）は禁止。住所入力のたびに1件ずつ処理しているため問題なし。
- **localStorage**: ブラウザのデータクリアで消える。CSVエクスポートで定期バックアップを推奨。
- **Firebase無料枠**: Sparkプランで読み込み5万回/日、書き込み2万回/日。チーム規模では超えない。
- **iOS Safari**: PWAのService Workerは一部機能制限あり。ホーム画面追加後は通常動作。
