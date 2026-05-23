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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Fragment+Mono&family=Outfit:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('cosmora-theme');
            if (t) document.documentElement.setAttribute('data-theme', t);
          } catch(e) {}
        ` }} />
      </head>
      <body className="min-h-full antialiased" style={{ background: "var(--void)", color: "var(--text-1)" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
