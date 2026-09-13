import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { AppShell } from "@/components/ui";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "ASG.KZ — контроль проектов",
  description: "Договоры, платежи, доходы и сетевой график",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${manrope.className} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
