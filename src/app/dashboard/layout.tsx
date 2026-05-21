"use client";

import { WarpTransitionProvider } from "@/components/ui/WarpTransition";
import { CommandPalette } from "@/components/ui/CommandPalette";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WarpTransitionProvider>
      {children}
      <CommandPalette />
    </WarpTransitionProvider>
  );
}
