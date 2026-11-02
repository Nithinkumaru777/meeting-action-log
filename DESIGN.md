# DESIGN.md — MeetingActionLog

> **Design system:** Signal Ledger v2
> **Read first:** `docs/design-spec.md` covers the palette, fonts and three references, with sources. This file explains how to build it. `docs/prototype.html` is the clickable reference for every screen, colour, icon and animation.
> Order of authority: design-spec.md → DESIGN.md → prototype.html.
>
> Project by **NITHIN KUMAR U** · USN **2102508611**

---

## 0. Rules the build must never break

1. **No emojis anywhere.** A test (`client/src/__tests__/no-emoji.test.ts`) scans `client/src/**` and seed data for `/\p{Extended_Pictographic}/u` and fails the build on any match. Symbols are animated icons only (§6).
2. **No generic AI-UI patterns** (design-spec.md §6): no purple/blue gradients, no Inter, no grid of rounded shadow cards, no centered hero + 3-icon row. Sections are divided by **rules**, data lives in **ledger rows**.
3. **Colour means state.** Teal is the brand. Coral = overdue, amber = due today/soon, done-green = done, fuchsia = decision without a task. No other uses.
4. **Every action responds within 100ms**, and every async action shows loading → success or error.
5. **Every animation has a visible cause** and respects `prefers-reduced-motion`.
6. **Before shipping any screen**, the PR/step result states which reference (R1 Linear, R2 Plausible, R3 Todoist) shaped its layout.

---

## 1. Design type

| Decision | Choice |
|---|---|
| Type | Data-dense productivity tool, **editorial ledger** treatment |
| Ground | Cloud Dancer paper (`#F0EEE9`), raised sheets `#F8F7F3` for drawers and inputs |
| Structure | Solid **Transformative Teal spine** (sidebar, 232px) + content (max 1240px). Each page opens with a **masthead**: mono date eyebrow, large Newsreader title, one-line dek, and a 2px ink rule under it |
| Containers | **No card boxes.** Sections start with a 1px ink top rule (3px coral for Overdue, 3px fuchsia for decisions). Rows are separated by 1px hairlines |
| Data rows | **Ledger rows** with a fixed 62px "day column" on the left (big serif number + mono label: `06 D LATE`, `00 TODAY`, `12 NOV`) |
| Numbers | Big Newsreader figures in a **figures strip** (4 columns divided by vertical rules), rolling odometer digits |
| Theme | Light + designed dark (teal-black ground `#0C1716`). Follows system setting, user override saved in `localStorage` `mal-theme` |

---

## 2. UI stack

| Concern | Package |
|---|---|
| Build | `vite`, `@vitejs/plugin-react`, TypeScript strict |
| UI | `react@19`, `react-router` v7 |
| Styling | `tailwindcss@4` + `@tailwindcss/vite`; tokens in `@theme` (§3) |
| Primitives | **shadcn/ui** (Radix): dialog, sheet, select, popover, calendar, tooltip, checkbox, dropdown-menu, command, scroll-area. **Restyle every one to these tokens**: radius 3–6px, rules not shadows, mono labels. Never ship shadcn defaults |
| Motion | **`motion`** (`motion/react`), `<MotionConfig reducedMotion="user">` at the root |
| Icons | `lucide-react` geometry inside our `<AnimatedIcon>` (§6), stroke **1.75** |
| Toasts | `sonner` with custom render (§7.8) |
| Forms | `react-hook-form` + `@hookform/resolvers` + `zod` (shared schemas) |
| Data | `@tanstack/react-query` v5 |
| Dates | `date-fns` |
| Charts | Own tiny SVG components for the sparkline and bar list (they are ~40 lines each and must match the prototype exactly). Recharts not needed |
| Fonts | `@fontsource-variable/newsreader`, `@fontsource/schibsted-grotesk` (400/500/600/700), `@fontsource/ibm-plex-mono` (400/500) |
| Utils | `clsx`, `tailwind-merge` |

---

## 3. Tokens (`client/src/styles/tokens.css`)

