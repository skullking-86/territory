# DESIGN.md — 営業CRM

> This file defines the complete design system for 営業CRM, a mobile-first progressive web app for B2B sales pipeline management. Use this file as persistent design context when generating, editing, or iterating UI with Stitch or any AI coding agent.

---

## 1. Project Overview

**App name:** 営業CRM  
**Platform:** Mobile-first PWA (iOS Safari + Android Chrome)  
**Purpose:** Sales visit tracking and pipeline management for field reps  
**Business units:** 張り替え王 (upholstery) / ロジキング (logistics)  
**Primary users:** Sales reps on the go, using one hand on a smartphone  

**Design philosophy:**  
Dark, confident header with a warm orange accent. Clean white cards on a light gray canvas. The UI should feel like a native app — snappy, touch-friendly, zero clutter. Every tap target is at least 44px. Information hierarchy is strict: status first, name second, details on demand.

---

## 2. Color System

### Base Palette

| Token | Hex | Usage |
|---|---|---|
| `color-bg` | `#f1f5f9` | App background, screen fill |
| `color-surface` | `#ffffff` | Cards, modals, form sections |
| `color-header` | `#0f172a` | Header bar, bottom navigation |
| `color-text` | `#1e293b` | Primary text |
| `color-text-sub` | `#64748b` | Secondary text, labels, metadata |
| `color-border` | `#e2e8f0` | Dividers, input borders, subtle outlines |

### Brand / Accent

| Token | Hex | Usage |
|---|---|---|
| `color-primary` | `#f97316` | CTA buttons, active states, FAB, selected tabs |
| `color-primary-dark` | `#ea6a0a` | Button pressed state |

### Status Colors (Pipeline)

These colors are used for card left-borders, map pin fills, badge backgrounds, and status option highlights.

| Status | Key | Hex | Light BG | Usage |
|---|---|---|---|---|
| 未営業 | `not_visited` | `#9ca3af` | `#f3f4f6` | No visit yet |
| 訪問済み | `visited` | `#3b82f6` | `#eff6ff` | Visited, outcome unknown |
| 検討中 | `considering` | `#eab308` | `#fefce8` | Prospect is evaluating |
| 見込みあり | `promising` | `#f97316` | `#fff7ed` | High probability close |
| 再訪予定 | `revisit` | `#8b5cf6` | `#f5f3ff` | Scheduled follow-up |
| 契約済み | `contracted` | `#22c55e` | `#f0fdf4` | Closed / won |
| 見送り | `declined` | `#ef4444` | `#fef2f2` | No-go this cycle |

### Semantic

| Token | Hex | Usage |
|---|---|---|
| `color-danger` | `#ef4444` | Destructive actions, urgent alerts |
| `color-danger-bg` | `#fef2f2` | Danger button background |
| `color-success` | `#22c55e` | Confirmations, success toasts |

---

## 3. Typography

**Font stack:** `-apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif`  
Use the system font stack. Do not import web fonts — native fonts load instantly on mobile.

| Role | Size | Weight | Line Height | Color |
|---|---|---|---|---|
| Screen title (header) | 17px | 700 | 1.2 | `#ffffff` |
| Card title / store name | 15px | 700 | 1.3 | `color-text` |
| Body / detail value | 14–15px | 400 | 1.5 | `color-text` |
| Section label / meta | 11–12px | 600 | 1.4 | `color-text-sub` |
| Badge / chip text | 11–12px | 600 | 1 | status-specific |
| Navigation label | 10px | 600 | 1 | `rgba(255,255,255,0.45)` → active: `color-primary` |
| Toast notification | 13px | 600 | 1 | `#ffffff` |

**Rules:**
- Japanese text: Never use font-weight below 500 for legibility on OLED screens
- All-caps labels use `letter-spacing: 0.04–0.06em`
- Truncate long store names with `text-overflow: ellipsis`

---

## 4. Spacing & Layout

**Base unit:** 4px  
**Common values:** 4, 8, 12, 16, 20, 24, 32, 40

| Context | Value |
|---|---|
| Page horizontal padding | 12–16px |
| Card padding | 14px 16px |
| Section padding | 12px 16px |
| Gap between cards | 8px |
| Form field padding | 12px 16px |
| Modal sheet padding | 20px 16px |
| Gap between form fields | 12px |

---

## 5. Shape & Depth

| Element | Border Radius |
|---|---|
| Cards | 14px |
| Buttons (primary) | 14px |
| Buttons (small / chips) | 20px (pill) |
| Form sections | 14px |
| Modal sheet (top) | 20px 20px 0 0 |
| Status badges | 20px (pill) |
| Bottom nav FAB | 50% (circle) |
| Input fields | 10px |
| Map pins | Custom: teardrop (50% 50% 50% 0, rotated -45°) |

