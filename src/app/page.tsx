"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  ReceiptText,
  Layers,
  BarChart3,
  TrendingUp,
  Shield,
  Zap,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Kasir Realtime",
    description: "Monitor shift dan penjualan tanpa berpindah tab",
    icon: TrendingUp,
  },
  {
    title: "Stok Sinkron",
    description: "Data produk antar outlet selalu mutakhir",
    icon: Layers,
  },
  {
    title: "Laporan Siap",
    description: "PDF dan dashboard harian untuk semua role",
    icon: BarChart3,
  },
];

const quickActions = [
  {
    title: "Buka Kasir",
    description: "Mulai transaksi penjualan",
    href: "/cashier",
    icon: ReceiptText,
    variant: "primary" as const,
  },
  {
    title: "Kelola Produk",
    description: "Atur stok dan kategori",
    href: "/management/products",
    icon: Layers,
    variant: "secondary" as const,
  },
  {
    title: "Laporan Harian",
    description: "Pantau performa toko",
    href: "/reports/daily",
    icon: BarChart3,
    variant: "tertiary" as const,
  },
];

const benefits = [
  "Next.js App Router untuk performa optimal",
  "tRPC untuk type-safe API calls",
  "Prisma ORM dengan Supabase Postgres",
  "NextAuth untuk autentikasi multi-provider",
  "Role-based access (Owner, Admin, Kasir)",
  "PDF struk otomatis dengan pdf-lib",
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  const variantStyles = {
    primary:
      "border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 to-white hover:border-emerald-300",
    secondary:
      "border-sky-200/60 bg-gradient-to-br from-sky-50/50 to-white hover:border-sky-300",
    tertiary:
      "border-amber-200/60 bg-gradient-to-br from-amber-50/50 to-white hover:border-amber-300",
  };

  const iconStyles = {
    primary: "text-emerald-600 bg-emerald-50",
    secondary: "text-sky-600 bg-sky-50",
    tertiary: "text-amber-600 bg-amber-50",
  };

  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-slate-50/50 via-white to-slate-50/30 p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:p-12">
        <div className="relative z-10 mx-auto max-w-3xl space-y-6 text-center">
          <Badge
            variant="secondary"
            className="text-xs font-medium uppercase tracking-wider"
          >
            POS Retail Modern
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight text-foreground lg:text-4xl">
            Sistem POS end-to-end untuk operasional toko yang gesit
          </h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground">
            Ditenagai Next.js, tRPC, Prisma, dan Supabase untuk alur kasir
            cepat, stok terkendali, dan laporan kas akurat setiap hari.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isAuthenticated ? (
              <>
                <Button asChild size="lg">
                  <Link href="/dashboard" className="gap-2">
                    Buka Dashboard
                    <ArrowRight className="h-4 w-4 stroke-[1.5]" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/cashier">Mulai Transaksi</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/auth/login" className="gap-2">
                    Masuk
                    <ArrowRight className="h-4 w-4 stroke-[1.5]" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/demo/cashier">Coba Demo</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Decorative gradient */}
        <div
          aria-hidden
          className="absolute -right-32 top-1/2 hidden h-96 w-96 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl lg:block"
        />
      </section>

      {/* Features Grid */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Fitur Utama
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-150 hover:scale-[1.01] hover:shadow-md"
              >
                <CardContent className="flex items-start gap-3 p-5">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-5 w-5 stroke-[1.5]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Quick Actions */}
      {isAuthenticated && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Aksi Cepat
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard" className="text-xs">
                Lihat Dashboard
                <ArrowRight className="ml-1 h-3 w-3 stroke-[1.5]" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href} className="group">
                  <Card
                    className={cn(
                      "h-full border p-5 transition-all duration-150",
                      "hover:scale-[1.01] hover:shadow-md",
                      "shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
                      variantStyles[action.variant],
                    )}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "rounded-lg p-2.5 shadow-sm",
                            iconStyles[action.variant],
                          )}
                        >
                          <Icon className="h-5 w-5 stroke-[1.5]" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-foreground">
                            {action.title}
                          </h3>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {action.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                        <span>Buka</span>
                        <ArrowRight className="h-4 w-4 stroke-[1.5] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Tech Stack & Benefits */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Tech Stack */}
        <Card className="border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
                <Zap className="h-5 w-5 stroke-[1.5]" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                Stack Teknologi
              </h2>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">Frontend & API</p>
                <p className="mt-1">
                  Next.js 14 • TypeScript • tRPC • TanStack Query • Tailwind CSS
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Database & Auth</p>
                <p className="mt-1">
                  Supabase Postgres • Prisma ORM • NextAuth
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">UI Components</p>
                <p className="mt-1">shadcn/ui • Radix UI • Lucide Icons</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card className="border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <Shield className="h-5 w-5 stroke-[1.5]" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                Keunggulan Sistem
              </h2>
            </div>
            <ul className="space-y-2">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 stroke-[1.5] text-emerald-600" />
                  <span className="text-muted-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="rounded-2xl border border-border/50 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="text-xl font-semibold text-foreground">
            Siap memulai?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Masuk untuk mengakses dashboard lengkap atau coba demo tanpa login
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/auth/login" className="gap-2">
                Masuk Sekarang
                <ArrowRight className="h-4 w-4 stroke-[1.5]" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/demo/cashier">Coba Demo Gratis</Link>
            </Button>
          </div>
        </section>
      )}

      {/* Footer Links */}
      <section className="border-t border-border/50 pt-6">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <Link
            href="/docs/implementation"
            className="transition-colors hover:text-foreground"
          >
            Panduan Implementasi
          </Link>
          <span className="text-border">•</span>
          <Link
            href="/docs/persiapan-awal"
            className="transition-colors hover:text-foreground"
          >
            Checklist Persiapan
          </Link>
          <span className="text-border">•</span>
          <Link
            href="/demo/cashier"
            className="transition-colors hover:text-foreground"
          >
            Demo Kasir
          </Link>
        </div>
      </section>
    </div>
  );
}
