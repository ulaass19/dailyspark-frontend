// src/app/notifications/[id]/edit/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useToast } from "@/components/Toast";
import {
  ArrowLeft,
  Save,
  Loader2,
  Rocket,
  Clock,
  Bell,
  Send,
  AlertTriangle,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

type ScheduleMode = "NOW" | "LATER";

type NotificationStatus = "PENDING" | "SCHEDULED" | "SENT" | "FAILED" | string;

type NotificationLog = {
  id: number;
  attempt: number;
  statusBefore: NotificationStatus | null;
  statusAfter: NotificationStatus | null;
  success?: boolean | null;
  error?: string | null;
  provider?: string | null;
  providerId?: string | null;
  createdAt: string;
};

type NotificationDetail = {
  id: number;
  title: string;
  body: string;
  status: NotificationStatus;
  sendAt?: string | null;
  createdAt?: string;
  logs?: NotificationLog[];
};

export default function EditNotificationPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("NOW");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [originalStatus, setOriginalStatus] =
    useState<NotificationStatus>("PENDING");

  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Timezone / server time info
  const [timezoneLabel, setTimezoneLabel] =
    useState<string>("yerel saat dilimin");
  const [serverTimezone, setServerTimezone] = useState<string | null>(null);
  const [serverDiffMinutes, setServerDiffMinutes] = useState<number | null>(
    null
  );
  const [serverTimeError, setServerTimeError] = useState<string | null>(null);

  // Logs
  const [logs, setLogs] = useState<NotificationLog[]>([]);

  const bodyMaxLen = 240;

  /* ==========================================================
     Timezone label
  ========================================================== */
  useEffect(() => {
    try {
      const tz =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "";
      if (tz) setTimezoneLabel(tz);
    } catch {
      // ignore
    }
  }, []);

  /* ==========================================================
     Sunucu saati (drift kontrolü)
  ========================================================== */
  useEffect(() => {
    async function loadServerTime() {
      try {
        const clientNow = new Date();

        const res = await fetch(`${API_BASE}/time`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        const serverNow = new Date(data.now ?? data.serverNow ?? data.date);
        if (Number.isNaN(serverNow.getTime())) {
          throw new Error("Geçersiz server time");
        }

        if (typeof data.tz === "string" && data.tz.trim()) {
          setServerTimezone(data.tz);
        }

        const diffMs = Math.abs(serverNow.getTime() - clientNow.getTime());
        const diffMinutes = Math.round(diffMs / 60000);
        setServerDiffMinutes(diffMinutes);
      } catch (err) {
        console.error("Server time fetch error:", err);
        setServerTimeError(
          "Sunucu saati alınamadı, planlı gönderimlerde ufak sapmalar olabilir."
        );
      }
    }

    void loadServerTime();
  }, []);

  /* ==========================================================
     API'den bildirimi çek
  ========================================================== */
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setLoadError(null);

        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("dailyspark_admin_token")
            : null;

        if (!token) {
          setLoadError("Oturum bulunamadı. Lütfen tekrar giriş yap.");
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/admin/notifications/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Notification load error:", res.status, text);
          setLoadError("Bildirim yüklenemedi.");
          setLoading(false);
          return;
        }

        const data: NotificationDetail = await res.json();

        setTitle(data.title || "");
        setBody(data.body || "");
        setOriginalStatus(data.status || "PENDING");

        // Loglar
        const rawLogs: NotificationLog[] = Array.isArray(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data as any).logs
        )
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? ((data as any).logs as NotificationLog[])
          : [];
        rawLogs.sort((a, b) => b.id - a.id);
        setLogs(rawLogs);

        const sendAt = data.sendAt ? new Date(data.sendAt) : null;

        if (sendAt && data.status === "SCHEDULED") {
          setScheduleMode("LATER");

          // DB’de UTC, input datetime-local local bekliyor → offset düzelt
          const local = new Date(
            sendAt.getTime() - sendAt.getTimezoneOffset() * 60_000
          )
            .toISOString()
            .slice(0, 16);

          setScheduledAt(local);
        } else {
          setScheduleMode("NOW");
          setScheduledAt("");
        }

        setLoading(false);
      } catch (err) {
        console.error("Notification load error:", err);
        setLoadError("Bildirim yüklenirken bir hata oluştu.");
        setLoading(false);
      }
    }

    if (id) {
      void loadData();
    }
  }, [id]);

  /* ==========================================================
     SUBMIT → PATCH /admin/notifications/:id
  ========================================================== */
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!title.trim()) {
      setError("Başlık alanı boş bırakılamaz.");
      setSaving(false);
      return;
    }

    if (!body.trim()) {
      setError("İçerik alanı boş bırakılamaz.");
      setSaving(false);
      return;
    }

    // Planlı gönderim validasyonu
    if (scheduleMode === "LATER") {
      if (!scheduledAt) {
        setError("Planlanmış gönderim için tarih/saat seçmelisin.");
        setSaving(false);
        return;
      }
      const dt = new Date(scheduledAt);
      if (Number.isNaN(dt.getTime())) {
        setError("Geçerli bir tarih/saat seçmelisin.");
        setSaving(false);
        return;
      }
      const now = new Date();
      if (dt.getTime() <= now.getTime()) {
        setError("Planladığın tarih geçmişte olamaz. Gelecekte bir zaman seç.");
        setSaving(false);
        return;
      }
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("dailyspark_admin_token")
        : null;

    if (!token) {
      const msg = "Oturum bulunamadı. Lütfen tekrar giriş yap.";
      setError(msg);
      showToast({
        type: "error",
        title: "Oturum hatası",
        message: msg,
      });
      setSaving(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      title: title.trim(),
      body: body.trim(),
    };

    if (scheduleMode === "LATER" && scheduledAt) {
      const dt = new Date(scheduledAt);
      if (!Number.isNaN(dt.getTime())) {
        payload.sendAt = dt.toISOString();
      }
    }

    try {
      const res = await fetch(`${API_BASE}/admin/notifications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("EDIT ERROR:", res.status, text);

        let msg = "Bildirim güncellenemedi.";
        try {
          const data = JSON.parse(text);
          if (data?.message) {
            msg =
              Array.isArray(data.message) && data.message.length
                ? data.message.join("\n")
                : String(data.message);
          }
        } catch {
          // ignore
        }

        setError(msg);
        showToast({
          type: "error",
          title: "Güncelleme hatası",
          message: msg,
          autoCloseMs: 5000,
        });
        return;
      }

      showToast({
        type: "success",
        title: "Güncellendi",
        message: "Bildirim başarıyla güncellendi.",
      });

      setTimeout(() => router.push("/notifications"), 500);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("EDIT ERROR:", err);
      const msg =
        err?.message || "Bildirim güncellenirken bir hata oluştu.";
      setError(msg);
      showToast({
        type: "error",
        title: "Bir şeyler ters gitti",
        message: msg,
        autoCloseMs: 5000,
      });
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
     TEKRAR GÖNDER → POST /admin/notifications/:id/send-now
  ========================================================== */
  async function handleResend() {
    setError(null);

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("dailyspark_admin_token")
        : null;

    if (!token) {
      showToast({
        type: "error",
        title: "Oturum hatası",
        message: "Oturum bulunamadı. Lütfen tekrar giriş yap.",
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/notifications/${id}/send-now`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text().catch(() => "");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // plain text ise boş geç
      }

      if (!res.ok) {
        console.error("Resend error:", res.status, text);
        showToast({
          type: "error",
          title: "Tekrar gönderilemedi",
          message:
            (data && data.message) ||
            "Bildirim tekrar gönderilirken bir hata oluştu.",
          autoCloseMs: 5000,
        });
        return;
      }

      if (data?.skipped) {
        showToast({
          type: "success",
          title: "Tekrar gönderim atlandı",
          message: data.reason || "Bu bildirim zaten daha önce gönderilmiş.",
          autoCloseMs: 4000,
        });
      } else {
        showToast({
          type: "success",
          title: "Tekrar gönderildi",
          message: "Bildirim tekrar gönderim için işlendi.",
          autoCloseMs: 4000,
        });
      }

      // status + loglar değişmiş olabilir, sayfayı tazeleyelim
      setTimeout(() => {
        window.location.reload();
      }, 700);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Resend error:", err);
      showToast({
        type: "error",
        title: "Tekrar gönderim hatası",
        message:
          err?.message ||
          "Tekrar gönderim sırasında bir hata oluştu.",
        autoCloseMs: 5000,
      });
    }
  }

  const bodyLength = body.length;
  const bodyOverLimit = bodyLength > bodyMaxLen;
  const significantDrift =
    serverDiffMinutes !== null && serverDiffMinutes > 3;

  const scheduledPreview =
    scheduleMode === "LATER" && scheduledAt
      ? (() => {
          const dt = new Date(scheduledAt);
          if (Number.isNaN(dt.getTime())) return "";
          return dt.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          });
        })()
      : "";

  /* ==========================================================
     Loading / error state
  ========================================================== */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <Sidebar />
        <TopBar />
        <main className="pt-24 pl-[262px] px-6 pb-10">
          <div className="text-sm text-slate-300">Bildirim yükleniyor...</div>
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <Sidebar />
        <TopBar />
        <main className="pt-24 pl-[262px] px-6 pb-10">
          <div className="rounded-lg border border-red-900/70 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            {loadError}
          </div>
          <button
            onClick={() => router.push("/notifications")}
            className="mt-4 rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs text-slate-200"
          >
            Bildirim listesine dön
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <TopBar />

      <main className="pt-24 pl-[262px] px-6 pb-10">
        {/* Üst bölüm */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push("/notifications")}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300 hover:border-slate-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Bildirim listesine dön
            </button>
            <h1 className="mt-3 text-xl sm:text-2xl font-semibold tracking-tight">
              Bildirimi düzenle
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-xl">
              Başlık, içerik ve gönderim ayarlarını güncelleyebilirsin.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-900/60 bg-sky-950/40 px-4 py-2 text-[11px] font-semibold text-sky-200 hover:border-sky-500"
            onClick={handleResend}
          >
            <Send className="h-3.5 w-3.5" />
            Tekrar gönder
          </button>
        </div>

        {/* GRID */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.1fr)]">
          {/* SOL: FORM */}
          <div className="rounded-2xl border border-slate-900 bg-slate-950/80 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-900 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold">Bildirim detayları</h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Zorunlu alanlar <span className="text-red-400">*</span>
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
                <span className="inline-flex h-7 items-center rounded-full border border-slate-800 bg-slate-900/70 px-3">
                  <Bell className="mr-1 h-3.5 w-3.5 text-[#4FFFB0]" />
                  Push Notification
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
              {/* Başlık */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">
                  Başlık <span className="text-red-400">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5 text-sm outline-none text-slate-50 placeholder:text-slate-500 focus:border-slate-600"
                  placeholder="Bildirim başlığı"
                />
              </div>

              {/* İçerik */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium">
                  İçerik <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="min-h-[120px] w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5 text-sm outline-none text-slate-50 placeholder:text-slate-500 focus:border-slate-600 resize-none"
                    maxLength={bodyMaxLen + 40}
                    placeholder="Bildirim içeriği..."
                  />
                  <div className="pointer-events-none absolute bottom-2 right-3 text-[11px]">
                    <span
                      className={
                        bodyOverLimit
                          ? "text-red-400"
                          : bodyLength > bodyMaxLen * 0.8
                          ? "text-amber-300"
                          : "text-slate-500"
                      }
                    >
                      {bodyLength}/{bodyMaxLen}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gönderim Zamanı */}
              <div className="space-y-3">
                <label className="block text-xs font-medium">
                  Gönderim zamanı
                </label>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleMode("NOW");
                      setError(null);
                    }}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium flex items-center justify-center gap-2 ${
                      scheduleMode === "NOW"
                        ? "border-[#4FFFB0] bg-[#1d293b] text-white"
                        : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700"
                    }`}
                    disabled={originalStatus === "SENT"}
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    Hemen
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScheduleMode("LATER");
                      setError(null);
                    }}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium flex items-center justify-center gap-2 ${
                      scheduleMode === "LATER"
                        ? "border-[#4FFFB0] bg-[#1d293b] text-white"
                        : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Planlı gönder
                  </button>
                </div>

                {/* Timezone & drift info */}
                <div className="rounded-lg border border-slate-900 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-400 space-y-1.5">
                  <div>
                    Cihaz saat dilimin:{" "}
                    <span className="font-medium text-slate-200">
                      {timezoneLabel}
                    </span>
                  </div>
                  {serverTimezone && (
                    <div>
                      Sunucu saat dilimi:{" "}
                      <span className="font-medium text-slate-200">
                        {serverTimezone}
                      </span>
                    </div>
                  )}
                  {serverTimeError && (
                    <div className="text-amber-300 flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 mt-[2px]" />
                      <span>{serverTimeError}</span>
                    </div>
                  )}
                  {!serverTimeError && serverDiffMinutes !== null && (
                    <div
                      className={
                        significantDrift
                          ? "text-amber-300 flex items-start gap-1.5"
                          : "text-slate-500"
                      }
                    >
                      {significantDrift ? (
                        <>
                          <AlertTriangle className="h-3 w-3 mt-[2px]" />
                          <span>
                            Sunucu saati ile cihaz saatin arasında yaklaşık{" "}
                            <span className="font-semibold">
                              {serverDiffMinutes} dakika
                            </span>{" "}
                            fark var. Planlı bildirimlerde bu kadar sapma
                            olabilir.
                          </span>
                        </>
                      ) : (
                        <span>
                          Sunucu saati ile cihaz saatin arasında anlamlı bir
                          fark görünmüyor.
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {scheduleMode === "LATER" && (
                  <div className="space-y-1.5">
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm outline-none text-slate-50 focus:border-slate-600"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                    <p className="text-[11px] text-slate-500">
                      Bu alan{" "}
                      <span className="font-medium text-slate-300">
                        {timezoneLabel}
                      </span>{" "}
                      saat dilimine göre yorumlanır. Backend tarafında UTC
                      olarak saklanır ve cron bu saate göre tetiklenir.
                    </p>
                    {scheduledPreview && (
                      <p className="text-[11px] text-slate-300">
                        Bu ayarla bildirim yaklaşık{" "}
                        <span className="font-semibold">
                          {scheduledPreview} ({timezoneLabel})
                        </span>{" "}
                        civarında gönderilecektir.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Hata */}
              {error && (
                <div className="rounded-md border border-red-900/70 bg-red-950/40 px-3 py-2 text-[12px] text-red-100">
                  {error}
                </div>
              )}

              {/* Kayıt Butonu */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => router.push("/notifications")}
                  className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs text-slate-200 hover:border-slate-700"
                >
                  Vazgeç
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-gradient-to-r from-[#2979FF] to-[#4FFFB0] px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-2" />
                      Güncelle
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* SAĞ: Preview + Özet + Loglar */}
          <div className="space-y-4">
            {/* Canlı önizleme */}
            <div className="rounded-2xl border border-slate-900 bg-slate-950/80 px-5 py-4">
              <h2 className="text-sm font-semibold mb-3">Canlı önizleme</h2>

              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span>DailySpark</span>
                  <span>Şu an</span>
                </div>

                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#2979FF] to-[#4FFFB0] flex items-center justify-center text-xs font-bold text-slate-950">
                    DS
                  </div>

                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-50">
                      {title || "Başlık"}
                    </div>
                    <div className="text-[12px] text-slate-300 leading-snug">
                      {body || "Bildirim içeriği buraya gelecek..."}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Özet */}
            <div className="rounded-2xl border border-slate-900 bg-slate-950/80 px-5 py-4 text-[12px] text-slate-400">
              <h3 className="text-xs font-semibold text-slate-200">
                Gönderim özeti
              </h3>
              <ul className="mt-2 space-y-1.5">
                <li>• ID: {id}</li>
                <li>
                  • Durum:{" "}
                  <span className="font-medium text-slate-100">
                    {originalStatus}
                  </span>
                </li>
                <li>
                  • Zamanlama:{" "}
                  {scheduleMode === "NOW"
                    ? "Hemen"
                    : scheduledPreview
                    ? `${scheduledPreview} (${timezoneLabel})`
                    : "Tarih seçilmedi"}
                </li>
                <li>• Segment: Tüm kullanıcılar (şimdilik özet)</li>
              </ul>
            </div>

            {/* Gönderim Logları */}
            <div className="rounded-2xl border border-slate-900 bg-slate-950/80 px-5 py-4 text-[11px] text-slate-400">
              <h3 className="text-xs font-semibold text-slate-200 mb-2">
                Gönderim logları
              </h3>

              {logs.length === 0 ? (
                <p className="text-slate-500">
                  Bu bildirim için henüz kayıtlı bir gönderim logu yok.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-auto pr-1">
                  {logs.map((log) => {
                    const created = new Date(log.createdAt);
                    const dateStr = created.toLocaleString("tr-TR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    const success =
                      log.success !== undefined && log.success !== null
                        ? log.success
                        : log.statusAfter === "SENT";

                    return (
                      <div
                        key={log.id}
                        className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-100">
                            Deneme #{log.attempt}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {dateStr}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-slate-900 border border-slate-700 px-2 py-[2px] text-[10px]">
                            {log.statusBefore ?? "?"} →{" "}
                            <span className="ml-1 font-semibold text-slate-100">
                              {log.statusAfter ?? "?"}
                            </span>
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-[2px] text-[10px] ${
                              success
                                ? "bg-emerald-900/40 border border-emerald-700 text-emerald-200"
                                : "bg-red-900/40 border border-red-700 text-red-200"
                            }`}
                          >
                            {success ? "Başarılı" : "Başarısız"}
                          </span>
                          {log.provider && (
                            <span className="inline-flex items-center rounded-full bg-slate-900 border border-slate-800 px-2 py-[2px] text-[10px] text-slate-300">
                              Provider: {log.provider}
                            </span>
                          )}
                          {log.providerId && (
                            <span className="inline-flex items-center rounded-full bg-slate-900 border border-slate-800 px-2 py-[2px] text-[10px] text-slate-300">
                              ID: {log.providerId}
                            </span>
                          )}
                        </div>
                        {log.error && (
                          <p className="mt-1 text-[10px] text-red-200 whitespace-pre-wrap">
                            {log.error}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
