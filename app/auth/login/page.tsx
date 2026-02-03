'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Code, Github, Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    try {
      await signIn(provider, { callbackUrl: '/' });
    } catch (error) {
      setError('OAuth sign-in failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md bg-[#1a1a1a] border-zinc-800 shadow-2xl relative z-10">
        <div className="p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <Code className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold text-white">code.zone</span>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400 text-sm">Sign in to continue your coding journey</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              onClick={() => handleOAuthSignIn('google')}
              disabled={isLoading}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium"
              variant="outline"
            >
              <Mail className="w-4 h-4 mr-2" />
              Continue with Google
            </Button>
            <Button
              onClick={() => handleOAuthSignIn('github')}
              disabled={isLoading}
              className="w-full bg-[#24292e] hover:bg-[#1a1e22] text-white font-medium"
              variant="outline"
            >
              <Github className="w-4 h-4 mr-2" />
              Continue with GitHub
            </Button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#1a1a1a] px-2 text-gray-400">Or continue with</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-gray-300 mb-2 block">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-[#0f0f0f] border-zinc-700 text-white placeholder:text-gray-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-300 mb-2 block">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 bg-[#0f0f0f] border-zinc-700 text-white placeholder:text-gray-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-gray-400">
                <input type="checkbox" className="mr-2 rounded border-zinc-700" />
                Remember me
              </label>
              <Link href="/auth/forgot-password" className="text-orange-500 hover:text-orange-400">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center text-sm text-gray-400">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-orange-500 hover:text-orange-400 font-semibold">
              Sign up
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
