"use client";

import { useState } from "react";
import { signIn, type SignInResponse } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import Image from "next/image";

import { MotionButton as Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"magic" | "password" | "demo">("password");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(
    null,
  );
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();

  const onEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setMessageType(null);

    try {
      if (mode === "password") {
        if (!password) {
          setMessage("Masukkan password Anda.");
          setMessageType("error");
          return;
        }
        const res = (await signIn("credentials", {
          redirect: false,
          email,
          password,
        })) as SignInResponse | undefined;
        if (res?.error) {
          setMessage(`Email atau password salah. Silakan coba lagi.`);
          setMessageType("error");
        } else {
          setMessage("Login berhasil! Mengalihkan...");
          setMessageType("success");
          setTimeout(() => {
            window.location.href = "/";
          }, 500);
        }
      } else {
        const res = (await signIn("email", { email, redirect: false })) as
          | SignInResponse
          | undefined;
        if (res?.ok) {
          setMessage("Link masuk telah dikirim ke email Anda. Periksa inbox.");
          setMessageType("success");
        } else if (res?.error) {
          setMessage(`Gagal mengirim link: ${res.error}`);
          setMessageType("error");
        } else {
          setMessage("Link masuk dikirim. Periksa email Anda.");
          setMessageType("success");
        }
      }
    } catch (err: unknown) {
      const e = err as { message?: string } | string | unknown;
      setMessage((e as { message?: string })?.message ?? String(e));
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setMode("demo");
    router.push("/");
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Left Panel - Brand Hero */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700">
        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
          <div className="space-y-8">
            {/* Logo */}
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
              <Image
                src="/brand/toko-pos-icon-inverted.svg"
                alt="Toko POS"
                width={40}
                height={40}
                className="flex-shrink-0"
              />
              <span className="text-3xl font-bold">Toko POS</span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
                Sistem POS Modern
                <br />
                untuk Toko Anda
              </h1>
              <p className="text-lg xl:text-xl text-emerald-50 leading-relaxed max-w-md">
                Kelola kasir, stok, dan laporan dengan cepat dan akurat. Operasikan multi-outlet dalam satu platform.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3 pt-4">
              {[
                "Kasir cepat dengan barcode scanner",
                "Manajemen stok real-time",
                "Laporan penjualan lengkap",
                "Multi-outlet & multi-user",
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-200 flex-shrink-0" />
                  <span className="text-emerald-50">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <div className="inline-flex items-center justify-center mb-4">
              <Image
                src="/brand/toko-pos-logo.svg"
                alt="Toko POS"
                width={180}
                height={45}
                priority
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Sistem POS modern untuk toko multi-outlet
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                Masuk ke akun Anda
              </h2>
              <p className="text-sm text-gray-600">
                Akses kasir, manajemen produk, dan laporan outlet
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMode("password");
                  setMessage(null);
                  setMessageType(null);
                }}
                className={cn(
                  "px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                  mode === "password"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900",
                )}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("magic");
                  setPassword("");
                  setMessage(null);
                  setMessageType(null);
                }}
                className={cn(
                  "px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                  mode === "magic"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900",
                )}
              >
                Email Link
              </button>
            </div>

            {/* Form */}
            <form onSubmit={onEmailSignIn} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                      focusedField === "email"
                        ? "text-emerald-600"
                        : "text-gray-400",
                    )}
                  />
                  <Input
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="pl-11 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password Field */}
              {mode === "password" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                        focusedField === "password"
                          ? "text-emerald-600"
                          : "text-gray-400",
                      )}
                    />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      required={mode === "password"}
                      className="pl-11 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200"
                    />
                  </div>
                </div>
              )}

              {/* Magic Link Info */}
              {mode === "magic" && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
                  Kami akan mengirimkan link masuk sekali pakai ke email Anda.
                </p>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {mode === "magic" ? "Kirim Link Masuk" : "Masuk"}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </form>

            {/* Message Display */}
            {message && (
              <div
                className={cn(
                  "rounded-lg p-4 flex items-start gap-3 animate-slide-up",
                  messageType === "success"
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-red-50 border border-red-200",
                )}
              >
                {messageType === "success" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      messageType === "success"
                        ? "text-emerald-900"
                        : "text-red-900",
                    )}
                  >
                    {message}
                  </p>
                  {messageType === "success" &&
                    mode === "magic" &&
                    !message.toLowerCase().includes("gagal") && (
                      <p className="text-xs text-emerald-700">
                        Periksa folder Spam jika tidak menemukan dalam 1 menit.
                      </p>
                    )}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">
                  Atau gunakan
                </span>
              </div>
            </div>

            {/* Demo Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleDemoLogin}
              className="w-full h-12 border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700 font-medium rounded-lg transition-all duration-200 group"
            >
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                Coba Demo Tanpa Login
              </span>
            </Button>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500">
            © 2025 Toko POS. Sistem kasir modern untuk bisnis Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
