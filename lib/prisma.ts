import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * NOTE:
 * Next.js may import API route modules during the build "collect page data" step.
 * On Vercel, build-time env vars like DATABASE_URL may be missing (e.g. when only
 * configured for Runtime). Prisma's Postgres adapter can throw if initialized with
 * an undefined connection string.
 *
 * To keep builds resilient, only construct the PrismaPg adapter when DATABASE_URL
 * is present. At runtime, DATABASE_URL should be set and the adapter will be used.
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  // If DATABASE_URL is missing, fall back to default PrismaClient construction.
  // Requests that hit DB will still fail at query-time with a clearer error, but
  // the build won't crash while evaluating modules.
  if (!connectionString) {
    return new PrismaClient();
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
