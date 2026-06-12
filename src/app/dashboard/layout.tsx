"use client";

import { WarpTransitionProvider } from "@/components/ui/WarpTransition";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { CosmicShellProvider } from "@/components/layout/CosmicShell";
import { HUDFrame } from "@/components/layout/HUDFrame";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ZoomTransition } from "@/components/ui/ZoomTransition";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WarpTransitionProvider>
      <CosmicShellProvider>
        <Sidebar />
        <ZoomTransition>
          {children}
        </ZoomTransition>
        <HUDFrame />
        <CommandPalette />
      </CosmicShellProvider>
    </WarpTransitionProvider>
  );
}
