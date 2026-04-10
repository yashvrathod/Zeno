'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Pattern = { id: string; name: string; description: string | null };

type LoadedProblem = {
  id: string;
  slug: string;
  title: string;
  statementMd: string;
  constraintsMd: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isPublished: boolean;
  tags: string[] | null;
  starterCode: Record<string, string> | null;
  patternIds: string[];
  hints: Array<{ order: number; textMd: string }>;
  testCases: Array<{ order: number; input: string; expected: string; isHidden: boolean }>;
  animationType: string | null;
  animationData: string | null;
};

async function fetchPatterns(): Promise<Pattern[]> {
  const res = await fetch('/api/admin/patterns', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load patterns');
  const data = (await res.json()) as { patterns: Pattern[] };
  return data.patterns;
}

async function fetchProblem(id: string): Promise<LoadedProblem> {
  const res = await fetch(`/api/admin/problems/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || 'Failed to load problem');
  }
  const data = (await res.json()) as { problem: unknown };
  const problem = data.problem as Record<string, unknown>;

  // Normalize tags/starterCode from Json
  return {
    ...(problem as unknown as LoadedProblem),
    tags: Array.isArray(problem.tags) ? (problem.tags as string[]) : null,
    starterCode: (problem.starterCode as Record<string, string> | null | undefined) ?? null,
  } as LoadedProblem;
}

export default function AdminProblemEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [patterns, setPatterns] = React.useState<Pattern[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [slug, setSlug] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [difficulty, setDifficulty] = React.useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [isPublished, setIsPublished] = React.useState(false);

  const [statementMd, setStatementMd] = React.useState('');
  const [constraintsMd, setConstraintsMd] = React.useState('');

  const [patternIds, setPatternIds] = React.useState<string[]>([]);
  const [hintsText, setHintsText] = React.useState(''); // one hint per line

  const [publicTests, setPublicTests] = React.useState(''); // input => expected per block
  const [hiddenTests, setHiddenTests] = React.useState('');

  const [starterJs, setStarterJs] = React.useState('');
  const [starterPy, setStarterPy] = React.useState('');
  const [starterJava, setStarterJava] = React.useState('');
  const [starterCpp, setStarterCpp] = React.useState('');

  const [animationType, setAnimationType] = React.useState<'svg' | 'canvas' | 'lottie' | ''>('');
  const [animationData, setAnimationData] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [pats, prob] = await Promise.all([fetchPatterns(), fetchProblem(id)]);
      setPatterns(pats);

      setSlug(prob.slug);
      setTitle(prob.title);
      setDifficulty(prob.difficulty);
      setIsPublished(prob.isPublished);
      setStatementMd(prob.statementMd);
      setConstraintsMd(prob.constraintsMd ?? '');
      setPatternIds(prob.patternIds ?? []);
      setHintsText((prob.hints ?? []).map((h) => h.textMd).join('\n'));

      const pub = (prob.testCases ?? []).filter((t) => !t.isHidden);
      const hid = (prob.testCases ?? []).filter((t) => t.isHidden);
      const serialize = (tests: typeof pub) =>
        tests
          .map((t) => `INPUT:\n${t.input}\nEXPECTED:\n${t.expected}`)
          .join('\n\n---\n\n');
      setPublicTests(serialize(pub));
      setHiddenTests(serialize(hid));

      const sc = prob.starterCode ?? {};
      setStarterJs(sc.javascript ?? '');
      setStarterPy(sc.python ?? '');
      setStarterJava(sc.java ?? '');
      setStarterCpp(sc.cpp ?? '');

      setAnimationType((prob.animationType as 'svg' | 'canvas' | 'lottie' | '') ?? '');
      setAnimationData(prob.animationData ?? '');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const togglePattern = (pid: string) => {
    setPatternIds((prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));
  };

  function parseTests(text: string, isHidden: boolean) {
    if (!text.trim()) return [] as Array<{ input: string; expected: string; isHidden: boolean }>;
    return text
      .split(/\n\s*---\s*\n/g)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const inputMatch = block.match(/INPUT:\s*\n([\s\S]*?)\nEXPECTED:\s*\n([\s\S]*)/i);
        if (!inputMatch) throw new Error('Invalid test block. Use: INPUT:<newline>... EXPECTED:<newline>...');
        return { input: inputMatch[1].trim(), expected: inputMatch[2].trim(), isHidden };
      });
  }

  const save = async () => {
    try {
      const hints = hintsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const testCases = [...parseTests(publicTests, false), ...parseTests(hiddenTests, true)];

      const starterCode = {
        javascript: starterJs,
        python: starterPy,
        java: starterJava,
        cpp: starterCpp,
      };

      const res = await fetch(`/api/admin/problems/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title,
          difficulty,
          isPublished,
          statementMd,
          constraintsMd: constraintsMd || null,
          patternIds,
          hints,
          testCases,
          starterCode,
          animationType: animationType || null,
          animationData: animationData || null,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Save failed');
      }

      toast.success('Saved');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a] text-gray-100 p-6">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Edit problem</h1>
            <div className="text-xs text-gray-400">ID: {id}</div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary" className="bg-[#0f0f0f] border border-zinc-700 text-white">
              <Link href="/admin/problems">Back</Link>
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={save}>
              Save
            </Button>
          </div>
        </div>

        <Card className="bg-[#1a1a1a] border-zinc-800 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="bg-[#0f0f0f] border-zinc-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-[#0f0f0f] border-zinc-700 text-white" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <Label>Difficulty</Label>
              <div className="flex gap-2">
                {(['EASY', 'MEDIUM', 'HARD'] as const).map((d) => (
                  <button
                    key={d}
                    className={`px-3 py-1 rounded-md border text-sm ${difficulty === d ? 'border-orange-500 text-orange-300' : 'border-zinc-700 text-gray-300'}`}
                    onClick={() => setDifficulty(d)}
                    type="button"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              Published
            </label>
          </div>
        </Card>

        <Card className="bg-[#1a1a1a] border-zinc-800 p-4 space-y-3">
          <div className="text-sm font-semibold">Patterns</div>
          <div className="flex flex-wrap gap-2">
            {patterns.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePattern(p.id)}
                className={`px-3 py-1 rounded-md border text-sm ${patternIds.includes(p.id) ? 'border-purple-500 text-purple-300' : 'border-zinc-700 text-gray-300'}`}
                title={p.description ?? ''}
              >
                {p.name}
              </button>
            ))}
          </div>
        </Card>

        <Card className="bg-[#1a1a1a] border-zinc-800 p-4 space-y-2">
          <div className="text-sm font-semibold">Statement (Markdown)</div>
          <textarea
            value={statementMd}
            onChange={(e) => setStatementMd(e.target.value)}
            className="w-full min-h-56 rounded-md bg-[#0f0f0f] border border-zinc-700 px-3 py-2 text-sm text-white outline-none focus-visible:border-orange-500"
          />
        </Card>

        <Card className="bg-[#1a1a1a] border-zinc-800 p-4 space-y-2">
          <div className="text-sm font-semibold">Constraints (Markdown)</div>
          <textarea
            value={constraintsMd}
            onChange={(e) => setConstraintsMd(e.target.value)}
            className="w-full min-h-28 rounded-md bg-[#0f0f0f] border border-zinc-700 px-3 py-2 text-sm text-white outline-none focus-visible:border-orange-500"
          />
        </Card>

        <Card className="bg-[#1a1a1a] border-zinc-800 p-4 space-y-2">
          <div className="text-sm font-semibold">Hints (one per line, Markdown supported)</div>
          <textarea
            value={hintsText}
            onChange={(e) => setHintsText(e.target.value)}
            className="w-full min-h-28 rounded-md bg-[#0f0f0f] border border-zinc-700 px-3 py-2 text-sm text-white outline-none focus-visible:border-orange-500"
          />
        </Card>

        <Card className="bg-[#1a1a1a] border-zinc-800 p-4 space-y-2">
          <div className="text-sm font-semibold">Public test cases</div>
          <div className="text-xs text-gray-400">Format blocks separated by ---</div>
          <textarea
            value={publicTests}
            onChange={(e) => setPublicTests(e.target.value)}
            className="w-full min-h-48 rounded-md bg-[#0f0f0f] border border-zinc-700 px-3 py-2 text-sm text-white outline-none focus-visible:border-orange-500"
          />
        </Card>

        <Card className="bg-[#1a1a1a] border-zinc-800 p-4 space-y-2">
          <div className="text-sm font-semibold">Hidden test cases</div>
          <div className="text-xs text-gray-400">Not shown to users; used for submit.</div>
          <textarea
            value={hiddenTests}
            onChange={(e) => setHiddenTests(e.target.value)}
            className="w-full min-h-48 rounded-md bg-[#0f0f0f] border border-zinc-700 px-3 py-2 text-sm text-white outline-none focus-visible:border-orange-500"
          />
        </Card>

        <Card className="bg-[#1a1a1a] border-zinc-800 p-4 space-y-4">
          <div className="text-sm font-semibold">Problem Visualization (Animation)</div>
          <p className="text-xs text-gray-400">
            Upload an SVG, Canvas-based animation, or Lottie JSON to help users understand the problem visually.
            SVG/Canvas/Javascript is stored directly (stored in DB), Lottie requires a file upload endpoint.
          </p>

          <div className="space-y-3">
            <div className="flex gap-2">
              {(['svg', 'canvas', 'lottie'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAnimationType(animationType === t ? '' : t)}
                  className={`px-3 py-1.5 rounded-md border text-xs uppercase tracking-wider ${
                    animationType === t
                      ? 'border-purple-500 text-purple-300 bg-purple-500/5'
                      : 'border-zinc-700 text-gray-300 hover:border-zinc-500'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {animationType === 'svg' ? (
              <textarea
                value={animationData}
                onChange={(e) => setAnimationData(e.target.value)}
                placeholder='<svg viewBox="0 0 400 300">...'
                className="w-full min-h-48 rounded-md bg-[#0f0f0f] border border-zinc-700 px-3 py-2 text-xs text-white font-mono outline-none focus-visible:border-orange-500"
              />
            ) : animationType === 'canvas' ? (
              <textarea
                value={animationData}
                onChange={(e) => setAnimationData(e.target.value)}
                placeholder={`(canvas) => (ctx, t, w, h) => {\n  // t is 0 to 1 (animation progress)\n  // draw your algorithm visualization here\n  const x = t * w;\n  ctx.fillStyle = '#9333ea';\n  ctx.fillRect(0, h/2 - 20, x, 40);\n}`}
                className="w-full min-h-48 rounded-md bg-[#0f0f0f] border border-zinc-700 px-3 py-2 text-xs text-white font-mono outline-none focus-visible:border-orange-500"
              />
            ) : animationType === 'lottie' ? (
              <input
                value={animationData}
                onChange={(e) => setAnimationData(e.target.value)}
                placeholder="Lottie animation file URL or inline JSON"
                className="w-full rounded-md bg-[#0f0f0f] border border-zinc-700 px-3 py-2 text-xs text-white font-mono outline-none focus-visible:border-orange-500"
              />
            ) : null}

            {animationType && (
              <div className="flex items-center gap-2">
                <label htmlFor="animationFileUpload" className="text-xs text-gray-400">
                  Or upload a file (SVG/Lottie/Canvas .js):
                </label>
                <FileUploadInput
                  fileKey={animationType}
                  onFileContent={(content) => setAnimationData(content)}
                  problemId={id}
                />
              </div>
            )}
          </div>
        </Card>

        <Card className="bg-[#1a1a1a] border-zinc-800 p-4 space-y-4">
          <div className="text-sm font-semibold">Starter code</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>JavaScript</Label>
              <textarea value={starterJs} onChange={(e) => setStarterJs(e.target.value)} className="w-full min-h-40 rounded-md bg-[#0f0f0f] border border-zinc-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <Label>Python</Label>
              <textarea value={starterPy} onChange={(e) => setStarterPy(e.target.value)} className="w-full min-h-40 rounded-md bg-[#0f0f0f] border border-zinc-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <Label>Java</Label>
              <textarea value={starterJava} onChange={(e) => setStarterJava(e.target.value)} className="w-full min-h-40 rounded-md bg-[#0f0f0f] border border-zinc-700 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <Label>C++</Label>
              <textarea value={starterCpp} onChange={(e) => setStarterCpp(e.target.value)} className="w-full min-h-40 rounded-md bg-[#0f0f0f] border border-zinc-700 px-3 py-2 text-sm text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-[#1a1a1a] border-zinc-800 p-4">
          <div className="text-xs text-gray-400">
            Tip: in the public/hidden test blocks, keep input/expected as plain strings. Your executor can later interpret them.
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * FileUploadInput — reads a local .svg, .json (lottie), or .js (canvas) file
 * and sets its content into the animation text area.
 */
function FileUploadInput({
  fileKey,
  onFileContent,
  problemId,
}: {
  fileKey: string;
  onFileContent: (content: string) => void;
  problemId: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/svg+xml', 'application/json', 'text/javascript', 'text/plain'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(svg|json|js|ts)$/)) {
      toast.error('Only .svg, .json, or .js files are accepted');
      return;
    }

    // For small files (<200KB), read directly; otherwise upload to cloud
    if (file.size < 200 * 1024) {
      const content = await file.text();
      onFileContent(content);
      toast.success(`Loaded ${file.name}`);
    } else {
      // Large file: upload to cloud storage
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('problemId', problemId);

        const res = await fetch('/api/admin/animations/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        onFileContent(data.url);
        toast.success(`Uploaded ${file.name} to cloud storage`);
      } catch {
        toast.error('Cloud upload failed. File too large for local storage.');
      }
    }
  };

  return (
    <input
      ref={inputRef}
      id="animationFileUpload"
      type="file"
      accept=".svg,.json,.js,.ts"
      onChange={handleFile}
      className="text-xs text-gray-400"
    />
  );
}
