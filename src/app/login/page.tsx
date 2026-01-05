"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👁
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const backendMessage =
          (Array.isArray(data?.message)
            ? data.message[0]
            : data?.message) || "Giriş başarısız. Bilgilerini kontrol et.";

        setError(backendMessage);
        return;
      }

      if (!data?.user || !data?.accessToken) {
        setError("Beklenmeyen bir cevap alındı. Lütfen tekrar dene.");
        return;
      }

      if (data.user.role !== "ADMIN") {
        setError(
          "Bu panel sadece yönetici hesapları için kullanılabilir. Lütfen admin hesabıyla giriş yap.",
        );
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("dailyspark_admin_token", data.accessToken);
        localStorage.setItem(
          "dailyspark_admin_user",
          JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.fullName,
            role: data.user.role,
          }),
        );
      }

      // YENİ
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Sunucuya ulaşılamadı. Lütfen tekrar dene.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4 py-10">
      {/* Arka plan glow'ları */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-80 w-80 rounded-full bg-[#2979FF]/30 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-80 w-80 rounded-full bg-[#4FFFB0]/25 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(41,121,255,0.12),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(79,255,176,0.10),_transparent_55%)]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
        {/* Sol taraf: branding / mood */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2979FF]/40 bg-slate-900/70 px-3 py-1 text-[11px] font-medium tracking-wide text-slate-200 shadow-[0_0_0_1px_rgba(15,23,42,0.8)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4FFFB0] shadow-[0_0_12px_2px_rgba(79,255,176,0.8)]" />
            DailySpark • yönetim alanı
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-50">
              Daily
              <span className="text-[#4FFFB0]">Spark</span>
              <span className="text-slate-400 text-base align-middle ml-1">
                admin
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300/90 max-w-md">
              Electric Blue & Neon Mint temasında,{" "}
              <span className="text-[#4FFFB0] font-medium">
                odak ve motivasyon
              </span>{" "}
              için tasarlanmış bildirim ve içerik akışını buradan yönet.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-xs text-slate-300/90">
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3 backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.09em] text-slate-400">
                Akıllı Akış
              </div>
              <div className="mt-1.5 text-sm font-medium text-slate-50">
                Planlı bildirim gönderimi
              </div>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3 backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.09em] text-slate-400">
                Odaklı Deneyim
              </div>
              <div className="mt-1.5 text-sm font-medium text-slate-50">
                Tek panelden yönetim
              </div>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3 backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.09em] text-slate-400">
                Kişiselleştirme
              </div>
              <div className="mt-1.5 text-sm font-medium text-slate-50">
                Esnek kitle & içerik
              </div>
            </div>
          </div>
        </div>

        {/* Sağ taraf: login kartı */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 sm:p-7 shadow-[0_18px_60px_rgba(15,23,42,0.9)] backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-50">
              DailySpark admin girişi
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              DailySpark içerik ve bildirimlerini yönetmek için hesabınla giriş
              yap.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-200"
              >
                E-posta
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-[#4FFFB0] focus:ring-1 focus:ring-[#4FFFB0]"
                placeholder="admin@dailyspark.app"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-200"
              >
                Şifre
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2.5 pr-10 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-[#2979FF] focus:ring-1 focus:ring-[#2979FF]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center px-2 text-slate-400 hover:text-slate-200"
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {/* basit inline göz ikonu */}
                  {showPassword ? (
                    // Eye-off
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-5 0-9.27-3.11-11-8  .72-2.02 1.94-3.78 3.53-5.12" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c5 0 9.27 3.11 11 8  -.46 1.3-1.13 2.5-1.96 3.57" />
                      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    // Eye
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/60 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#2979FF] to-[#4FFFB0] px-3 py-2.5 text-sm font-medium text-slate-950 shadow-[0_10px_35px_rgba(41,121,255,0.45)] transition-transform hover:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş yap"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
            <button
              type="button"
              className="hover:text-[#4FFFB0] transition-colors"
              onClick={() =>
                alert(
                  "Şifre sıfırlama akışını backend tarafıyla birlikte ekleyeceğiz.",
                )
              }
            >
              Şifremi unuttum
            </button>
            <span className="text-slate-500">
              DailySpark • yönetim ekranı
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
