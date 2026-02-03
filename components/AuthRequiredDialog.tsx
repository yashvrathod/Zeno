'use client';

import * as React from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function AuthRequiredDialog({
  open,
  onOpenChange,
  callbackUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callbackUrl?: string;
}) {
  const cb = callbackUrl ?? '/';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1a] border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Sign in required</DialogTitle>
          <DialogDescription className="text-gray-400">
            You need to sign in to run tests or submit solutions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => signIn(undefined, { callbackUrl: cb })}
          >
            Continue to sign in
          </Button>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="w-full bg-[#0f0f0f] hover:bg-[#252525] border border-zinc-700"
              onClick={() => signIn('google', { callbackUrl: cb })}
            >
              Google
            </Button>
            <Button
              variant="secondary"
              className="w-full bg-[#0f0f0f] hover:bg-[#252525] border border-zinc-700"
              onClick={() => signIn('github', { callbackUrl: cb })}
            >
              GitHub
            </Button>
          </div>

          <p className="text-xs text-gray-400">
            Don&apos;t have an account?{' '}
            <Link className="text-orange-400 hover:text-orange-300" href="/auth/register">
              Create one
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
