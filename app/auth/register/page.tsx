'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Code, Mail, Lock, User, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          name: formData.name || formData.username,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setSuccess(true);

      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        setIsSigningIn(true);
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 800);
      } else {
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
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
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nx-accent to-amber-600 flex items-center justify-center shadow-lg shadow-nx-accent/20">
              <img src="/logo.png" alt="neXode" className="w-6 h-6 object-contain brightness-0 invert" />
            </div>
            <span className="text-2xl font-bold text-white font-heading tracking-tight">neXode</span>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-gray-400 text-sm">Join thousands of developers worldwide</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-400 text-sm">
              {isSigningIn ? (
                <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{isSigningIn ? 'Signing you in...' : 'Account created! Redirecting...'}</span>
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-300 mb-2 block">
                Full Name (Optional)
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  className="pl-10 bg-[#0f0f0f] border-zinc-700 text-white placeholder:text-gray-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-300 mb-2 block">
                Email <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="pl-10 bg-[#0f0f0f] border-zinc-700 text-white placeholder:text-gray-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="username" className="text-gray-300 mb-2 block">
                Username <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="pl-10 bg-[#0f0f0f] border-zinc-700 text-white placeholder:text-gray-500 focus:border-orange-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">At least 3 characters</p>
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-300 mb-2 block">
                Password <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="pl-10 bg-[#0f0f0f] border-zinc-700 text-white placeholder:text-gray-500 focus:border-orange-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-gray-300 mb-2 block">
                Confirm Password <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="pl-10 bg-[#0f0f0f] border-zinc-700 text-white placeholder:text-gray-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex items-start text-sm">
              <input type="checkbox" required className="mr-2 mt-1 rounded border-zinc-700" />
              <label className="text-gray-400">
                I agree to the{' '}
                <Link href="/terms" className="text-orange-500 hover:text-orange-400">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-orange-500 hover:text-orange-400">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              disabled={isLoading || success || isSigningIn}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-orange-500 hover:text-orange-400 font-semibold">
              Sign in
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
