/**
 * Test sign-ins for each role, kept apart from real staff.
 *   npm run test-accounts          create (or reset) them; writes test-accounts.local.md
 *   npm run test-accounts -- off   deactivate them before go-live
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { writeFileSync } from "fs";

const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL });
const TEAM = "Test Team";
const ACCOUNTS = [
  { empCode: "TEST-HR", name: "Test HR Admin", email: "hr.test@nextitpoint.test", role: "HR", title: "HR Admin", department: "People Ops" },
  { empCode: "TEST-TL", name: "Test Team Lead", email: "tl.test@nextitpoint.test", role: "TL", title: "Team Lead", department: "Engineering" },
  { empCode: "TEST-EMP", name: "Test Employee", email: "employee.test@nextitpoint.test", role: "EMPLOYEE", title: "Developer", department: "Engineering" },
] as const;

const words = ["Mint", "Kite", "River", "Cedar", "Lotus", "Amber", "Coral", "Maple", "Pearl", "Orbit"];
const newPassword = () => `${words[randomInt(words.length)]}-${words[randomInt(words.length)]}-${randomInt(1000, 10000)}`;

async function main() {
  if (process.argv[2] === "off") {
    const r = await db.user.updateMany({ where: { empCode: { in: ACCOUNTS.map((a) => a.empCode) } }, data: { active: false, sessionVersion: { increment: 1 } } });
    console.log(`Deactivated ${r.count} test account(s).`);
    return;
  }
  const team = await db.team.upsert({ where: { name: TEAM }, update: {}, create: { name: TEAM } });
  const out: { role: string; email: string; password: string }[] = [];
  for (const a of ACCOUNTS) {
    const password = newPassword();
    const data = {
      name: a.name, email: a.email, role: a.role, title: a.title, department: a.department,
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: false, active: true, failedLogins: 0, lockedUntil: null,
      teamId: a.role === "HR" ? null : team.id,
      ctcAnnual: 600000, dateOfJoining: new Date("2026-01-01T00:00:00Z"),
    };
    const user = await db.user.upsert({ where: { empCode: a.empCode }, update: { ...data, sessionVersion: { increment: 1 } }, create: { empCode: a.empCode, ...data } });
    if (a.role === "TL") await db.team.update({ where: { id: team.id }, data: { leadId: user.id } });
    out.push({ role: a.role, email: a.email, password });
  }
  await db.auditLog.create({ data: { action: "Test accounts created or reset (command line)", tone: "lav" } });

  const md = [
    "# Test sign-ins (local only, git-ignored)",
    "",
    "Run `npm run test-accounts -- off` to deactivate these before go-live.",
    "",
    "| Role | Email | Password |",
    "|---|---|---|",
    ...out.map((o) => `| ${o.role} | ${o.email} | ${o.password} |`),
    "",
  ].join("\n");
  writeFileSync("test-accounts.local.md", md);
  console.log(`Created or reset ${out.length} test accounts in "${TEAM}". Sign-ins written to test-accounts.local.md`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
