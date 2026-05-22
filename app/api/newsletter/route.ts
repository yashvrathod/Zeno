import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const NEWSLETTER_FILE = path.join(process.cwd(), 'data', 'newsletter.json');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    let subscribers: { email: string; createdAt: string }[] = [];
    if (fs.existsSync(NEWSLETTER_FILE)) {
      subscribers = JSON.parse(fs.readFileSync(NEWSLETTER_FILE, 'utf-8'));
    }

    if (subscribers.some((s) => s.email === email)) {
      return NextResponse.json({ error: 'Email already subscribed' }, { status: 409 });
    }

    subscribers.push({ email, createdAt: new Date().toISOString() });
    fs.writeFileSync(NEWSLETTER_FILE, JSON.stringify(subscribers, null, 2));

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('[NEWSLETTER] Subscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