### Light
```css
--paper:#F0EEE9; --paper-2:#E6E3DB; --sheet:#F8F7F3; --rule:#D3CEC3; --rule-2:#B4AEA1;
--ink:#13201F; --ink-2:#47524F; --ink-3:#5A6663;
--teal:#0F5257; --teal-2:#0B4246; --teal-ink:#F0EEE9; --teal-soft:#D3E5E2;
--coral:#A8321F; --coral-hi:#E0533A; --coral-soft:#F5DDD5;
--amber:#8A5A00; --amber-hi:#E3A21A; --amber-soft:#F4E5C2;
--done:#2F6B3A; --done-hi:#4E9B5C; --done-soft:#DCEAD3;
--fuchsia:#A0216E; --fuchsia-hi:#D63C97; --fuchsia-soft:#F5D9E8;
--spine:#0F5257; --spine-ink:#F0EEE9; --spine-2:rgb(240 238 233/.76); --spine-line:rgb(240 238 233/.16); --spine-hi:rgb(240 238 233/.09);
--shadow:0 18px 50px -18px rgb(19 32 31/.35);   /* drawers + toasts ONLY */
```
### Dark (`[data-theme="dark"]` and system dark without override)
```css
--paper:#0C1716; --paper-2:#13211F; --sheet:#101D1C; --rule:#253634; --rule-2:#3D5350;
--ink:#ECEAE4; --ink-2:#AAB6B2; --ink-3:#909D99;
--teal:#6CC6BC; --teal-2:#8AD6CD; --teal-ink:#0C1716; --teal-soft:#173533;
--coral:#FF8C75; --coral-hi:#FF6B50; --coral-soft:#3A1C16;
--amber:#F0C05E; --amber-hi:#F0C05E; --amber-soft:#33280F;
--done:#93D69E; --done-hi:#6DBF7B; --done-soft:#16301B;
--fuchsia:#F48CC9; --fuchsia-hi:#F06BB6; --fuchsia-soft:#3A1630;
--spine:#0A2627; --spine-ink:#ECEAE4;
```
Rules: `-hi` colours are for marks only (dots, bars, borders, burst particles), never body text. Avatars: hue from DB, `hsl(h 45% 86%)` / `hsl(h 50% 26%)` light, `hsl(h 30% 22%)` / `hsl(h 50% 84%)` dark.

### Type scale
| Role | Font | Size / LH | Notes |
|---|---|---|---|
| Masthead H1 | Newsreader 500 | 52/52 (38 mobile), tracking −0.025em | One italic teal word allowed (`<em>`) |
| Figure | Newsreader 500 | 64/64 (46 mobile), tabular | Odometer |
| Section H2 | Newsreader 500 | 26/30 | Mono count beside it (`04`) |
| Drawer H2 | Newsreader 500 | 30/32 | |
| Meeting title in row | Newsreader 500 | 21/25 | |
| Decision quote | Newsreader *italic* 400 | 19/26 | Wrapped in curly quotes |
| Body / UI | Schibsted Grotesk 400–600 | 15/22 | Buttons 600 14px |
| Label / eyebrow / tag | IBM Plex Mono 500 | 11–12.5, UPPERCASE, +0.06–0.08em | |
| Day column | Newsreader 26 + Plex Mono 9.5 caps | | |

### Space, radius, lines
4px grid (4 · 8 · 12 · 16 · 22 · 26 · 40). Radius: tags 3px, inputs 5px, buttons 6px, avatars round, bottom sheet 12px top. Lines: hairline 1px `--rule`; section top 1px `--ink` (3px `--coral-hi` / `--fuchsia-hi` for the two differentiator sections); masthead 2px `--ink`.

---

## 4. Layout (references in brackets)

- **Spine** [R1]: teal, brand mark (cloud-dancer square + list-check icon), nav with mono count badges (coral for Overdue, fuchsia for Decision inbox), sliding active indicator (soft fill + 2px left bar), and at the bottom an **Open actions** odometer. That counter is where converted decisions fly to.
- **Top bar**: mono breadcrumb (`LEDGER / TODAY`) on the left; search (`/` shortcut), theme toggle and **New meeting** on the right. Sticky, blurred paper, hairline appears after scroll.
- **Masthead** on every page.
- **Figures strip** [R2]: 4 columns divided by vertical rules, mono eyebrow with icon, Newsreader figure, one-line sub. Completion uses a **20-tick ruler** (every 5th tick taller) instead of a ring.
- **Sections** [R3]: open, rule on top, H2 + mono count + mono link (`ALL OVERDUE →`), a one-line note, then rows.
- **Ledger row** (action) [R1]: `62px day | 22px checkbox | title + meta (priority bars, meeting link, From-decision tag, In-progress tag) | owner | due tag (+ quick actions)`. Container query < 620px: owner + due wrap under the title.
- **Decision row**: `30px icon | italic quote + meta | status tag + buttons (No action, Convert to task)`. Container query < 560px: actions wrap under.
- **Meeting row (timetable)**: `86px date (big day + MON · WED) | title (serif) + agenda line + flags | time/duration mono | avatar stack | progress meter + "x/y actions done" | chevron`.
- **Priority** is a 4-bar signal glyph (low 1 bar … critical 4 coral bars), never just a coloured dot.
- **Tabs**: text tabs with mono counts and a sliding 2px ink underline (not pill segmented controls).
- **Drawer**: sheet colour, mono eyebrow + serif title with one coloured italic word ("Give this decision an *owner*"), 2px ink rule under the header. The decision is shown as a pull quote with a big fuchsia opening quote mark. Priority picker is a 4-segment control with a sliding ink fill.

