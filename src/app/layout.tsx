import * as React from "react";
import type { Metadata } from "next";
import { Providers } from "@/app/providers";
import { AppShell } from "@/components/layout/app-shell";
import { getServerAuthSession } from "@/server/auth";

import "./globals.css";

export const metadata: Metadata = {
  title: "Toko POS",
  description:
    "Modern POS berbasis Next.js dengan tRPC, Prisma, Supabase, dan shadcn/ui.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerAuthSession();

  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <Providers session={session}>
          <div className="min-h-screen bg-background text-foreground">
            <a
              href="#main-content"
              className="fixed left-4 top-4 z-[100] -translate-y-24 inline-flex rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Lewati ke konten utama
            </a>
            <AppShell>{children}</AppShell>
          </div>
        </Providers>
      </body>
    </html>
  );
}
