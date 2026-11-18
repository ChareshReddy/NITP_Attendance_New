/* Imports the company's real data (prisma/real_data.json) and default policy settings.
   Safe to run more than once: existing users and imported track sheets are not duplicated. */
import { Prisma, PrismaClient, Role } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const db = new PrismaClient();

type RawUser = { name: string; email: string; passwordHash: string; role: string; team: string };
type RawSheet = { email: string; date: string; project: string; taskDescription: string; hours: number; status: string; notes?: string };

const TODAY = new Date().toISOString().slice(0, 10);
const EARLIEST = "2025-01-01";

function validYmd(s: string): boolean {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Excel imports sometimes swapped day and month. Returns a usable date or null. */
function fixDate(s: string): { ymd: string; fixed: boolean } | null {
  const inRange = (x: string) => validYmd(x) && x >= EARLIEST && x <= TODAY;
  if (inRange(s)) return { ymd: s, fixed: false };
  const [y, m, d] = s.split("-");
  const swapped = `${y}-${d}-${m}`;
  if (inRange(swapped)) return { ymd: swapped, fixed: true };
  return null;
}

function parseDoj(text: string): string | null {
  const m = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(text);
  if (!m) return null;
  const ymd = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return validYmd(ymd) ? ymd : null;
}

async function main() {
  // Policy defaults (HR can change these in Settings).
  const defaults: Record<string, string> = { shiftStart: "09:30", graceMins: "15", shiftHours: "9", companyName: "NITP" };
  for (const [key, value] of Object.entries(defaults)) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  const leaveTypes: [string, number][] = [["Casual", 12], ["Sick", 8], ["Earned", 15]];
  for (const [i, [name, annualQuota]] of leaveTypes.entries()) {
    await db.leaveType.upsert({ where: { name }, update: {}, create: { name, annualQuota, sortOrder: i } });
  }

  const file = join(__dirname, "real_data.json");
  if (!existsSync(file)) {
    console.log("No prisma/real_data.json found. Settings seeded; add people from the Employees page.");
    return;
  }
  const raw = JSON.parse(readFileSync(file, "utf8")) as { users: RawUser[]; trackSheets: RawSheet[] };

  // Teams
  const teams = new Map<string, string>();
  for (const name of [...new Set(raw.users.map((u) => u.team).filter(Boolean))]) {
    const t = await db.team.upsert({ where: { name }, update: {}, create: { name } });
    teams.set(name, t.id);
  }

  // People
  let next = (await db.user.count()) + 1;
  const ids = new Map<string, string>();
  for (const u of raw.users) {
    const email = u.email.toLowerCase();
    const role: Role = u.role === "TL" ? "TL" : u.role === "HR" || u.role === "ADMIN" ? "HR" : "EMPLOYEE";
    const existing = await db.user.findUnique({ where: { email } });
    const user =
      existing ??
      (await db.user.create({
        data: {
          empCode: `NITP-${String(next++).padStart(4, "0")}`,
          name: u.name,
          email,
          passwordHash: u.passwordHash,
          role,
          mustChangePassword: true,
          title: role === "TL" ? "Team Leader" : null,
          department: u.team || null,
          teamId: teams.get(u.team) ?? null,
        },
      }));
    ids.set(email, user.id);
    if (role === "TL" && u.team) {
      await db.team.update({ where: { name: u.team }, data: { leadId: user.id } });
    }
  }

  // Track sheets
  const already = await db.trackSheet.count({ where: { source: { startsWith: "Imported" } } });
  if (already > 0) {
    console.log(`Track sheets already imported (${already}). Skipping.`);
  } else {
    let fixed = 0;
    const skipped: string[] = [];
    const rows: Prisma.TrackSheetCreateManyInput[] = [];
    for (const s of raw.trackSheets) {
      const userId = ids.get(s.email.toLowerCase());
      if (!userId) continue;
      if (/^date of joining/i.test(s.project)) {
        const doj = parseDoj(s.project) ?? parseDoj(s.taskDescription);
        if (doj) await db.user.update({ where: { id: userId }, data: { dateOfJoining: new Date(`${doj}T00:00:00Z`) } });
        continue;
      }
      const d = fixDate(s.date);
      if (!d) {
        skipped.push(`${s.email} ${s.date}`);
        continue;
      }
      if (d.fixed) fixed++;
      rows.push({
        userId,
        date: new Date(`${d.ymd}T00:00:00Z`),
        project: s.project.slice(0, 200),
        hours: Number(s.hours) || 0,
        description: s.taskDescription || s.project,
        status: s.status === "APPROVED" ? "APPROVED" : "SUBMITTED",
        source: s.notes || "Imported",
      });
    }
    for (let i = 0; i < rows.length; i += 500) await db.trackSheet.createMany({ data: rows.slice(i, i + 500) });
    console.log(`Imported ${rows.length} track sheet entries (${fixed} dates corrected from day/month swaps).`);
    if (skipped.length) console.log(`Skipped ${skipped.length} entries with unusable dates:\n  ${skipped.join("\n  ")}`);
  }

  console.log(`People: ${await db.user.count()} · Teams: ${await db.team.count()}`);
  if (!(await db.user.count({ where: { role: "HR" } }))) {
    console.log('\nNo HR account yet. Create one with:  npm run create-hr -- "Full Name" hr@yourcompany.com');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
