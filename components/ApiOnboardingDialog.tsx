'use client';

import React from 'react';
import { X, Zap, Key, Server, Sparkles, Cpu } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type Provider = 'server' | 'groq' | 'openai' | 'google' | 'ollama';

type ApiOnboardingDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function ApiOnboardingDialog({ open, onClose }: ApiOnboardingDialogProps) {
  const [step, setStep] = React.useState<'welcome' | 'provider' | 'configure'>('welcome');
  const [selectedProvider, setSelectedProvider] = React.useState<Provider>('server');
  const [saving, setSaving] = React.useState(false);
  
  const [config, setConfig] = React.useState({
    groqApiKey: '',
    openaiApiKey: '',
    googleApiKey: '',
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.1',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        apiProvider: selectedProvider,
        hasCompletedOnboarding: true,
      };

      if (selectedProvider === 'groq' && config.groqApiKey) {
        payload.groqApiKey = config.groqApiKey;
      } else if (selectedProvider === 'openai' && config.openaiApiKey) {
        payload.openaiApiKey = config.openaiApiKey;
      } else if (selectedProvider === 'google' && config.googleApiKey) {
        payload.googleApiKey = config.googleApiKey;
      } else if (selectedProvider === 'ollama') {
        payload.ollamaBaseUrl = config.ollamaBaseUrl;
        payload.ollamaModel = config.ollamaModel;
      }

      const res = await fetch('/api/settings/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      toast.success('API settings saved! You can change this anytime in Settings.');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    // Just mark onboarding as complete with server default
    try {
      await fetch('/api/settings/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiProvider: 'server',
          hasCompletedOnboarding: true,
        }),
      });
      onClose();
    } catch (e) {
      console.error('Failed to skip onboarding:', e);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="bg-[#1a1a1a] border-zinc-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="p-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/20 mb-4">
                <Sparkles className="w-8 h-8 text-orange-500" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Welcome to Code.Zone! 🎉</h2>
              <p className="text-gray-400 text-lg">
                Let's set up your AI mentor to help you master DSA
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Choose Your AI Provider
              </h3>
              <p className="text-sm text-gray-300 mb-4">
                To avoid rate limits and get unlimited mentoring, you can use your own API key from any provider.
                All options have generous free tiers!
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span><strong>Free Options:</strong> Google AI (1500/day), Groq, OpenAI ($5 credits)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span><strong>Privacy:</strong> Your keys are stored securely and never shared</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span><strong>Local Option:</strong> Use Ollama to run AI completely offline on your machine</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep('provider')}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                Set Up API Provider
              </Button>
              <Button
                onClick={handleSkip}
                variant="secondary"
                className="bg-[#0f0f0f] hover:bg-[#252525] border border-zinc-700 text-white"
              >
                Skip for Now
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-3">
              You can always change this later in Settings
            </p>
          </div>
        )}

        {/* Provider Selection Step */}
        {step === 'provider' && (
          <div className="p-6">
            <button
              onClick={() => setStep('welcome')}
              className="text-gray-400 hover:text-white mb-4 text-sm flex items-center gap-1"
            >
              ← Back
            </button>
            
            <h2 className="text-2xl font-bold mb-6">Choose Your AI Provider</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Server Default */}
              <button
                onClick={() => setSelectedProvider('server')}
                className={`p-5 rounded-lg border-2 text-left transition-all ${
                  selectedProvider === 'server'
                    ? 'border-orange-500 bg-orange-500/10 shadow-lg'
                    : 'border-zinc-700 bg-[#0f0f0f] hover:border-zinc-600'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <Server className="w-6 h-6 text-gray-400" />
                  {selectedProvider === 'server' && (
                    <Badge className="bg-orange-500 text-white text-xs">Selected</Badge>
                  )}
                </div>
                <div className="font-semibold mb-1 text-lg">Server Default</div>
                <div className="text-sm text-gray-400 mb-2">
                  Use our free tier (limited requests)
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">No setup</Badge>
                  <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    ~6 req/min
                  </Badge>
                </div>
              </button>

              {/* Google AI (Gemini) */}
              <button
                onClick={() => setSelectedProvider('google')}
                className={`p-5 rounded-lg border-2 text-left transition-all ${
                  selectedProvider === 'google'
                    ? 'border-orange-500 bg-orange-500/10 shadow-lg'
                    : 'border-zinc-700 bg-[#0f0f0f] hover:border-zinc-600'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <Sparkles className="w-6 h-6 text-blue-400" />
                  {selectedProvider === 'google' && (
                    <Badge className="bg-orange-500 text-white text-xs">Selected</Badge>
                  )}
                </div>
                <div className="font-semibold mb-1 text-lg flex items-center gap-2">
                  Google AI (Gemini)
                  <Badge className="bg-green-500 text-white text-xs">Recommended</Badge>
                </div>
                <div className="text-sm text-gray-400 mb-2">
                  1500 requests/day free - Best free option!
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                    1500/day FREE
                  </Badge>
                  <Badge variant="outline" className="text-xs">Fast</Badge>
                </div>
              </button>

              {/* Groq */}
              <button
                onClick={() => setSelectedProvider('groq')}
                className={`p-5 rounded-lg border-2 text-left transition-all ${
                  selectedProvider === 'groq'
                    ? 'border-orange-500 bg-orange-500/10 shadow-lg'
                    : 'border-zinc-700 bg-[#0f0f0f] hover:border-zinc-600'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <Zap className="w-6 h-6 text-purple-400" />
                  {selectedProvider === 'groq' && (
                    <Badge className="bg-orange-500 text-white text-xs">Selected</Badge>
                  )}
                </div>
                <div className="font-semibold mb-1 text-lg">Groq</div>
                <div className="text-sm text-gray-400 mb-2">
                  Lightning-fast inference, free tier
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">Free tier</Badge>
                  <Badge variant="outline" className="text-xs">Ultra fast</Badge>
                </div>
              </button>

              {/* OpenAI */}
              <button
                onClick={() => setSelectedProvider('openai')}
                className={`p-5 rounded-lg border-2 text-left transition-all ${
                  selectedProvider === 'openai'
                    ? 'border-orange-500 bg-orange-500/10 shadow-lg'
                    : 'border-zinc-700 bg-[#0f0f0f] hover:border-zinc-600'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <Key className="w-6 h-6 text-green-400" />
                  {selectedProvider === 'openai' && (
                    <Badge className="bg-orange-500 text-white text-xs">Selected</Badge>
                  )}
                </div>
                <div className="font-semibold mb-1 text-lg">OpenAI</div>
                <div className="text-sm text-gray-400 mb-2">
                  GPT models, $5 free credits
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">$5 credits</Badge>
                  <Badge variant="outline" className="text-xs">High quality</Badge>
                </div>
              </button>

              {/* Ollama (Local) */}
              <button
                onClick={() => setSelectedProvider('ollama')}
                className={`p-5 rounded-lg border-2 text-left transition-all md:col-span-2 ${
                  selectedProvider === 'ollama'
                    ? 'border-orange-500 bg-orange-500/10 shadow-lg'
                    : 'border-zinc-700 bg-[#0f0f0f] hover:border-zinc-600'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <Cpu className="w-6 h-6 text-cyan-400" />
                  {selectedProvider === 'ollama' && (
                    <Badge className="bg-orange-500 text-white text-xs">Selected</Badge>
                  )}
                </div>
                <div className="font-semibold mb-1 text-lg flex items-center gap-2">
                  Ollama (Local LLM)
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">100% Private</Badge>
                </div>
                <div className="text-sm text-gray-400 mb-2">
                  Run AI completely offline on your own machine - Zero cost, unlimited usage, maximum privacy
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="outline" className="text-xs bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    Completely FREE
                  </Badge>
                  <Badge variant="outline" className="text-xs">100% Private</Badge>
                  <Badge variant="outline" className="text-xs">Offline</Badge>
                  <Badge variant="outline" className="text-xs">Unlimited</Badge>
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep('configure')}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                Continue
              </Button>
              <Button
                onClick={handleSkip}
                variant="secondary"
                className="bg-[#0f0f0f] hover:bg-[#252525] border border-zinc-700 text-white"
              >
                Skip
              </Button>
            </div>
          </div>
        )}

        {/* Configuration Step */}
        {step === 'configure' && (
          <div className="p-6">
            <button
              onClick={() => setStep('provider')}
              className="text-gray-400 hover:text-white mb-4 text-sm flex items-center gap-1"
            >
              ← Back
            </button>

            <h2 className="text-2xl font-bold mb-2">Configure {selectedProvider === 'server' ? 'Server Default' : selectedProvider === 'google' ? 'Google AI' : selectedProvider === 'ollama' ? 'Ollama' : selectedProvider.toUpperCase()}</h2>
            <p className="text-gray-400 mb-6">
              {selectedProvider === 'server' 
                ? "You're all set! No configuration needed."
                : selectedProvider === 'ollama'
                ? "Make sure Ollama is running on your machine"
                : "Enter your API key to get started"}
            </p>

            {selectedProvider === 'groq' && (
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="groqKey">Groq API Key</Label>
                  <Input
                    id="groqKey"
                    type="password"
                    value={config.groqApiKey}
                    onChange={(e) => setConfig((c) => ({ ...c, groqApiKey: e.target.value }))}
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
              </div>
            )}

            {selectedProvider === 'openai' && (
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="openaiKey">OpenAI API Key</Label>
                  <Input
                    id="openaiKey"
                    type="password"
                    value={config.openaiApiKey}
                    onChange={(e) => setConfig((c) => ({ ...c, openaiApiKey: e.target.value }))}
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
              </div>
            )}

            {selectedProvider === 'google' && (
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="googleKey">Google AI Studio API Key</Label>
                  <Input
                    id="googleKey"
                    type="password"
                    value={config.googleApiKey}
                    onChange={(e) => setConfig((c) => ({ ...c, googleApiKey: e.target.value }))}
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
              </div>
            )}

            {selectedProvider === 'ollama' && (
              <div className="space-y-4 mb-6">
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-300 mb-2">
                    <strong className="text-cyan-400">First time with Ollama?</strong>
                  </p>
                  <ol className="text-sm text-gray-400 list-decimal list-inside space-y-1">
                    <li>Download Ollama from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">ollama.ai</a></li>
                    <li>Run: <code className="bg-black/50 px-2 py-0.5 rounded text-cyan-400">ollama pull llama3.1</code></li>
                    <li>Ollama will run at <code className="bg-black/50 px-2 py-0.5 rounded">http://localhost:11434</code></li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ollamaUrl">Ollama Server URL</Label>
                  <Input
                    id="ollamaUrl"
                    value={config.ollamaBaseUrl}
                    onChange={(e) => setConfig((c) => ({ ...c, ollamaBaseUrl: e.target.value }))}
                    className="bg-[#0f0f0f] border-zinc-700 text-white font-mono"
                    placeholder="http://localhost:11434"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ollamaModel">Model Name</Label>
                  <Input
                    id="ollamaModel"
                    value={config.ollamaModel}
                    onChange={(e) => setConfig((c) => ({ ...c, ollamaModel: e.target.value }))}
                    className="bg-[#0f0f0f] border-zinc-700 text-white font-mono"
                    placeholder="llama3.1"
                  />
                  <p className="text-xs text-gray-500">
                    Popular models: llama3.1, codellama, mistral, phi3
                  </p>
                </div>
              </div>
            )}

            {selectedProvider === 'server' && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-400">
                  ✓ You're using our default server. Limited to ~6 requests per minute.
                  You can upgrade to unlimited usage anytime in Settings.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                {saving ? 'Saving...' : 'Complete Setup'}
              </Button>
              <Button
                onClick={handleSkip}
                variant="secondary"
                className="bg-[#0f0f0f] hover:bg-[#252525] border border-zinc-700 text-white"
              >
                Skip
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
