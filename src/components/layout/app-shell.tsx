"use client";

import { TabBar } from "./tab-bar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen max-w-lg mx-auto">
      <main className="pb-20">{children}</main>
      <TabBar />
    </div>
  );
}
