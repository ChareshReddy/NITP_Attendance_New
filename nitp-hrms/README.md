# NITP People — Attendance & HRMS

Next.js 16 + Prisma + Supabase Postgres. Sign-in for HR Admin, Team Leaders and Employees, built to the approved NITP People design.

## What's inside

| Area | Employee | Team Leader | HR Admin |
|---|---|---|---|
| Dashboard | Hours, leave balance, tasks, score | Team present, approvals, sheets to review | Headcount, present today, payroll, exits |
| Attendance | Punch in/out (IP + timezone, late / early flags), calendar, regularisation | + approve team regularisations | + approve anyone's |
| Team Live | — | Live status of own team | Everyone |
| Track Sheet | Log hours, link, attachment (≤ 2 MB) | Review team entries | Review all |
| Tasks | Own board | Assign to team | Assign to anyone |
| Leave & WFH | Apply, live loss-of-pay preview, withdraw | Approve team | Approve all |
| Payroll | Own payslip (print / save PDF) | Own payslip | Run month, register, CSV export |
| Performance | Goals with weights and progress | Appraise team | Override score (audited) |
| Trainings | Enroll / withdraw, certificates | same | Schedule, mark attended |
| Exit | Resign, withdraw before HR clearance | Approve team step | Run all steps |
| Employees / Audit / Settings | — | — | Accounts, passwords, onboarding, policy, holidays, teams |

Every create / approve / reject writes to the audit log.

## Accounts and passwords

- HR adds a person on **Employees**. The app generates an initial password and shows it **once**; HR shares it privately.
- At first sign-in the person must set their own password (10+ characters, upper and lower case, a number).
- HR can **Reset password** at any time. That signs the person out everywhere and shows a new initial password.
- Deactivating someone signs them out immediately.
- 5 wrong passwords lock the account for 15 minutes.
- Sessions are signed, httpOnly cookies (12 hours) and are re-checked against the database on every request.

## Set up with Supabase

1. **Create the project.** In Supabase, create a project and note the database password.
2. **Fill in `.env`.** Copy `.env.example` to `.env`. In Supabase, click **Connect → ORMs → Prisma** and paste:
   - `DATABASE_URL`: the *Transaction pooler* string (port **6543**), ending in `?pgbouncer=true&connection_limit=1&schema=hrms`
   - `DIRECT_URL`: the *Session pooler / direct* string (port **5432**), ending in `?schema=hrms`
   - `connection_limit=1` suits Vercel (serverless). On your own machine or server, use `connection_limit=5&pool_timeout=30` so pages with many queries don't time out on a slow network.
   - The app keeps its tables in their own `hrms` schema, so anything already in `public` is left alone. If the password has symbols, URL-encode them (for example `@` → `%40`).
   - `SESSION_SECRET`: run `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - `APP_TIMEZONE`: keep `Asia/Kolkata` unless the office is elsewhere
3. **Install, create tables, import the real data:**
   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   ```
   The seed imports `prisma/real_data.json`: 9 people, 2 teams (SAP UI5, AI Agents), about 1,200 approved track-sheet entries and joining dates. It fixes day/month swaps from the Excel import and reports any entry it can't place. It also creates the default shift policy (09:30, 9 hours, 15 minutes grace) and leave types (Casual 12, Sick 8, Earned 15), all editable in **Settings**. Running it again does not duplicate anything.
4. **Create your HR Admin** (prints a one-time initial password):
   ```bash
   npm run create-hr -- "Full Name" hr@nextitpoint.com
   ```
5. **Run it:** `npm run dev` for development, or `npm run build && npm start` for production.

Imported people keep their existing passwords but are asked to set a new one at next sign-in.

### After the first sign-in (HR)
- **Employees:** add each person's annual CTC (payroll skips people without one), designation and joining date where missing.
- **Settings:** add this year's holidays, and set team leaders. The SAP UI5 team has no TL yet, so HR approves its requests.

## Deploy (Vercel)

Import the `nitp-hrms` folder as a project and add the same four environment variables. The build runs `prisma generate` automatically. Run `npm run db:migrate` from your machine (it uses `DIRECT_URL`) whenever a new migration is added.

## Notes

- **Payroll:** an Indian-style split computed from CTC. Basic is 40% of gross, HRA is 50% of Basic, plus conveyance, medical and special allowance. PF is 12% of Basic capped at ₹1,800; professional tax is ₹200; TDS is estimated on new-regime slabs. Loss of pay comes from approved leave beyond quota and from joining mid-month. Check these rules with your accountant before the first real run.
- **Attachments** are stored in the database (2 MB limit) so no extra storage setup is needed.
- `prisma/real_data.json` contains staff password hashes and is git-ignored. Keep it off GitHub.
