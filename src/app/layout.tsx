import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Cosmora — Your Cosmic Intelligence",
  description: "A personal astrology intelligence system that calculates, interprets, tracks, and explains the native's life timing using both ancient techniques and modern AI reasoning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Restore saved skin before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('cosmora-theme');
            if (t) document.documentElement.setAttribute('data-theme', t);
          } catch(e) {}
        ` }} />
      </head>
      <body className="min-h-full text-slate-100 antialiased" style={{ background: "var(--bg-void)" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
