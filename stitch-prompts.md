# Stitch Prompts — 営業CRM

> Stitchに貼り付けて使う画面ごとのプロンプト集。
> 使う前に必ず `design.md` をStitchのデザインコンテキストとして読み込ませること。
> 各プロンプトは単独でも動くが、design.mdがある場合は色・フォント・コンポーネントが自動で一致する。

---

## 使い方

1. [stitch.withgoogle.com](https://stitch.withgoogle.com) を開く
2. 新規プロジェクトを作成
3. **Settings → Design Context → Upload design.md** で `design.md` をアップロード
4. 下記プロンプトをコピーして貼り付け → Generate

---

## PROMPT 01 — リストビュー（メイン画面）

```
Design a mobile CRM app main screen called "営業CRM" for a Japanese sales team.

Header (dark navy #0f172a, 56px tall):
- Two pill-shaped tab buttons: "張り替え王" and "ロジキング" — the active one is filled orange (#f97316)
- Right side: a view toggle with two small buttons showing ☰ (list, active) and 🗺 (map)

Below header, a horizontal scrollable filter chip bar (white background):
- Chips: 全て(12) / ⚪未営業(4) / 🔵訪問済み(3) / 🟡検討中(2) / 🔥見込みあり(2) / 🔄再訪予定(1) / 🟢契約済み(0) / ❌見送り(0)
- "全て" chip is currently active (dark fill, white text)
- Chips are pill-shaped, small text, no scrollbar visible

Main content: vertical list of white rounded cards (14px radius, 8px gap, 12px horizontal page padding):

Card 1 (left border: orange #f97316):
- Top row: "〇〇クリーニング" (bold 15px) + orange badge "🔥 見込みあり"
- Address row: "📍 東京都新宿区西新宿1-2-3" (12px gray)
- Meta row: "👤 田中様" "🗓 2026-04-10" "⚡ 2026-04-20" (11px gray, last one red because overdue)

Card 2 (left border: blue #3b82f6):
- "△△ランドリー" + blue badge "🔵 訪問済み"
- "📍 神奈川県横浜市..." 
- "👤 鈴木様" "🗓 2026-04-05"

Card 3 (left border: yellow #eab308):
- "□□染色工房" + yellow badge "🟡 検討中"

Card 4 (left border: gray):
- "未営業の店舗A" + gray badge "⚪ 未営業"

Bottom navigation (dark navy, 64px):
- 4 items: ☰リスト (active, orange) / 🗺マップ / FAB circle button (orange, ＋ symbol, 52px, glow shadow) / 📊統計
- Icon 22px, label 10px, inactive items white 45% opacity

Mobile frame, light gray (#f1f5f9) background between cards.
```

---

## PROMPT 02 — マップビュー

```
Design a mobile CRM map screen for a Japanese field sales app.

Header (dark navy #0f172a):
- Left: two pill tabs "張り替え王" (active, orange) and "ロジキング"
- Right: view toggle — ☰ (list) and 🗺 (map, currently active/highlighted)

Main content: Full-screen OpenStreetMap showing the Tokyo/Kanagawa area.

Map has 5 teardrop-shaped location pins, each a different color:
- Orange pin (#f97316) at Shinjuku — for "見込みあり"
- Blue pin (#3b82f6) at Yokohama — for "訪問済み"
- Yellow pin (#eab308) at Shibuya — for "検討中"  
- Gray pin (#9ca3af) at Tachikawa — for "未営業"
- Green pin (#22c55e) at Chiba — for "契約済み"

One pin (orange, Shinjuku) has a white popup card open:
- Bold store name: "〇〇クリーニング"
- Status line: "🔥 見込みあり"
- Orange button (full width): "詳細を見る"
- Card has subtle shadow, min-width 160px

Bottom navigation (same as list view), "マップ" icon is active/orange.
```

---

## PROMPT 03 — 店舗詳細ビュー

```
Design a mobile store detail screen for a Japanese sales CRM app.

Header (dark navy):
- Left: back arrow "←" button
- Center: store name "〇〇クリーニング" (bold, truncated)
- Right: edit button "✏️"

Top section: a 180px tall mini-map showing Tokyo area with a single orange teardrop pin

Below map, scrollable content (light gray background, 16px horizontal padding):

Section 1 — white rounded card "ステータス":
- 2×4 grid of status option tiles:
  ⚪未営業 / 🔵訪問済み / 🟡検討中 / 🔥見込みあり (this one is selected: orange border, light orange bg) / 🔄再訪予定 / 🟢契約済み / ❌見送り
- Each tile: emoji (20px) + label (12px) centered, 2px border, 10px radius

Section 2 — white rounded card "基本情報":
- Row: 📍 住所 / 東京都新宿区西新宿1-2-3
- Row: 👤 担当者（先方） / 田中 様
- Row: ⚡ 次回アクション / 2026-04-20　見積もりを再送 (date is red/bold = overdue)
- Row: 📝 メモ / 先月訪問済み。社長が前向きだった。

Section 3 — white rounded card "訪問履歴":
- Visit item 1: [2026-04-10 / 鈴木] "社長と面談。前向きな反応。来月再訪の約束。"
- Visit item 2: [2026-03-28 / 田中] "初回訪問。資料を渡した。"
- Dashed button at bottom: "＋ 訪問記録を追加"

Danger button at bottom: "この店舗を削除" (light red background, red text)

Bottom navigation visible. No tab is active (we're in a sub-screen).
```

---

## PROMPT 04 — 店舗追加フォーム

```
Design a mobile "add new store" form screen for a Japanese sales CRM.

Header (dark navy):
- Left: back arrow "←"
- Center: "店舗を追加" (bold)

Scrollable content (light gray bg, 16px padding):

Section 1 — white card (basic info):
- Field: 事業部 * — dropdown select showing "張り替え王"
- Field: 店舗名 * — text input, placeholder "例：〇〇クリーニング"
- Field: 住所 — text input, placeholder "例：東京都新宿区〇〇1-2-3", below it: small green text "✅ 地図に表示できます"
- Field: 担当者（先方） — text input, placeholder "例：田中 様"

Section 2 — white card (pipeline):
- Field: ステータス — dropdown, currently showing "⚪ 未営業"
- Field: 次回アクション — text input, placeholder "例：来月再訪・見積もり送付"
- Field: 次回予定日 — date input

Section 3 — white card (notes):
- Field: メモ — textarea, placeholder "詳細メモ・引継ぎ情報など", 4 lines tall

Large orange primary button at bottom: "店舗を追加"

Field labels are 11px all-caps gray, above each input. No visible borders on inputs (borderless inside section). Section dividers between fields.
Bottom navigation visible.
```

---

## PROMPT 05 — 統計・設定画面

```
Design a mobile statistics and settings screen for a Japanese sales CRM app.

Header (dark navy): title "統計・設定" centered

Content (light gray background, 16px padding, scrollable):

Sub-header label: "サマリー" (small caps gray)

White rounded card with 2×3 stat grid:
- 総店舗数: 12 (large bold number)
- 見込みあり: 3 (orange number)
- 契約済み: 2 (green number)
- 張り替え王: 7
- ロジキング: 5
- 再訪予定: 2 (purple number)
Each stat: number (24px bold) + label (10px gray) in a small rounded light-gray tile

Sub-header label: "データ管理"

White rounded card (list items):
- Row: 📥 CSVインポート → arrow
- Row: 📤 CSVエクスポート → arrow

Sub-header label: "Firebase連携（Phase 2）"

White rounded card:
- Row: 🔥 Firebase設定 → "未設定" (gray) → arrow

Bottom navigation: 📊統計 icon is active (orange).
```

---

## PROMPT 06 — 訪問記録追加モーダル

```
Design a mobile bottom sheet modal for adding a visit log entry in a Japanese sales CRM.

Background: dark semi-transparent overlay covering the screen

Bottom sheet slides up from bottom:
- Top: gray drag handle pill (36×4px, centered)
- Title: "訪問記録を追加" (17px bold, centered)
- Field: 訪問日 — date input (today's date pre-filled: 2026-04-16)
- Field: 訪問者（社内） — text input, placeholder "例：鈴木"
- Field: メモ — textarea 4 lines, placeholder "話した内容・反応・次のアクションなど"
- Large orange button: "保存"

Sheet has white background, rounded top corners (20px), takes up about 70% of screen height.
Keyboard is shown (bottom of screen), sheet sits above keyboard.
```

---

## PROMPT 07 — CSVインポートモーダル

```
Design a mobile bottom sheet modal for CSV file import in a Japanese CRM app.

Bottom sheet:
- Drag handle + title "CSVインポート"
- Large dashed-border drop zone (14px radius):
  - 📂 icon (40px)
  - "CSVファイルを選択" (bold 15px)
  - Sub-text: "必須列：店舗名 / 任意列：住所、担当者、ステータス、メモ、次回アクション、次回日付" (12px gray, centered)
- Below drop zone (shown after file selected):
  - Dropdown: "取込先事業部" → "張り替え王"
  - Monospace preview box showing first few lines of CSV (12px, gray bg, 4 lines visible)
  - "15 件のデータが見つかりました" (13px gray)
  - Orange primary button: "インポート実行"
```

---

## PROMPT 08 — 全体フロー（Stitch Canvas用）

```
Show a complete mobile app flow for a Japanese B2B field sales CRM called "営業CRM".

Layout: 5 connected screens left to right on a canvas, connected by arrows showing user flow.

Screen 1 (List View): Dark header with orange tabs, filter chips bar, scrollable store cards with colored left borders
Screen 2 (Store Detail): Back arrow header, mini-map, status selector grid, info rows, visit history
Screen 3 (Add Store Form): Form with sections, address geocoding feedback, orange save button
Screen 4 (Map View): Full-screen map with teardrop pins, popup card
Screen 5 (Stats): Summary number grid, settings rows

Arrows:
- Screen 1 → Screen 2: tap a store card
- Screen 1 → Screen 3: tap FAB ＋ button  
- Screen 1 → Screen 4: tap map toggle in header
- Screen 1 → Screen 5: tap 📊 nav item
- Screen 2 → Screen 3: tap edit ✏️ in header

All screens use: dark navy header (#0f172a), orange accent (#f97316), white cards on gray (#f1f5f9) background, dark bottom navigation.
Mobile frame (iPhone 15 Pro size), Japanese UI text.
```

---

## Tips for Stitch

- **design.mdを必ず先に読み込む** — 色・フォント・コンポーネントが自動で一致する
- **1プロンプト1画面** — 複数画面を一度に生成しようとすると品質が下がる
- **細かい修正は追加プロンプトで** — 「ステータスバッジの角丸をもっと大きく」など
- **PROMPT 08（フロー）は最後に** — 全画面が完成してから全体フローを生成する
- **Gemini 2.5 Pro（Experimental）** を使うと細部の再現度が高い（月50回制限）
