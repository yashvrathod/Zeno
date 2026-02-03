'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Pattern = { id: string; name: string; description: string | null };

async function fetchPatterns(): Promise<Pattern[]> {
  const res = await fetch('/api/admin/patterns', { cache: 'no-store' });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || 'Failed to load patterns');
  }
  const data = (await res.json()) as { patterns: Pattern[] };
  return data.patterns;
}

export default function AdminPatternsPage() {
  const [patterns, setPatterns] = React.useState<Pattern[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      setPatterns(await fetchPatterns());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const create = async () => {
    try {
      const res = await fetch('/api/admin/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Failed to create pattern');
      }
      toast.success('Pattern created');
      setName('');
      setDescription('');
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin • Patterns</h1>
          <Button asChild variant="secondary" className="bg-[#0f0f0f] border border-zinc-700 text-white">
            <Link href="/admin/problems">Back to problems</Link>
          </Button>
        </div>

        <Card className="bg-[#1a1a1a] border-zinc-800 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Two Pointers"
                className="bg-[#0f0f0f] border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description (optional)</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Problems that use two indices moving..."
                className="bg-[#0f0f0f] border-zinc-700 text-white"
              />
            </div>
          </div>

          <div className="mt-4">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={create} disabled={!name.trim()}>
              Create pattern
            </Button>
          </div>

          <div className="mt-3 text-xs text-gray-400">
            Access is restricted by <code>ADMIN_EMAILS</code>.
          </div>
        </Card>

        <Card className="bg-[#1a1a1a] border-zinc-800">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold">All patterns</h2>
            <Button variant="secondary" className="bg-[#0f0f0f] border border-zinc-700 text-white" onClick={reload}>
              Refresh
            </Button>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="text-gray-400">Loading…</div>
            ) : patterns.length === 0 ? (
              <div className="text-gray-400">No patterns yet.</div>
            ) : (
              <div className="space-y-2">
                {patterns.map((p) => (
                  <div key={p.id} className="rounded-md border border-zinc-800 bg-[#0f0f0f] px-4 py-3">
                    <div className="text-white font-medium">{p.name}</div>
                    {p.description ? <div className="text-xs text-gray-400 mt-1">{p.description}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