**Shadows:**

| Element | Shadow |
|---|---|
| Cards | `0 1px 3px rgba(0,0,0,0.07)` |
| FAB button | `0 4px 12px rgba(249,115,22,0.4)` |
| Map pins | `0 2px 6px rgba(0,0,0,0.3)` |
| Modal overlay | `rgba(0,0,0,0.5)` backdrop |

---

## 6. Components

### 6-1. Header Bar

- Background: `#0f172a`  
- Height: 56px + `env(safe-area-inset-top)` for notch/island support  
- Left: Back arrow button (←) on sub-screens, Business Unit tabs on main screens  
- Right: View toggle (☰ / 🗺), edit button (✏️) on detail screen  
- Business Unit tabs: pill-shaped, inactive = `rgba(255,255,255,0.15)` / active = `color-primary`

### 6-2. Bottom Navigation

- Background: `#0f172a`  
- Height: 64px + `env(safe-area-inset-bottom)`  
- 4 items: リスト (☰), マップ (🗺), FAB (＋), 統計 (📊)  
- Icon size: 22px, label: 10px 600  
- Active color: `color-primary` (#f97316)  
- Inactive color: `rgba(255,255,255,0.45)`  
- FAB: 52×52px circle, `color-primary` background, orange glow shadow, centered ＋ at 28px

### 6-3. Store Card

- White card, 14px radius, left border 4px colored by status  
- Padding: 14px 16px  
- Layout: name + status badge top row → address → meta row  
- Status badge: pill, 11px 600, status-specific light bg + dark text  
- Active press: `scale(0.98)` transform, slightly reduced shadow  
- Urgent next action date: red (`#ef4444`) weight 600

### 6-4. Filter Chips (horizontal scroll bar)

- Background bar: white, bottom border  
- Chip default: `color-bg` fill, `color-border` border, `color-text-sub` text  
- Chip active: solid fill matching status color, white text  
- "全て" chip active: `color-text` (#1e293b) fill  
- No scrollbar visible (scrollbar-width: none)  
- Height of chips: ~28px, padding: 5px 12px

### 6-5. Map Pins

- Shape: teardrop (CSS: `border-radius: 50% 50% 50% 0; transform: rotate(-45deg)`)  
- Size: 32×32px  
- Fill: status color  
- Border: 3px white  
- Shadow: `0 2px 6px rgba(0,0,0,0.3)`  
- Inner emoji rotated back (+45deg): 13px  
- Popup: white, min-width 160px, store name (bold 14px), status line, orange CTA button

### 6-6. Primary Button

- Full-width, height ~52px (padding 16px), border-radius 14px  
- Background: `color-primary` → pressed: `color-primary-dark`  
- Text: white, 16px, 700  
- Press: `scale(0.98)` + darker bg  
- Disabled: `opacity: 0.5`

### 6-7. Danger Button

- Full-width, border-radius 14px  
- Background: `color-danger-bg` (#fef2f2)  
- Text: `color-danger` (#dc2626), 15px, 600

### 6-8. Modal Bottom Sheet

- Overlay: `rgba(0,0,0,0.5)`, covers full screen  
- Sheet: white, `border-radius: 20px 20px 0 0`, slides up from bottom  
- Handle: 36×4px gray pill at top center  
- Max height: 85vh, scrollable  
- Padding: 20px 16px + safe-area-bottom  
- Animation: `slideUp` 0.3s cubic-bezier spring

### 6-9. Form Fields

- Grouped in white rounded sections (14px radius)  
- Each field: 12px 16px padding, bottom border divider  
- Label: 11px 600 all-caps `color-text-sub`, margin-bottom 6px  
- Input: 15px, no border, transparent background  
- Textarea: min 80px height, resize none  
- Select: custom chevron via background-image  
- Focus: no outline (borderless design inside section)  
- Geocode feedback: 11px below address field — loading (gray) / success (green ✅) / error (red ⚠️)

### 6-10. Status Selector Grid

- 2-column grid, gap 8px, padding 12px 16px  
- Each option: white card, 2px border, 10px radius  
- Selected: border-color = status color, light status bg  
- Content: emoji (20px) centered + label (12px 600) below  
- Color of label and border matches status color

### 6-11. Visit History Item

- Two-column layout: date/person column (70px fixed) + note column (flex)  
- Date: 12px 600 `color-text-sub`  
- Person: 11px `color-text-sub`  
- Note: 13px `color-text`, line-height 1.5  
- Separated by bottom border

### 6-12. Toast Notification

- Fixed bottom center, above nav bar  
- Background: `#1e293b`, white text, 13px 600  
- Pill shape: `border-radius: 20px`, padding 10px 20px  
- Appears with `slideUpToast` animation, auto-dismisses after 2.5s

### 6-13. Stats Cards (Settings/Summary)

- 3-column grid  
- Each: light gray bg (`color-bg`), 10px radius, centered  
- Number: 24px 700 `color-text` (colored for special metrics)  
- Label: 10px 600 `color-text-sub`

---

## 7. Motion & Interaction

| Interaction | Effect |
|---|---|
| Card tap | `scale(0.98)`, shadow reduces |
| FAB tap | `scale(0.94)` |
| Primary button tap | `scale(0.98)` + darker color |
| Modal open | Backdrop `fadeIn` 0.2s + sheet `slideUp` 0.3s spring |
| Toast appear | `slideUpToast` 0.3s ease |
| View transition | Instant re-render (no slide animation in Phase 1) |
| Status option select | Immediate border/bg color change |
| Loading spinner | `spin` 0.8s linear infinite, 2px border, primary top color |

**Transition timing:** `0.15–0.2s ease` for color/opacity, `0.3s cubic-bezier(0.34,1.56,0.64,1)` for spatial (modal slide)

**Touch behavior:**
- `-webkit-tap-highlight-color: transparent` — no gray flash on tap
- `overscroll-behavior: none` — no pull-to-refresh rubber band
- `user-select: none` on interactive elements
- All interactive elements min 44×44px touch target

---

## 8. Screen Inventory

| Screen | View Key | Description |
|---|---|---|
| List View | `list` | Main screen. Filter chips + scrollable store cards |
| Map View | `map` | Full-screen Leaflet map with status-colored teardrops |
| Detail View | `detail` | Mini-map + status selector + info rows + visit history |
| Add/Edit Form | `add` / `edit` | Form for creating or editing a store |
| Settings/Stats | `settings` | Summary stats + CSV import/export + Firebase config |

**Navigation pattern:**  
Bottom tab bar (persistent) + back arrow in header for depth navigation.  
No side drawer. No breadcrumbs. Max 2 levels deep.

---

## 9. Iconography

Use emoji as icons throughout the UI — no icon library required. This ensures zero load overhead and works cross-platform.

| Element | Emoji |
|---|---|
| List view tab | ☰ |
| Map view tab | 🗺 |
| Add button (FAB) | ＋ |
| Stats/settings tab | 📊 |
| Back button | ← |
| Edit button | ✏️ |
| Address field | 📍 |
| Contact field | 👤 |
| Next action | ⚡ |
| Notes | 📝 |
| Visit date | 🗓 |
| CSV import | 📥 |
| CSV export | 📤 |
| Firebase | 🔥 |
| Loading | CSS spinner (no emoji) |

---

## 10. Accessibility

- Color is never the only signal — status emoji always accompanies status color
- All touch targets ≥ 44px
- Text contrast ratios: body text on white = 11.9:1 (AAA), sub-text = 4.9:1 (AA)
- Dark header text on orange button = `#ffffff` on `#f97316` = 3.1:1 (AA Large)
- Form labels always visible (not placeholder-only)
- `lang="ja"` on `<html>` for correct CJK rendering

---

## 11. Do / Don't

**Do:**
- Use the left-border accent on cards as the primary status signal
- Keep the header dark and the content area light — strong contrast zones
- Use orange sparingly — only for primary actions and active states
- Group related fields in rounded white sections with dividers
- Show status changes with immediate visual feedback (badge color + toast)

**Don't:**
- Don't use more than 2 font weights per screen (400 + 600/700)
- Don't add gradients — flat colors only
- Don't use drop shadows larger than 3px blur for cards
- Don't add horizontal padding to filter bar (let chips scroll edge-to-edge with 12px left padding)
- Don't show more than 4 lines of text on a card — truncate or move to detail
- Don't use the primary orange for destructive actions

---

## 12. Design Tokens (CSS Variables Reference)

```css
--color-bg: #f1f5f9;
--color-surface: #ffffff;
--color-header: #0f172a;
--color-primary: #f97316;
--color-primary-dark: #ea6a0a;
--color-text: #1e293b;
--color-text-sub: #64748b;
--color-border: #e2e8f0;
--color-nav: #0f172a;
--color-danger: #ef4444;
--color-danger-bg: #fef2f2;
--nav-height: 64px;
--header-height: 56px;
--safe-bottom: env(safe-area-inset-bottom, 0px);
```
