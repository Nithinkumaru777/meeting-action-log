# design-spec.md — MeetingActionLog visual direction

> Read this before writing any UI code. Every colour, font and layout decision must trace back to a line in this file or to one of the three references. If something isn't covered here, follow `docs/DESIGN.md`; if it isn't there either, pick the plainest option and write down why.
>
> Project: **MeetingActionLog** · Student: NITHIN KUMAR U · USN 2102508611
> Live prototype: `docs/prototype.html`

## 1. Direction in one line

**A ledger on paper.** The page ground is Cloud Dancer off-white and the sidebar ("spine") is solid Transformative Teal. Sections are divided by rules, not boxes, and every colour other than teal stands for a state.

## 2. Palette (and where each colour comes from)

| Role | Name | Light | Dark | Source |
|---|---|---|---|---|
| Page ground | **Cloud Dancer** | `#F0EEE9` | `#0C1716` | Pantone Color of the Year 2026 (PANTONE 11-4201). Published hex is #F0EEE9 |
| Brand, primary buttons, spine | **Transformative Teal** | `#0F5257` | `#6CC6BC` (text/buttons), spine `#0A2627` | WGSN × Coloro Colour of the Year 2026 (Coloro 092-37-14), a deep blue-green. WGSN publishes a Coloro code, not a hex, so `#0F5257` is our screen match |
| Text and rules | Teal ink | `#13201F` | `#ECEAE4` | Near-black tinted toward teal so the page reads as one colour family |
| Overdue only | Signal coral | text `#A8321F`, marks `#E0533A`, bg `#F5DDD5` | `#FF8C75` / `#FF6B50` / `#3A1C16` | Complementary to teal, so late work stands out most |
| Decision without a task | Electric fuchsia | text `#A0216E`, marks `#D63C97`, bg `#F5D9E8` | `#F48CC9` / `#F06BB6` / `#3A1630` | WGSN × Coloro S/S 26 key colour "Electric Fuchsia" |
| Due today / soon | Amber haze | text `#8A5A00`, marks `#E3A21A`, bg `#F4E5C2` | `#F0C05E` / `#33280F` | WGSN × Coloro S/S 26 key colour "Amber Haze" |
| Done | Done green | text `#2F6B3A`, marks `#4E9B5C`, bg `#DCEAD3` | `#93D69E` / `#6DBF7B` / `#16301B` | Green family, kept bluer than teal so the two never get confused |
| Hairlines | Rule | `#D3CEC3`, strong `#B4AEA1` | `#253634` / `#3D5350` | |
| Raised sheet (drawers, inputs) | Sheet | `#F8F7F3` | `#101D1C` | |

Every text/background pair in the table passes WCAG AA (4.5:1). Never brighten the text values; the `-hi` values are for marks (dots, bars, borders) only.

## 3. Typography

| Role | Font | Why |
|---|---|---|
| Display: page titles, big figures, decision quotes (italic) | **Newsreader** (variable, optical sizing, 400–600 + italic) | 2026 type trend reports point to serifs returning and to variable fonts with optical sizing. Decisions are statements, so they are set as italic quotes |
| UI and body | **Schibsted Grotesk** (400–700) | A grotesk with character that isn't Inter, and stays readable at 13–15px |
| Data: dates, times, counts, labels, tags | **IBM Plex Mono** (400–500), uppercase, +0.06–0.08em tracking for labels | Tabular digits, so ledger columns line up |

Self-host with `@fontsource-variable/newsreader`, `@fontsource/schibsted-grotesk`, `@fontsource/ibm-plex-mono`. Never use Inter, Roboto, Arial or a system-ui-only stack as the visible font.

## 4. References (layout must trace back to these)

| # | Reference | What we take | Where it shows up |
|---|---|---|---|
| R1 | **Linear** (its 2026 interface refresh) | Dense information that doesn't overwhelm: softer borders, quieter separation, list rows over cards, a compact sidebar | Ledger rows for actions and decisions, the spine sidebar, the sliding nav indicator |
| R2 | **Plausible Analytics** (public dashboard) | A one-page dashboard: plain big numbers and restrained single-line charts, no chart junk | The figures strip (4 numbers separated by rules), one sparkline, one bar list |
| R3 | **Todoist** design language | Hairlines, captions and headings on one colour note, like ink on paper | Rules instead of boxes on Cloud Dancer, mono captions, the "ink" strike-through when a task is done |

## 5. Motion rules (from published timing guidance)

- Feedback (press, toggle, hover colour): **~100ms**. State changes (tabs, wipes, tags): **200–300ms**. Larger moves (drawer, collapse): **≤ 400ms**. Only the "ghost flies to counter" travel goes to 650ms, because it covers the most distance.
- Enters a little slower than exits. Easing is never linear: ease-out `cubic-bezier(.22,1,.36,1)` for enters, ease-in-out `cubic-bezier(.65,0,.35,1)` for travel.
- Every animation must answer "what just changed?". If it doesn't, cut it.
- `MotionConfig reducedMotion="user"` + a CSS `prefers-reduced-motion` override everywhere.

**Signature animations** (these are what make the app feel like itself):
1. **Ink wipe buttons**: fill sweeps left → right in 220ms; press sinks 1px.
2. **Pen-stroke done**: the checkbox tick draws, then a strike line draws across the task title.
3. **Odometer figures**: digits roll vertically to the new value, 70ms stagger per digit.
4. **Decision → task flight**: on convert, a fuchsia "New task" tag arcs from the decision to the Open-actions counter, the counter rolls up and bumps, and the decision row folds away.
5. **Headline reveal**: the page title wipes up from a clip mask on route change, with a View Transitions cross-fade.
6. **Ledger hover**: the day column slides 3px and a paper-coloured gradient runs under the row.

## 6. Refused patterns (reject in review)

- Purple/blue gradients, glassmorphism blobs, glowing hero orbs
- Inter / default system sans as the visible font
- Grids of identical rounded cards with soft drop shadows (use rules and rows)
- Centered hero + 3-icon feature grid
- Emoji anywhere (animated Lucide-geometry icons only, see DESIGN.md §6)
- Colour used as decoration: every hue except teal means a state
- Routine animations over ~400ms, bouncy springs on data, motion with no visible cause

## 7. Sources

- Pantone Cloud Dancer #F0EEE9: https://www.w3schools.com/colors/colors_2026.asp · https://www.dezeen.com/?p=2275626
- WGSN × Coloro Transformative Teal, and the S/S 26 key colours: https://www.wgsn.com/en/blogs/coloro-x-wgsn-introduce-key-colours-ss-26 · https://texspacetoday.com/key-colours-for-spring-summer-2026-by-coloro-x-wgsn
- Linear design refresh: https://linear.app/blog/behind-the-latest-design-refresh
- SaaS dashboard references (Linear, Stripe, Vercel, Attio, Plausible…): https://adminlte.io/?p=6614
- Todoist design language (hairlines like ink on paper): https://www.shadcn.io/design/todoist/raw
- Motion timing (NN/g-based 100ms / 200–300ms / ≤400ms; Motion `reducedMotion="user"`): https://www.buildmvpfast.com/blog/micro-interactions-saas-state-feedback-framer-motion-2026 · https://valhead.com/?p=2978
- Typography trends (serif comeback, variable fonts with optical sizing): https://www.designstudiouiux.com/blog/typography-trends-in-web-design-2023/ · https://www.inspoai.io/blog/typography-trends-2026
