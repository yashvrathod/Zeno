'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/sonner';
import { VoiceChatProvider } from '@/components/VoiceChatProvider';
import VoiceChatButton from '@/components/VoiceChatButton';
import { LenisProvider } from '@/components/providers/LenisProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LenisProvider>
        <VoiceChatProvider>
          {children}
          {/* <VoiceChatButton /> */}
          <Toaster />
        </VoiceChatProvider>
      </LenisProvider>
    </SessionProvider>
  );
}
