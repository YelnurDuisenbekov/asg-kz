"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChangeNotice } from "./ChangeNotice";

const NAV = [
  { href: "/", label: "Договоры" },
  { href: "/income", label: "Доходы" },
  { href: "/payments", label: "Расходы" },
  { href: "/schedule", label: "График" },
  { href: "/lists", label: "Справочники" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "";

  return (
    <div className="min-h-full bg-slate-200 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">ASG · СтройПроект</div>
            <div className="truncate text-base font-semibold">Учёт договоров</div>
          </Link>
          <nav className="ml-auto hidden gap-1 md:flex">
            {NAV.map((item) => {
              const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${active ? "bg-white text-slate-900" : "text-slate-300 hover:bg-slate-800"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-3 pb-24 md:pb-8">{children}</main>
      <ChangeNotice />
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-300 bg-white md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-5">
          {NAV.map((item) => {
            const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-1 py-3 text-center text-xs font-medium ${active ? "text-slate-900" : "text-slate-500"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
