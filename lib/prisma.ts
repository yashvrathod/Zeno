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

  if (!connectionString) {
    return new PrismaClient();
  }

  const poolConfig: Record<string, unknown> = {};
  const poolStr = process.env.DATABASE_POOL_SIZE;
  if (poolStr) {
    const size = parseInt(poolStr, 10);
    if (size > 0) poolConfig.connection_limit = size;
  }
  const timeoutStr = process.env.DATABASE_POOL_TIMEOUT;
  if (timeoutStr) {
    const timeout = parseInt(timeoutStr, 10);
    if (timeout > 0) poolConfig.pool_timeout = timeout;
  }

  const adapter = new PrismaPg({ connectionString, ...poolConfig });
  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
