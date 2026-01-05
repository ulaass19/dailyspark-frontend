import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import {
  Bell,
  Users,
  Target,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Smartphone,
  Globe2,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <TopBar />

      {/* 256px sidebar + 6px boşluk, TopBar için yukarıdan padding */}
      <main className="pt-28 pl-[262px] px-6 pb-6 space-y-6">

        {/* Üst başlık + CTA */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-50">
              DailySpark Dashboard
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">
              Electric Blue &amp; Neon Mint temasında, bildirim aktivitelerini,
              kullanıcı etkileşimini ve kampanya performansını tek ekrandan
              takip et.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button className="hidden sm:inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4FFFB0] shadow-[0_0_10px_rgba(79,255,176,0.9)]" />
              focus mode aktif
            </button>
            <button className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#2979FF] to-[#4FFFB0] px-3 py-2 text-[11px] font-medium text-slate-950 shadow-[0_10px_30px_rgba(41,121,255,0.5)]">
              Yeni bildirim oluştur
            </button>
          </div>
        </header>

        {/* 1. satır: 4 ana metrik kartı */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Bugün gönderilen bildirimler */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Bugün gönderilen
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-50">0</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Dünün aynı saatine göre{" "}
                  <span className="text-red-400 inline-flex items-center gap-0.5">
                    <ArrowDownRight className="h-3 w-3" />
                    0%
                  </span>
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2979FF]/15 text-[#2979FF]">
                <Bell className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Aktif kullanıcılar */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Aktif kullanıcılar
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-50">—</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Son 24 saatte oturum açan kullanıcılar
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4FFFB0]/10 text-[#4FFFB0]">
                <Users className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Planlı kampanyalar */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Planlı kampanyalar
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-50">0</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Takvim entegrasyonu ile doldurulacak
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Target className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* 7 gün performans */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Son 7 gün performans
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-50">—</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  OneSignal istatistikleri ile bağlanacak
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 text-[#4FFFB0]">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>
          </div>
        </section>

        {/* 2. satır: Chart benzeri iki büyük panel */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)]">
          {/* Solda: gönderim trendi */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  Bildirim gönderim eğrisi
                </h2>
                <p className="text-[11px] text-slate-500">
                  Haftalık bazda gönderim sayıları (Placeholder)
                </p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] text-slate-400 border border-slate-800">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2979FF]" />
                Gönderilen
                <span className="ml-2 h-1.5 w-1.5 rounded-full bg-[#4FFFB0]" />
                Teslim edilen
              </div>
            </div>

            {/* Basit chart placeholder */}
            <div className="h-48 rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-slate-950/60 px-4 py-3 flex flex-col justify-between">
              <div className="flex-1 flex items-end gap-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end gap-1">
                    <div className="h-16 rounded-full bg-[#2979FF]/30">
                      <div className="w-full rounded-full bg-[#2979FF] h-1/2" />
                    </div>
                    <div className="h-10 rounded-full bg-[#4FFFB0]/15">
                      <div className="w-full rounded-full bg-[#4FFFB0] h-1/3" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-[10px] text-slate-500">
                <span>Pzt</span>
                <span>Sal</span>
                <span>Çar</span>
                <span>Per</span>
                <span>Cum</span>
                <span>Cmt</span>
                <span>Paz</span>
              </div>
            </div>
          </div>

          {/* Sağda: kanal kırılımı */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  Kanal kırılımı
                </h2>
                <p className="text-[11px] text-slate-500">
                  Hangi kanaldan kaç bildirim gönderildi? (Placeholder)
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2979FF]/15 text-[#2979FF]">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-100">Mobile Push</p>
                    <p className="text-[11px] text-slate-500">
                      Uygulama içi push &amp; bildirimler
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-50">—</p>
                  <p className="text-[11px] text-slate-500">0%</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                    <Globe2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-100">Web Push</p>
                    <p className="text-[11px] text-slate-500">
                      Tarayıcı bildirimleri (ileride)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-50">—</p>
                  <p className="text-[11px] text-slate-500">0%</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-100">Zamanlanmış</p>
                    <p className="text-[11px] text-slate-500">
                      Belirli saate ayarlı bildirimler
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-50">—</p>
                  <p className="text-[11px] text-slate-500">0 kampanya</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. satır: Aktivite + performans özeti */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* Sol: Son aktiviteler */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-50">
                Son bildirim aktiviteleri
              </h2>
              <span className="text-[11px] text-slate-500">
                Backend bağlandığında burada akış göreceğiz
              </span>
            </div>

            <div className="flex flex-col gap-2 text-[12px] text-slate-300">
              <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-500">
                Henüz bir aktivite yok. İlk bildirimi gönderdiğinde burada bir
                zaman akışı göreceksin.
              </div>
            </div>
          </div>

          {/* Sağ: günlük performans özeti */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-50">
                  Bugünün özeti
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] text-slate-400 border border-slate-800">
                  <Activity className="h-3 w-3" />
                  placeholder veri
                </span>
              </div>

              <div className="space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Teslim oranı</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    0% <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800">
                  <div className="h-1.5 w-0 rounded-full bg-gradient-to-r from-[#2979FF] to-[#4FFFB0]" />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-slate-300">Tıklama oranı</span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    0% <ArrowRightThin />
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800">
                  <div className="h-1.5 w-0 rounded-full bg-[#4FFFB0]" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-[11px] text-slate-400">
                DailySpark admin paneli şu an{" "}
                <span className="text-[#4FFFB0] font-medium">
                  metrik, grafik ve aktivite
                </span>{" "}
                bileşenlerini placeholder olarak gösteriyor. Bir sonraki adımda
                bu alanları{" "}
                <span className="text-[#2979FF] font-medium">
                  gerçek notification-backend API
                </span>{" "}
                verisiyle dolduracağız.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * Küçük helper: sağ ok için ince bir ikon
 * (lucide'de çok ince bir varyant yok diye minik svg ekledim)
 */
function ArrowRightThin() {
  return (
    <svg
      className="h-3 w-3"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 8h7M9 5l3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
