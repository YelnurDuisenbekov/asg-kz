"use client";

import { useRouter } from "next/navigation";

export function NavRow({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr className="cursor-pointer hover:bg-slate-50" onClick={() => router.push(href)}>
      {children}
    </tr>
  );
}
