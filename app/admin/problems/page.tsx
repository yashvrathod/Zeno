"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Card } from "@/components/ui/card";

type ProblemListItem = {
  id: string;
  slug: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  isPublished: boolean;
  updatedAt: string;
};

async function fetchProblems(): Promise<ProblemListItem[]> {
  const res = await fetch("/api/admin/problems", { cache: "no-store" });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Failed to load problems");
  }
  const data = (await res.json()) as { problems: ProblemListItem[] };
  return data.problems;
}

export default function AdminProblemsPage() {
  const [problems, setProblems] = React.useState<ProblemListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [slug, setSlug] = React.useState("");
  const [title, setTitle] = React.useState("");

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      setProblems(await fetchProblems());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load problems");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const create = async () => {
    try {
      const res = await fetch("/api/admin/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          statementMd: `# ${title}\n\nWrite the problem statement here.`,
          difficulty: "EASY",
          isPublished: false,
          hints: [],
          patternIds: [],
          testCases: [
            { input: "1 2", expected: "3", isHidden: false },
            { input: "10 20", expected: "30", isHidden: true },
          ],
          starterCode: {
            python: "# write solution\n",
            java: "// write solution\n",
            cpp: "// write solution\n",
          },
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to create");
      }

      const data = (await res.json()) as { problem: { id: string } };
      toast.success("Problem created");
      setSlug("");
      setTitle("");
      await reload();
      // Navigate to edit
      window.location.href = `/admin/problems/${data.problem.id}`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin • Problems</h1>
          <Button
            asChild
            variant="secondary"
            className="bg-[#0f0f0f] border border-zinc-700 text-white"
          >
            <Link href="/admin/patterns">Manage patterns</Link>
          </Button>
        </div>

        <Card className="bg-[#1a1a1a] border-zinc-800 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="two-sum"
                className="bg-[#0f0f0f] border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Two Sum"
                className="bg-[#0f0f0f] border-zinc-700 text-white"
              />
            </div>
          </div>

          <div className="mt-4">
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={create}
              disabled={!slug || !title}
            >
              Create problem
            </Button>
          </div>

          <div className="mt-3 text-xs text-gray-400">
            Access is restricted by <code>ADMIN_EMAILS</code>.
          </div>
        </Card>

        <Card className="bg-[#1a1a1a] border-zinc-800">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold">All problems</h2>
            <Button
              variant="secondary"
              className="bg-[#0f0f0f] border border-zinc-700 text-white"
              onClick={reload}
            >
              Refresh
            </Button>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="text-gray-400">Loading…</div>
            ) : problems.length === 0 ? (
              <div className="text-gray-400">No problems yet.</div>
            ) : (
              <div className="space-y-2">
                {problems.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/problems/${p.id}`}
                    className="block rounded-md border border-zinc-800 bg-[#0f0f0f] hover:bg-[#141414] px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">{p.title}</div>
                        <div className="text-xs text-gray-400">
                          /{p.slug} • {p.difficulty}
                        </div>
                      </div>
                      <div className="text-xs">
                        {p.isPublished ? (
                          <span className="text-green-400">Published</span>
                        ) : (
                          <span className="text-yellow-400">Draft</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
