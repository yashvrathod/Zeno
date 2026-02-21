'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/sonner';
import { VoiceChatProvider } from '@/components/VoiceChatProvider';
import VoiceChatButton from '@/components/VoiceChatButton';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <VoiceChatProvider>
        {children}
        <VoiceChatButton />
        <Toaster />
      </VoiceChatProvider>
    </SessionProvider>
  );
}
