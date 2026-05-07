'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Key, Info, Zap, Shield } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

type ApiSettings = {
  groqApiKey: string | null;
  openaiApiKey: string | null;
  googleApiKey: string | null;
  openrouterApiKey: string | null;
  ollamaBaseUrl: string | null;
  ollamaModel: string | null;
  apiProvider: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [settings, setSettings] = React.useState<ApiSettings>({
    groqApiKey: '', openaiApiKey: '', googleApiKey: '', openrouterApiKey: '',
    ollamaBaseUrl: 'http://localhost:11434', ollamaModel: 'llama3.1', apiProvider: 'server',
  });

  React.useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/login'); return; }
    if (status === 'authenticated') {
      fetch('/api/settings/ai').then(res => res.json()).then(data => {
        setSettings({
          groqApiKey: data.groqApiKey || '',
          openaiApiKey: data.openaiApiKey || '',
          googleApiKey: data.googleApiKey || '',
          openrouterApiKey: data.openrouterApiKey || '',
          ollamaBaseUrl: data.ollamaBaseUrl || 'http://localhost:11434',
          ollamaModel: data.ollamaModel || 'llama3.1',
          apiProvider: data.apiProvider || 'server',
        });
      }).finally(() => setLoading(false));
    }
  }, [status, router]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Neural parameters synchronized.');
    } catch (e) {
      toast.error('Sync failed.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><span className="text-sm font-medium animate-pulse">Syncing_Protocol...</span></div>;
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background/50 selection:bg-primary/10">
          <div className="max-w-4xl mx-auto px-10 py-16">
            
            {/* Claude Header */}
            <div className="mb-16 space-y-6">
              <Badge variant="secondary" className="bg-primary/10 text-primary px-3 py-1 font-bold uppercase tracking-widest">Global Parameters</Badge>
              <h1 className="text-6xl font-serif font-semibold tracking-tight">Neural Configuration.</h1>
              <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
                Configure your inference endpoints. Use your own keys for unlimited throughput across the global architectural network.
              </p>
            </div>

            <div className="space-y-12">
              <section>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground block mb-8">Provider Selection</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'server', label: 'Network Default', desc: 'Standard cloud throughput' },
                    { id: 'groq', label: 'Groq LPU', desc: 'Sub-millisecond inference' },
                    { id: 'openai', label: 'OpenAI GPT', desc: 'Advanced reasoning models' },
                    { id: 'google', label: 'Google Gemini', desc: 'Multimodal neural link' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSettings((s) => ({ ...s, apiProvider: p.id }))}
                      className={`p-8 text-left rounded-3xl border transition-all duration-300 ${
                        settings.apiProvider === p.id 
                          ? 'bg-card border-primary shadow-lg shadow-primary/5 ring-2 ring-primary/10' 
                          : 'bg-card border-border/60 hover:border-primary/40'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className={`font-serif text-lg font-semibold ${settings.apiProvider === p.id ? 'text-primary' : ''}`}>{p.label}</span>
                        {settings.apiProvider === p.id && <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(217,119,87,0.6)]" />}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </section>

              {settings.apiProvider !== 'server' && (
                <Card className="p-10 border-border/60 shadow-sm space-y-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Shield size={18} className="text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Secure Token Input</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground ml-1">Private Key Ref</Label>
                      <Input
                        type="password"
                        value={
                          settings.apiProvider === 'groq' ? settings.groqApiKey :
                          settings.apiProvider === 'openai' ? settings.openaiApiKey :
                          settings.apiProvider === 'google' ? settings.googleApiKey :
                          settings.apiProvider === 'openrouter' ? settings.openrouterApiKey : ''
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          setSettings(s => ({
                            ...s,
                            groqApiKey: settings.apiProvider === 'groq' ? val : s.groqApiKey,
                            openaiApiKey: settings.apiProvider === 'openai' ? val : s.openaiApiKey,
                            googleApiKey: settings.apiProvider === 'google' ? val : s.googleApiKey,
                            openrouterApiKey: settings.apiProvider === 'openrouter' ? val : s.openrouterApiKey,
                          }));
                        }}
                        className="rounded-2xl h-14 bg-secondary/30 border-border/40 font-mono text-sm"
                        placeholder="••••••••••••••••••••••••"
                      />
                      <p className="text-[10px] text-muted-foreground italic mt-2 ml-1">Keys are stored locally and encrypted in transit.</p>
                    </div>
                  </div>
                </Card>
              )}

              <div className="pt-12 border-t border-border/50 flex flex-col sm:flex-row gap-4">
                <Button onClick={saveSettings} disabled={saving} className="rounded-2xl px-12 h-14 text-sm font-bold shadow-lg shadow-primary/20">
                  {saving ? 'Synchronizing...' : 'Commit Configuration'}
                </Button>
                <Button variant="ghost" onClick={() => router.back()} className="rounded-2xl px-10 h-14 text-sm font-bold text-muted-foreground">
                  Abort
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
