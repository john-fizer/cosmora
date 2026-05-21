import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-full bg-[#00000f] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
