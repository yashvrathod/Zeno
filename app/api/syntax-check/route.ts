import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { runOnPiston, LANGUAGE_CONFIG } from '@/lib/piston';

function clampText(s: string, max = 5000) {
  return s.length > max ? s.slice(0, max) + `\n...[truncated ${s.length - max}]` : s;
}

/**
 * Best-effort "syntax/compile" check.
 *
 * We do NOT run the user's program against tests here.
 * We just attempt to compile/parse quickly using the runtime.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as null | {
      language: keyof typeof LANGUAGE_CONFIG;
      code: string;
    };

    if (!body?.language || typeof body.code !== 'string') {
      return NextResponse.json({ error: 'Missing language/code' }, { status: 400 });
    }

    // Use language-specific minimal stdin to avoid waiting for input.
    const stdin = '';

    // For JS/Python, syntax errors typically appear immediately.
    // For C++/Java, compilation happens before run.
    const { output, stderr } = await runOnPiston({ language: body.language, code: body.code, stdin });

    // runOnPiston merges stdout+stderr into `output`. Use the dedicated stderr
    // field to surface compile vs runtime errors reliably.
    const errorText = clampText((stderr || '').toString().trim());

    // If stderr exists, report error; otherwise ok.
    if (errorText) {
      return NextResponse.json({ ok: false, error: errorText });
    }

    // If no stderr but output contains typical syntax error patterns, still report.
    const merged = (output || '').toString();
    if (/syntaxerror|referenceerror|traceback|error:/i.test(merged) && merged.length < 4000) {
      return NextResponse.json({ ok: false, error: clampText(merged) });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
