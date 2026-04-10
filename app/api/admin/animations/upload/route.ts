export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

/**
 * POST /api/admin/animations/upload
 *
 * Uploads animation files (SVG, JSON, JS) to the public folder.
 * Files <200KB are stored in DB directly (via admin edit page).
 * Larger files are saved to /public/animations/{problemId}/{filename}
 *
 * For production at scale, swap this to use Vercel Blob / Cloudflare R2:
 *   1. npm i @vercel/blob
 *   2. Add BLOB_READ_WRITE_TOKEN to .env
 *   3. Replace fs.writeFile with upload() from @vercel/blob
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const problemId = formData.get('problemId') as string | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.match(/\.(svg|json|m?js|ts)$/i)) {
      return Response.json(
        { error: 'Only .svg, .json, .js, .mjs, or .ts files are accepted' },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > 2 * 1024 * 1024) {
      return Response.json({ error: 'File too large. Max 2MB.' }, { status: 413 });
    }

    // Save to public/animations/{problemId}/
    const safeDir = problemId?.replace(/[^a-zA-Z0-9_-]/g, '') || 'unknown';
    const uploadDir = path.join(process.cwd(), 'public', 'animations', safeDir);

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(uploadDir, safeName);
    await writeFile(filePath, Buffer.from(bytes));

    const publicUrl = `/animations/${safeDir}/${safeName}`;

    return Response.json({ ok: true, url: publicUrl, size: bytes.byteLength });
  } catch (err) {
    console.error('Animation upload error:', err);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}
