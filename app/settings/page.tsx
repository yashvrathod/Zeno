'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Key, Info } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    groqApiKey: '',
    openaiApiKey: '',
    googleApiKey: '',
    openrouterApiKey: '',
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.1',
    apiProvider: 'server',
  });

  // Load current settings
  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    
    if (status === 'authenticated') {
      loadSettings();
    }
  }, [status, router]);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings/ai');
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      setSettings({
        groqApiKey: data.groqApiKey || '',
        openaiApiKey: data.openaiApiKey || '',
        googleApiKey: data.googleApiKey || '',
        openrouterApiKey: data.openrouterApiKey || '',
        ollamaBaseUrl: data.ollamaBaseUrl || 'http://localhost:11434',
        ollamaModel: data.ollamaModel || 'llama3.1',
        apiProvider: data.apiProvider || 'server',
      });
    } catch (e) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groqApiKey: settings.groqApiKey?.trim() || null,
          openaiApiKey: settings.openaiApiKey?.trim() || null,
          googleApiKey: settings.googleApiKey?.trim() || null,
          openrouterApiKey: settings.openrouterApiKey?.trim() || null,
          ollamaBaseUrl: settings.ollamaBaseUrl?.trim() || null,
          ollamaModel: settings.ollamaModel?.trim() || null,
          apiProvider: settings.apiProvider,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      toast.success('API settings saved successfully!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 lg:ml-64">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Button
                variant="ghost"
                className="mb-4 text-gray-400 hover:text-white"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold mb-2">API Settings</h1>
              <p className="text-gray-400">
                Configure your own API keys to avoid rate limits and get unlimited usage.
              </p>
            </div>

            {/* Info Card */}
            <Card className="bg-blue-500/10 border-blue-500/20 p-4 mb-6">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-300">
                  <p className="font-semibold text-blue-400 mb-1">Why use your own API key?</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-400">
                    <li>Unlimited usage - no rate limits</li>
                    <li>Better privacy - keys stored securely, never sent to our servers</li>
                    <li>Free tier available on most providers (Groq, OpenAI, Google)</li>
                    <li>You control your AI provider and costs</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Provider Selection */}
            <Card className="bg-[#1a1a1a] border-zinc-800 p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Key className="w-5 h-5" />
                AI Provider
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setSettings((s) => ({ ...s, apiProvider: 'server' }))}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      settings.apiProvider === 'server'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-zinc-700 bg-[#0f0f0f] hover:border-zinc-600'
                    }`}
                  >
                    <div className="font-semibold mb-1">Server Default</div>
                    <div className="text-sm text-gray-400">
                      Use our free tier (limited requests)
                    </div>
                    {settings.apiProvider === 'server' && (
                      <Badge className="mt-2 bg-orange-500 text-white">Active</Badge>
                    )}
                  </button>

                  <button
                    onClick={() => setSettings((s) => ({ ...s, apiProvider: 'groq' }))}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      settings.apiProvider === 'groq'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-zinc-700 bg-[#0f0f0f] hover:border-zinc-600'
                    }`}
                  >
                    <div className="font-semibold mb-1">Groq</div>
                    <div className="text-sm text-gray-400">
                      Fast inference, free tier available
                    </div>
                    {settings.apiProvider === 'groq' && (
                      <Badge className="mt-2 bg-orange-500 text-white">Active</Badge>
                    )}
                  </button>

                  <button
                    onClick={() => setSettings((s) => ({ ...s, apiProvider: 'openai' }))}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      settings.apiProvider === 'openai'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-zinc-700 bg-[#0f0f0f] hover:border-zinc-600'
                    }`}
                  >
                    <div className="font-semibold mb-1">OpenAI</div>
                    <div className="text-sm text-gray-400">
                      GPT models, $5 free credits
                    </div>
                    {settings.apiProvider === 'openai' && (
                      <Badge className="mt-2 bg-orange-500 text-white">Active</Badge>
                    )}
                  </button>

                  <button
                    onClick={() => setSettings((s) => ({ ...s, apiProvider: 'google' }))}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      settings.apiProvider === 'google'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-zinc-700 bg-[#0f0f0f] hover:border-zinc-600'
                    }`}
                  >
                    <div className="font-semibold mb-1">Google AI (Gemini)</div>
                    <div className="text-sm text-gray-400">
                      1500 requests/day free
                    </div>
                    {settings.apiProvider === 'google' && (
                      <Badge className="mt-2 bg-orange-500 text-white">Active</Badge>
                    )}
                  </button>

                  <button
                    onClick={() => setSettings((s) => ({ ...s, apiProvider: 'openrouter' }))}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      settings.apiProvider === 'openrouter'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-zinc-700 bg-[#0f0f0f] hover:border-zinc-600'
                    }`}
                  >
                    <div className="font-semibold mb-1">OpenRouter</div>
                    <div className="text-sm text-gray-400">
                      Access 200+ models, pay-as-you-go
                    </div>
                    {settings.apiProvider === 'openrouter' && (
                      <Badge className="mt-2 bg-orange-500 text-white">Active</Badge>
                    )}
                  </button>

                  <button
                    onClick={() => setSettings((s) => ({ ...s, apiProvider: 'ollama' }))}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      settings.apiProvider === 'ollama'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-zinc-700 bg-[#0f0f0f] hover:border-zinc-600'
                    }`}
                  >
                    <div className="font-semibold mb-1">Ollama (Local)</div>
                    <div className="text-sm text-gray-400">
                      Run AI offline on your machine
                    </div>
                    {settings.apiProvider === 'ollama' && (
                      <Badge className="mt-2 bg-orange-500 text-white">Active</Badge>
                    )}
                  </button>
                </div>
              </div>
            </Card>

            {/* API Keys */}
            {settings.apiProvider !== 'server' && (
              <Card className="bg-[#1a1a1a] border-zinc-800 p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">API Keys</h2>

                <div className="space-y-6">
                  {settings.apiProvider === 'groq' && (
                    <div className="space-y-2">
                      <Label htmlFor="groqKey">Groq API Key</Label>
                      <Input
                        id="groqKey"
                        type="password"
                        value={settings.groqApiKey || ''}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, groqApiKey: e.target.value }))
                        }
                        className="bg-[#0f0f0f] border-zinc-700 text-white font-mono"
                        placeholder="gsk_..."
                      />
                      <p className="text-xs text-gray-500">
                        Get your free API key at{' '}
                        <a
                          href="https://console.groq.com/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-500 hover:underline"
                        >
                          console.groq.com/keys
                        </a>
                      </p>
                    </div>
                  )}

                  {settings.apiProvider === 'openai' && (
                    <div className="space-y-2">
                      <Label htmlFor="openaiKey">OpenAI API Key</Label>
                      <Input
                        id="openaiKey"
                        type="password"
                        value={settings.openaiApiKey || ''}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, openaiApiKey: e.target.value }))
                        }
                        className="bg-[#0f0f0f] border-zinc-700 text-white font-mono"
                        placeholder="sk-..."
                      />
                      <p className="text-xs text-gray-500">
                        Get your API key at{' '}
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-500 hover:underline"
                        >
                          platform.openai.com/api-keys
                        </a>
                      </p>
                    </div>
                  )}

                  {settings.apiProvider === 'google' && (
                    <div className="space-y-2">
                      <Label htmlFor="googleKey">Google AI Studio API Key</Label>
                      <Input
                        id="googleKey"
                        type="password"
                        value={settings.googleApiKey || ''}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, googleApiKey: e.target.value }))
                        }
                        className="bg-[#0f0f0f] border-zinc-700 text-white font-mono"
                        placeholder="AIza..."
                      />
                      <p className="text-xs text-gray-500">
                        Get your free API key at{' '}
                        <a
                          href="https://aistudio.google.com/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-500 hover:underline"
                        >
                          aistudio.google.com/apikey
                        </a>
                      </p>
                    </div>
                  )}

                  {settings.apiProvider === 'openrouter' && (
                    <div className="space-y-2">
                      <Label htmlFor="openrouterKey">OpenRouter API Key</Label>
                      <Input
                        id="openrouterKey"
                        type="password"
                        value={settings.openrouterApiKey || ''}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, openrouterApiKey: e.target.value }))
                        }
                        className="bg-[#0f0f0f] border-zinc-700 text-white font-mono"
                        placeholder="sk-or-v1-..."
                      />
                      <p className="text-xs text-gray-500">
                        Get your API key at{' '}
                        <a
                          href="https://openrouter.ai/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-500 hover:underline"
                        >
                          openrouter.ai/keys
                        </a>
                      </p>
                    </div>
                  )}

                  {settings.apiProvider === 'ollama' && (
                    <>
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-300 mb-2">
                          <strong className="text-cyan-400">Setting up Ollama:</strong>
                        </p>
                        <ol className="text-sm text-gray-400 list-decimal list-inside space-y-1">
                          <li>Download from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">ollama.ai</a></li>
                          <li>Run: <code className="bg-black/50 px-2 py-0.5 rounded text-cyan-400">ollama pull llama3.1</code></li>
                          <li>Server runs at <code className="bg-black/50 px-2 py-0.5 rounded">http://localhost:11434</code></li>
                        </ol>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ollamaUrl">Ollama Server URL</Label>
                        <Input
                          id="ollamaUrl"
                          type="text"
                          value={settings.ollamaBaseUrl || 'http://localhost:11434'}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, ollamaBaseUrl: e.target.value }))
                          }
                          className="bg-[#0f0f0f] border-zinc-700 text-white font-mono"
                          placeholder="http://localhost:11434"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ollamaModel">Model Name</Label>
                        <Input
                          id="ollamaModel"
                          type="text"
                          value={settings.ollamaModel || 'llama3.1'}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, ollamaModel: e.target.value }))
                          }
                          className="bg-[#0f0f0f] border-zinc-700 text-white font-mono"
                          placeholder="llama3.1"
                        />
                        <p className="text-xs text-gray-500">
                          Popular models: llama3.1, codellama, mistral, phi3
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* Security Notice */}
            <Card className="bg-zinc-900/50 border-zinc-800 p-4 mb-6">
              <div className="flex gap-3 text-sm text-gray-400">
                <Key className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  🔒 Your API keys are stored securely in your browser's local storage and sent
                  directly to the AI provider. They are never sent to or stored on our servers.
                </p>
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex gap-3">
              <Button
                onClick={saveSettings}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
              <Button
                onClick={() => router.back()}
                variant="secondary"
                className="bg-[#0f0f0f] hover:bg-[#252525] border border-zinc-700 text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
