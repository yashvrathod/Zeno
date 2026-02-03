'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function AuthErrorContent() {
  const params = useSearchParams();
  const error = params.get('error');

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#1a1a1a] border-zinc-800 p-6">
        <h1 className="text-xl font-semibold text-white mb-2">Sign-in error</h1>
        <p className="text-sm text-gray-400 mb-6">
          {error ? `Error: ${error}` : 'Something went wrong while signing you in.'}
        </p>
        <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white">
          <Link href="/auth/login">Back to login</Link>
        </Button>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <React.Suspense
      fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 text-gray-400">Loading…</div>}
    >
      <AuthErrorContent />
    </React.Suspense>
  );
}
