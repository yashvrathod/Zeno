import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

function parseStringArrayJson(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string') as string[];
  return [];
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
      avatar: true,
      bio: true,
      location: true,
      websiteUrl: true,
      linkedinUrl: true,
      githubUrl: true,
      languages: true,
      skills: true,
      quote: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      ...user,
      image: user.image ?? user.avatar,
      languages: parseStringArrayJson(user.languages),
      skills: parseStringArrayJson(user.skills),
      quote: parseStringArrayJson(user.quote),
    },
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as Partial<{
    name: string;
    image: string;
    bio: string;
    location: string;
    websiteUrl: string;
    linkedinUrl: string;
    githubUrl: string;
    languages: string[];
    skills: string[];
    quote: string[];
  }>;

  const data = {
    name: typeof body.name === 'string' ? body.name : undefined,
    // NextAuth uses `User.image` for avatar.
    image: typeof body.image === 'string' ? body.image : undefined,
    bio: typeof body.bio === 'string' ? body.bio : undefined,
    location: typeof body.location === 'string' ? body.location : undefined,
    websiteUrl: typeof body.websiteUrl === 'string' ? body.websiteUrl : undefined,
    linkedinUrl: typeof body.linkedinUrl === 'string' ? body.linkedinUrl : undefined,
    githubUrl: typeof body.githubUrl === 'string' ? body.githubUrl : undefined,
    languages: Array.isArray(body.languages) ? body.languages.filter((s) => typeof s === 'string') : undefined,
    skills: Array.isArray(body.skills) ? body.skills.filter((s) => typeof s === 'string') : undefined,
    quote: Array.isArray(body.quote) ? body.quote.filter((s) => typeof s === 'string') : undefined,
  } satisfies Record<string, unknown>;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
      avatar: true,
      bio: true,
      location: true,
      websiteUrl: true,
      linkedinUrl: true,
      githubUrl: true,
      languages: true,
      skills: true,
      quote: true,
    },
  });

  return NextResponse.json({
    user: {
      ...updated,
      image: updated.image ?? updated.avatar,
      languages: parseStringArrayJson(updated.languages),
      skills: parseStringArrayJson(updated.skills),
      quote: parseStringArrayJson(updated.quote),
    },
  });
}