Screens: §9.

---

## 5. Components

| Component | Spec |
|---|---|
| `Button` | variants `primary` (teal, wipes to ink on hover), `line` (1px border in `--wipe` colour, wipes fill + inverts text), `line dec` (fuchsia, only for Convert to task), `ghost` (text with an underline that draws on hover). Sizes 40 / 32 / icon. States in §7.3 |
| `Tag` | 22px, radius 3, Plex Mono 11 caps, soft bg + text colour; `outline` variant = inset 1px border; icon 13px |
| `PriorityBars` | 4 bars 3px wide (4/7/10/12px tall), filled count = level, critical = coral |
| `DayColumn` | big number + caps label; colour by `dueState` (late coral, soon amber, done ink-3 with green label) |
| `Checkbox` | 20px, radius 3, 1.5px ink-2 border; hover green-soft; checked done-hi + tick draws |
| `Odometer` | digits in 1em windows, each column a 0–9 stack, `translateY(-n×10%)`, 700ms ease-out, 70ms stagger |
| `FiguresStrip`, `Ruler`, `Sparkline`, `BarList` | as in the prototype; sparkline teal 2.25px line, 10% area, dashed max line, end dot with paper ring |
| `ActionRow`, `DecisionRow`, `MeetingRow` | §4 |
| `Masthead`, `Section`, `Tabs`, `Sheet`, `Toast`, `EmptyState`, `Skeleton`, `ErrorState`, `CommandPalette`, `ThemeToggle` | as prototype |

---

## 6. Animated icons (emoji replacement)

`<AnimatedIcon name size trigger="parent-hover|mount|loop|none" label?>`. Geometry from `lucide-react`, stroke 1.75, `currentColor`. Moving parts (calendar rings, trash lid, chart bars, clock hand, second person, small star) are wrapped in `<motion.g>`. Plays when the nearest `[data-icon-host]` is hovered **or** focus-visible. Loops are allowed only for the overdue flame (Overdue page + Overdue figure when > 0) and the "Due today" alarm on the Overdue page.

| Replaces | Icon | Motion | Used for |
|---|---|---|---|
| 🏠 ▦ | `layout-grid` | pop 1→1.2→1 | Today nav |
| 📅 | `calendar` | rings hop −3px | Dates, Meetings nav, "+3 days" |
| ✅ | `circle-check` | tick `pathLength 0→1`, 400ms | Done |
| 🔥 | `flame` | flicker scaleX/Y, origin bottom | Overdue |
| ⏰ | `alarm-clock` | shake ±14° | Due today |
| 🕒 | `clock` | hand spins 360° | Due in 1–3 days |
| 💡 | `lightbulb` | glow drop-shadow | Decisions |
| ✨ | `sparkles` | big star twists 20° + small star blinks | Convert to task |
| 🔗 | `link` | pop | From decision / N tasks |
| 🚫 | `ban` | pop | No action needed |
| 👥 | `users` | back person slides 2.5px | Attendees, owners |
| 👤 | `user` | pop | Owner |
| 📝 | `file-text` | lines draw | Agenda |
| 📋 | `list-checks` | ticks draw | Actions, brand mark |
| 📊 | `chart-column` | bars grow, 50ms stagger | Charts |
| ⚠️ | `triangle-alert` | pulse | Errors |
| 🗑️ | `trash-2` | lid lifts | Delete |
| 🔍 | `search` | lens scans | Search |
| ➕ | `plus` | turns 90° | Create |
| ➡️ / ⬅️ | `arrow-right` / `arrow-left` | nudge ±3px | Links, back |
| ↩️ | `undo-2` | rotates −40° and back | Undo |
| ✖️ | `x` | turns 90° | Close |
| 🎨 | `palette` | shake | Design system (dev) |
| 🌙 / ☀️ | `moon` / `sun` | swap + View Transition cross-fade | Theme |
| 🎉 | none | 10-particle burst (teal + done-hi), 420–580ms | Done, task created |

