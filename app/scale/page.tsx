'use client';

import { ScaleStack } from '@/components/scale';
import { Navbar } from '@/components/hero';

export default function ScalePage() {
    return(
        <main className="min-h-screen bg-black overflow-x-hidden">
            <Navbar />
            {/* The component now provides its own scrollable height via a sticky container */}
            <ScaleStack />
        </main>
    )
}
