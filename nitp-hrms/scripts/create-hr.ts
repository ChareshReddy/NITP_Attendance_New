/* Creates (or resets) an HR Admin account and prints a one-time initial password.
   Usage: npm run create-hr -- "Full Name" hr@company.com */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

const db = new PrismaClient();

async function main() {
  const [name, emailRaw] = process.argv.slice(2);
  const email = (emailRaw || "").trim().toLowerCase();
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Usage: npm run create-hr -- "Full Name" hr@company.com');
    process.exit(1);
  }
  const words = ["Mint", "Kite", "River", "Cedar", "Lotus", "Amber", "Coral", "Maple", "Pearl", "Orbit"];
  const password = `${words[randomInt(words.length)]}-${words[randomInt(words.length)]}-${randomInt(1000, 10000)}`;
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({
      where: { email },
      data: { role: "HR", name, passwordHash, mustChangePassword: true, active: true, failedLogins: 0, lockedUntil: null, sessionVersion: { increment: 1 } },
    });
  } else {
    const n = (await db.user.count()) + 1;
    await db.user.create({
      data: { empCode: `NITP-${String(n).padStart(4, "0")}`, name, email, passwordHash, role: "HR", title: "HR Admin", department: "People Ops", mustChangePassword: true },
    });
  }
  await db.auditLog.create({ data: { action: `HR Admin account ${existing ? "reset" : "created"} for ${name} (command line)`, tone: "lav" } });
  console.log(`\nHR Admin ready: ${name} <${email}>`);
  console.log(`Initial password: ${password}`);
  console.log("They will be asked to set their own password at first sign-in.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
