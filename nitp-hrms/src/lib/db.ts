import { PrismaClient } from "@prisma/client";

// One client per process. In development it survives hot reloads, and is rebuilt
// if DATABASE_URL changes (Next reloads .env without restarting the server).
const g = globalThis as unknown as { prisma?: PrismaClient; prismaUrl?: string };
const url = process.env.DATABASE_URL;

if (g.prisma && g.prismaUrl !== url) {
  void g.prisma.$disconnect();
  g.prisma = undefined;
}

export const db =
  g.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  g.prisma = db;
  g.prismaUrl = url;
}
