import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Roboto_Slab } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Background } from "@/components/hero";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-roboto-slab",
  display: "swap",
});

export const metadata: Metadata = {
  title: "code.zone",
  description: "Developer community platform",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} ${robotoSlab.variable} antialiased font-sans`}>
        <Providers>
          {/* <Background/> */}
          {/* <CursorGradient /> */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
