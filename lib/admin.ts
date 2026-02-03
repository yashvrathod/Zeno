import { auth } from '@/lib/auth';

function parseAdminEmails(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const admins = parseAdminEmails(process.env.ADMIN_EMAILS);

  if (!email || admins.length === 0 || !admins.includes(email)) {
    return { ok: false as const, session };
  }

  return { ok: true as const, session };
}
