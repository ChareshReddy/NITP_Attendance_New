# Prompt for the coding agent

Copy everything below the line into your coding agent (Claude Code, Cursor, etc.) and attach `NITP HRMS.dc.html` as the visual reference.

---

You are restyling our existing **NITP Attendance & HRMS** app (Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Prisma, PostgreSQL, NextAuth JWT). The attached file `NITP HRMS.dc.html` is the approved design reference. Match its layout, components, colours, typography, spacing and animations exactly. **Do not change business logic, Prisma schema, API routes, auth or data flow.** Only the UI layer changes: layouts, components, Tailwind config and global CSS. Keep all existing features working for the three roles (HR Admin, Team Leader, Employee).

## 1. Setup
- Fonts via `next/font/google`: **Bricolage Grotesque** (500/600/700, headings and big numbers), **Manrope** (400–800, body/UI), **JetBrains Mono** (500/600, times, money, IDs, IPs). Expose them as CSS variables `--font-display`, `--font-sans` and `--font-mono` and map them in Tailwind `fontFamily` as `display`, `sans` and `mono`.
- Extend `tailwind.config` with the tokens below. Keyframes go in `globals.css`.
- Respect `prefers-reduced-motion`: disable all keyframe animations and hover transforms.

## 2. Colour tokens (white theme)
- Page background `#f7f7f5`; surface/card `#ffffff`; border `#ecebe7`; input border `#e6e4df`; subtle row/hover `#fafaf8`; muted fill `#f3f2ef`.
- Ink `#16161a`; secondary text `#6b6b74`; muted text `#8a8a93`; label text `#5c5c66`.
- Primary button: ink `#16161a`, hover `#33333b`. Focus ring: border `#7c5cff` + `0 0 0 4px #efe9ff`.
- **Tones.** Every coloured card, badge and chart uses one of these triples: `bg` (card fill), `fg` (text on the fill), `ac` (accent, dots and bars).
  - mint `#e3f6ec / #0c6b44 / #22a06b`: present, approved, paid, completed, attendance, payroll
  - sky `#e4efff / #1d56b0 / #3b82f6`: WFH, submitted, info, performance
  - lav `#efe9ff / #5236b8 / #7c5cff`: brand accent, track sheet, trainings, onboarding
  - peach `#ffebdf / #a8480f / #f97316`: exit, changes requested
  - lemon `#fff4c9 / #7a5a00 / #e0a800`: late, pending, tasks, employees
  - rose `#ffe5eb / #a61e45 / #f43f5e`: rejected, LOP, leave, early leaving, punch out
  - gray `#f1f0ed / #55555e / #9a9aa3`: weekend, not punched, to-do
- Status → tone map: Pending=lemon, Approved=mint, Rejected=rose, Submitted=sky, Changes requested=peach, Paid=mint, Draft=lemon, Active=mint, Onboarding=lav, In=mint, Late=lemon, WFH=sky, On leave=lav, Not punched=gray. Build one `<StatusBadge status>` component from this map.
- Performance bands: Red 0–40 (rose), Yellow 40–60 (lemon), Green 60–85 (mint), Blue 85–100 (sky).
- Avatars: initials on a pastel bg picked deterministically from the six tone bgs.

## 3. Type scale
- Page title: display 700 25px, letter-spacing −0.025em. Greeting: display 700 32px.
- Card title: display 600 17px. Big stat number: display 600 34–36px, letter-spacing −0.03em.
- Eyebrow/label: sans 800 11px, uppercase, letter-spacing 0.08em, in the tone `fg`.
- Body: sans 600 13px. Meta: sans 500 11.5–12.5px muted. Numbers/times/money: mono 600 12–13px; the live clock is mono 600 34–46px.

## 4. Shape, spacing, elevation
- Radii: cards 22px (24px for hero cards), inner tiles 14px, inputs/buttons 10–12px, badges and pills fully rounded (20px), avatars circles, tag tiles 11–12px.
- Card padding 22px; grid gaps 16px (14px inside dense grids); page padding 26px 30px; content max-width 1380px.
- No heavy shadows at rest. Hover: `translateY(-3px/-4px)` + `0 16px 30px -16px rgba(20,20,30,.3)`. Popovers: `0 18px 40px -18px rgba(20,20,30,.3)`.
- Decorative motif: a large faint ring (circle with a 20px border in the tone `ac` at 13% opacity) bleeding off the top-right corner of coloured stat cards. No gradients except the dark punch card's blurred lavender glow.
- Layouts reflow: `grid-template-columns: repeat(auto-fit, minmax(220–340px, 1fr))`. Avoid fixed widths except the sidebar.

## 5. App shell
- **Sidebar** (240px, white, sticky, right border): a logo tile (38px ink square with four mini squares in mint/sky/peach/lav) plus "NITP People / Attendance & HRMS". Nav items use a 9px tone-coloured square, label and an optional rose count badge; the active item is ink bg with white text. At the bottom sit the user card (lav bg, avatar, name, title). Keep the role-based nav filtering we already have; the "View as" switch is a demo control and is only needed in dev.
- **Top bar** (sticky, `rgba(247,247,245,.86)` + `backdrop-blur`): eyebrow section label + page title, a "Jump to a page…" search (filters nav, Enter navigates), a notification bell with rose count and an activity popover, and an avatar chip with role and employee ID in mono.
- Nav → section eyebrow: Dashboard·Overview, Attendance·Time, Team Live·Time (TL/HR), Track Sheet·Work, Tasks·Work, Leave & WFH·Time off, Payroll·Money, Performance·Growth, Trainings·Growth, Exit·Lifecycle, Employees·People (HR), Audit Log·Compliance (HR).