---

## 7. Motion

### 7.1 Tokens (`lib/motion.ts` + CSS vars)
```ts
export const t = { feedback: .1, state: .22, layout: .36, travel: .65 };
export const ease = { out:[.22,1,.36,1], inOut:[.65,0,.35,1] };
export const stagger = .035;
```
Feedback ~100ms, state 200–300ms, layout ≤ 400ms; only the ghost flight is 650ms because it travels furthest. Enters slower than exits. No springs with visible bounce on data.

### 7.2 Page change
`document.startViewTransition` cross-fade (fallback: opacity 300ms). Masthead H1 reveals from `clip-path: inset(0 0 100% 0)` + `y 14 → 0`, 420ms. Rows/sections rise `y 6 → 0`, opacity, 320ms, 35ms stagger. Figures roll from 0 (odometer). Ruler ticks fill one by one (28ms stagger). Meters and bars grow `scaleX 0 → 1` (700ms).

### 7.3 Buttons
| State | Behaviour |
|---|---|
| Hover | **Ink wipe**: a fill sweeps left → right (`background-size 0% → 100%`, 220ms ease-out); `line` buttons invert text colour; icon plays its motion |
| Press | `translateY(1px)` + 2px inset shadow, 100ms |
| Focus-visible | 2px teal outline, 3px offset |
| Disabled | opacity .45, no wipe |
| Loading | label fades + scales to .92, spinner (17px ring), `aria-busy`, width locked |
| Success | background done-hi, check path draws (320ms), resets after ~700ms |
| Error | 320ms shake + error toast |
Ghost buttons: underline draws left → right on hover instead of a fill. Links (`ALL OVERDUE →`) do the same in mono caps.

### 7.4 Done toggle (pen stroke)
Checkbox fills done-hi, tick draws (260ms, 40ms delay), 10-particle burst, then a **1.5px strike line draws across the title** (`background-size 0% → 100%`, 320ms) and the title fades to ink-3. After ~420ms the list re-sorts with `layout`. Toast with Undo. Optimistic, rolled back on API error.

### 7.5 Decision → task (signature)
1. Submit: button loading → success check.
2. Sheet closes (exit 360ms).
3. A fuchsia **"New task" ghost tag** appears at the decision row and arcs (midpoint 90px above the straight line) to the **Open actions** figure if it's on screen, otherwise the spine counter (on mobile, the Meetings tab), shrinking to .35 scale, 650ms ease-in-out.
4. At the same time the decision row folds away: `x 0 → 24` + fade, then height → 0 (420ms).
5. On landing the counter **rolls** to the new value and bumps (scale 1.12, 500ms).
6. The new action row flashes teal-soft for 1.4s wherever it is visible. Toast "Decision turned into a task · Owner · due date" + Undo.

### 7.6 Other list changes
Dismiss decision and "+3 days" on overdue use the same fold-away exit. Tabs: the list fades out (120ms), re-renders, then staggers back in while the underline slides (320ms). Meeting row hover: the day number turns teal and shifts 3px, and a paper-2 gradient runs under the row. Avatar stacks fan out by 3px × index.

### 7.7 Forms
Labels are mono caps. Focus: teal border + 1px inner ring. Error: coral border, the field shakes (320ms), the message expands with a pulsing alert icon, and it clears as soon as the user types. Submitting with errors also shows a toast. The priority picker's ink fill slides to the chosen segment (300ms).

### 7.8 Sheet & toasts
Sheet slides in from the right, `x 104% → 0`, 400ms ease-out (exit 360ms). Scrim fades to `rgb(8 18 17/.42)`. Fields stagger in (35ms, 140ms delay). On mobile it is a bottom sheet with a 2px ink top border. Toasts: sheet colour, 1px rule-2 border, a 28px tinted icon tile, slide up 14px (300ms), exit 200ms, a 2px teal drain bar (4.5s, pauses on hover), Undo on every state change, max 3 visible, shown bottom-left while a sheet is open.

