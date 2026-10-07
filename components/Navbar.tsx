"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LeafIcon } from "./Icons";

export function Navbar() {
  const pathname = usePathname();
  if (pathname.startsWith("/report/")) return null;
  const inFlow = pathname === "/onboarding" || pathname === "/scanner" || pathname === "/results";

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-foreground">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent">
            <LeafIcon />
          </span>
          <span className="text-base font-semibold tracking-tight">xilo-food inspector</span>
        </Link>
        {inFlow ? (
          <p className="text-sm font-medium text-muted">
            {pathname === "/onboarding" && "Step 1 of 3"}
            {pathname === "/scanner" && "Step 2 of 3"}
            {pathname === "/results" && "Step 3 of 3"}
          </p>
        ) : (
          <Link
            href="/onboarding"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Check a Food
          </Link>
        )}
      </div>
    </header>
  );
}