## 6. Reusable components to create (in `components/ui/`)
`Card`, `ToneCard(tone)`, `StatCard(tone,label,value,sub,href)`, `StatusBadge`, `Pill`, `Avatar`, `ProgressBar(tone)`, `RingProgress` (conic-gradient donut), `Gauge` (semicircle SVG, 4 band arcs, animated needle), `BarChart` (simple div bars that grow, or Recharts styled to match: no gridlines except dashed, rounded bars, tone colours), `TrendChart` (Recharts AreaChart, lav stroke 3px, 16% fill), `Segmented` tabs (muted track, white active pill), `FormField` (label 700 11.5px + input), `Kanban` column/card, `Stepper` (segmented progress bars), `Modal` (blurred ink overlay), `Toast` (ink pill, bottom-right, tone dot).

## 7. Screens (map each to our existing routes and data)
- **Dashboard:** greeting + date + shift; a mint "Live · clock" pill; 4 role-specific StatCards (Emp: hours today, leave balance, open tasks, score; TL: team present, approvals, sheets to review, team score; HR: headcount, present today, Nov payroll, open exits); a dark ink punch card (conic ring of elapsed time / 9h shift, mono clock, status pills, Punch In mint / Punch Out rose); a weekly hours bar chart; "My tasks" or "Needs your approval"; upcoming trainings; an activity feed.
- **Attendance:** a lav hero with date, big mono clock, a circular punch button with a ping animation, status pills (On time / Late / Early leaving) and a 2×2 meta grid (in, out, IP, timezone); a month calendar heatmap (tone per status, today outlined in ink, future days dashed) with 4 summary tiles; a records table; a regularisation form + my requests; and for TL/HR a lemon approvals card with Approve (mint) / Reject (rose outline).
- **Team Live (TL/HR):** clickable summary tiles as filters (ink 2px border when active) and member cards with a status dot on the avatar, punch-in time and an hours progress bar.
- **Track Sheet:** a log form (date, hours, project, description, link, file); a mint weekly card (hours / 40h, progress bar, per-project bars); an entry list with project chip, attachment chips and status; for TL "Request changes" / "Approve".
- **Tasks:** an inline add/delegate form bar; 4 tone columns (To do gray, In progress sky, Review lav, Completed mint) with priority badges (High rose, Medium lemon, Low mint), an assignee avatar, due date and ←/→ move buttons. Drag-and-drop is optional.
- **Leave & WFH:** 4 quota ToneCards with RingProgress; Segmented tabs Apply leave / Work from home; a live LOP preview strip (mint = no LOP, rose = LOP days + ₹ amount); a requests list with tag tiles, LOP badge and inline approve/reject for managers.
- **Payroll:** HR gets a dark run card with a 5-step progress (shimmer on the active step); month chips; a payslip card (mint header with big net pay, Earnings/Deductions columns in mono, DRAFT watermark when unprocessed, Download button); a sky salary-structure stacked bar + legend; a net pay trend; an HR payroll register table.
- **Performance:** Gauge + big score + band badge + 4 band tiles (active one outlined); a lav score trend; KPI goals as tone rows with progress sliders (weighted score); a TL appraisal form (sky); an HR override form (rose) that writes to the audit log.
- **Trainings:** HR schedule bar; tone cards with a date tile, status pill, Enroll / Mark attended / Withdraw / View certificate; a certificate modal.
- **Exit:** Emp gets a resignation form + a peach "How exit works" list, then a 6-step Stepper with Withdraw (before HR clearance); TL/HR get a request list with progress and "Advance → next step".
- **Employees (HR):** a lemon onboarding form and a directory with Active/Onboarding badges, a 5-step onboarding progress and a "Done ✓" button.
- **Audit Log (HR):** search + Export CSV; a timeline with mono timestamps and tone dots with soft halos.

## 8. Motion (CSS only, or framer-motion if already installed)
- `fadeUp` (opacity 0→1, translateY 14px→0, 0.5s `cubic-bezier(.2,.7,.2,1)`) on every page and card; stagger stat cards by 70ms.
- `grow` (scaleY 0→1, origin bottom, 0.7s) on bars; staggered 60–70ms.
- `ping` (scale 1→1.55, fade) on the punch button; `pulse` on live dots.
- `pop` (scale .94→1) for popovers, modals and kanban cards; `toastIn` for toasts.
- `shimmer` gradient sweep on in-progress steps. Gauge needle: `transform 1s cubic-bezier(.3,1.4,.5,1)`. Progress bars: `transition: width .6–.8s`.

## 9. Rules
- Stay on the white theme; colour lives in cards, badges and charts only.
- No emoji icons; use tone squares/dots or our existing icon set (lucide-react is fine at 16px, stroke 1.75).
- All text contrast ≥ 4.5:1 (use the tone `fg` on tone `bg`).
- Buttons ≥ 36px tall, clear hover and active states, visible focus rings.
- Use toasts for every create/approve/reject action and write each action to the audit log, as we already do.
- Work screen by screen: shell and tokens first, then Dashboard, Attendance, and the rest. After each screen, run the app and confirm it matches the reference before moving on.