### 7.9 Loading / empty / error
Skeletons shaped like ledger rows with a shimmer (1.3s). Empty state: outlined clipboard whose two ticks draw, hold and fade on a loop, an italic serif title and one line of help, left-aligned. Error state: alert icon, "We couldn't reach the server", Retry.

### 7.10 Loops allowed
Overdue flame, the coral pulse dot by the Overdue heading, empty-state ticks. Nothing else loops.

---

## 8. Screens

| Route | Contents (see prototype) | Reference |
|---|---|---|
| `/` Today | Masthead "Who owns *what*, and what is slipping" → figures strip → two columns: **Overdue** (coral rule, 4 rows) and **No owner yet** (fuchsia rule, 3 decisions) → "Completed per week" + "Late, by owner" → "Coming up" timetable | R2 + R1 |
| `/meetings` | Masthead → text tabs All / Upcoming / Held with counts → timetable rows | R1 |
| `/meetings/:id` | Back link → masthead (mono meta eyebrow, serif title, italic agenda, avatars) → figures strip (decisions, done x/y, overdue, without tasks) → Decisions (quotes + inline "Log" form) and Action items (ledger) | R1 + R3 |
| `/overdue` | Masthead "*Overdue*" → 4 figures → one coral-ruled section per owner with ledger rows + "+3 days" | R1 |
| `/decisions` | Masthead "Decision *inbox*" → tabs Without tasks / Converted / No action → decision rows | R3 |
| `/members` | Masthead → ledger of members (avatar, name, email, role, open, overdue) → sheet for add/edit; delete blocked with 409 toast | R1 |
| `/design-system` (dev only) | Mirror of the prototype's Design System page | — |
| `*` | 404 masthead "Page *not found*" + link to Today | — |

Breakpoints: ≥ 1100 full · 760–1099 figures 2×2, columns stack, timetable drops time + avatars · < 760 spine becomes a teal bottom tab bar, breadcrumb hides, masthead 38px, sheet from the bottom, 16px gutters.

---

## 8.1 Guided demo (tour)
A **Guided demo** button sits in the top bar (play icon, a pulsing fuchsia dot, `line` style with a fuchsia ink wipe; icon only on mobile). It starts an 8-step tour:
1. Figures strip ("The day at a *glance*") 2. Overdue section 3. "No owner yet" section 4. First **Convert to task** button in the Decision inbox 5. Open-actions counter in the spine (Meetings tab on mobile) 6. First owner group on Overdue 7. Meetings tabs 8. Theme toggle.
- **Spotlight:** a fixed ring around the target (8px radius, a 2px Cloud Dancer outline + a pulsing outer ring). Everything else is dimmed with a `0 0 0 9999px rgb(8 18 17/.58)` shadow. The target stays clickable, so users actually try each step.
- **Popover:** ink background with paper text (inverts in dark mode) and a caret pointing at the target. It shows a mono "Step N of 8" label, a Newsreader title with one fuchsia italic word, a short body, and a "Try it" line with a pointer icon. The footer has 8 progress ticks, then Back, End and Next (paper button that wipes to fuchsia; "Finish" on the last step).
- **Movement:** the ring and popover glide to each new target (380ms ease-out). The tour changes route when needed and waits for the page to render. The target is scrolled to the centre first if it's off screen.
- **Keys:** → next, ← back, Esc end. While a sheet is open the tour hides and comes back when it closes. At the end a toast says "Demo finished".
- Build it with `motion/react` (`layout` for ring/popover), steps defined in `features/tour/steps.ts`, and target elements marked `data-tour="<id>"` (never fragile CSS selectors). E2E: complete the whole tour 100× on desktop and mobile.

## 9. Copy
Buttons say what happens ("Create task", "Log", "+3 days", "No action"). Errors say how to fix it ("Pick who owns this task.", "The due date can't be in the past.", "Add at least one attendee."). Empty states are short and in italic serif ("Nothing overdue", "Every decision has an owner"). Dates `d MMM`, times 24h, mono caps in metadata (`9D AGO`, `45 MIN`).

## 10. Accessibility
Real buttons/links/inputs with labels; icon-only buttons have `aria-label`. Visible teal focus ring. Odometers carry `role="img"` + `aria-label` with the real value. Colour is never the only signal: every state has an icon and a word. Form errors use `aria-invalid` + `aria-describedby`. Toast region is `aria-live="polite"`. Reduced motion is honoured. Lighthouse Accessibility ≥ 95.
