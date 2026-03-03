"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Circle, Library, User, Swords } from "lucide-react";
import { motion } from "framer-motion";

interface TabItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const TABS: TabItem[] = [
  { label: "Home", path: "/", icon: Home },
  { label: "Record", path: "/record", icon: Circle },
  { label: "Train", path: "/train", icon: Swords },
  { label: "Library", path: "/library", icon: Library },
  { label: "Profile", path: "/profile", icon: User },
];

export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const hideOnRoutes = ["/record", "/processing", "/results", "/drills"];
  const shouldHide = hideOnRoutes.some(
    (route) => pathname.startsWith(route) && pathname !== "/"
  );

  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-white/5 safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const isActive =
            tab.path === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.path);

          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className="relative flex flex-col items-center justify-center gap-1 w-16 h-full"
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <tab.icon
                size={20}
                className={
                  isActive
                    ? "text-white transition-colors"
                    : "text-neutral-500 transition-colors"
                }
              />
              <span
                className={`text-[10px] tracking-wide uppercase ${
                  isActive ? "text-white" : "text-neutral-500"
                } transition-colors`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
