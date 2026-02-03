import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const patterns = await prisma.pattern.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });

  return NextResponse.json({ patterns });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as { name?: string; description?: string };
  const name = body.name?.trim();
  if (!name)
    return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const pattern = await prisma.pattern.create({
    data: { name, description: body.description?.trim() || null },
    select: { id: true, name: true, description: true },
  });

  return NextResponse.json({ pattern });
}
