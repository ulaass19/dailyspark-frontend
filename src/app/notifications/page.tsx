// src/app/notifications/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useToast } from "@/components/Toast";
import {
  Bell,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ChevronDown,
  BellDot,
  Send,
  AlertTriangle,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { OneSignalStatusBadge } from "@/components/OneSignalStatusBadge";


const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

/* ===== Tipler ===== */

// Backend’den gelen ham obje
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiNotification = any;

type NotificationRow = {
  id: number | string;
  title: string;
  bodyPreview: string;
  segmentName: string;
  channel: string; // "PUSH" | "EMAIL" | ...
  status: string; // "SENT" | "DRAFT" | "SCHEDULED" | "FAILED" | ...
  createdAt: string;
  scheduledAt?: string | null;
  sentAt?: string | null;
  sentCount: number;
  deliveredCount: number;
  openCount: number;
};

type StatusFilter = "ALL" | "SENT" | "SCHEDULED" | "DRAFT" | "FAILED";
type ChannelFilter = "ALL" | "PUSH" | "EMAIL";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("ALL");

  const { showToast } = useToast();

  const [resendLoadingId, setResendLoadingId] = useState<
    number | string | null
  >(null);

  /* ===== API'den data çek (tekrar kullanılabilir) ===== */
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("dailyspark_admin_token")
          : null;

      if (!token) {
        const msg = "Oturum bulunamadı. Lütfen tekrar giriş yap.";
        setError(msg);
        showToast({
          type: "error",
          title: "Oturum bulunamadı",
          message: msg,
        });
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/admin/notifications`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Bildirimler alınamadı:", res.status, text);
        throw new Error(`Bildirim listesi alınamadı (status: ${res.status}).`);
      }

      const data = await res.json();

      const rawList: ApiNotification[] = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.data)
        ? data.data
        : [];

      const now = new Date();

      const mapped: NotificationRow[] = rawList.map(
        (n: ApiNotification): NotificationRow => {
          const id = n.id ?? n.notificationId ?? "?";
          const title = n.title ?? "Başlıksız bildirim";
          const bodyRaw: string =
            n.body ?? n.message ?? n.content ?? "" ?? "";
          const bodyPreview =
            bodyRaw.length > 80
              ? bodyRaw.slice(0, 77).trimEnd() + "..."
              : bodyRaw;

          const segmentName =
            n.segmentName ?? n.segment ?? n.audienceName ?? "Tüm kullanıcılar";

          const channel = (n.channel ?? "PUSH").toString().toUpperCase();

          // Backend status: PENDING | SENT | FAILED
          const backendStatus = (n.status ?? "DRAFT")
            .toString()
            .toUpperCase();

          // Planlanan tarih (sendAt üzerinden)
          const sendAtRaw = n.sendAt ?? n.scheduledAt ?? n.scheduleAt ?? null;
          let scheduledAt: string | null = null;
          let isFutureSchedule = false;

          if (sendAtRaw) {
            const d = new Date(sendAtRaw);
            if (!Number.isNaN(d.getTime())) {
              scheduledAt = d.toLocaleString("tr-TR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              isFutureSchedule = d.getTime() > now.getTime();
            }
          }

          const sentAtRaw = n.sentAt ?? null;
          const sentAt = sentAtRaw
            ? new Date(sentAtRaw).toLocaleString("tr-TR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : null;

          // Frontend-status türetme:
          // - Eğer backend PENDING ve gönderilmemiş ama gelecekteki bir sendAt varsa → SCHEDULED
          // - Eğer backend SENT → SENT
          // - Eğer backend FAILED → FAILED
          // - Diğer her şey → DRAFT
          let status: string;
          if (
            backendStatus === "PENDING" &&
            isFutureSchedule &&
            !sentAtRaw
          ) {
            status = "SCHEDULED";
          } else if (backendStatus === "SENT") {
            status = "SENT";
          } else if (backendStatus === "FAILED") {
            status = "FAILED";
          } else {
            status = "DRAFT";
          }

          const createdAtRaw =
            n.createdAt ?? n.created_at ?? n.createdDate ?? null;
          const createdAt = createdAtRaw
            ? new Date(createdAtRaw).toLocaleString("tr-TR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-";

          const sentCount = Number(
            n.totalSent ?? n.sentCount ?? n.requestedCount ?? 0
          );
          const deliveredCount = Number(
            n.deliveredCount ?? n.successCount ?? 0
          );
          const openCount = Number(
            n.openCount ?? n.opens ?? n.clickCount ?? 0
          );

          return {
            id,
            title,
            bodyPreview,
            segmentName,
            channel,
            status,
            createdAt,
            scheduledAt,
            sentAt,
            sentCount,
            deliveredCount,
            openCount,
          };
        }
      );

      setNotifications(mapped);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Bildirim listesi yüklenirken hata:", err);
      const msg =
        err?.message ||
        "Bildirimler alınırken bir hata oluştu. Lütfen tekrar dene.";
      setError(msg);
      showToast({
        type: "error",
        title: "Bildirimler yüklenemedi",
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  /* ===== DELETE HANDLER (tekil silme) ===== */
  async function handleDelete(id: number | string, title: string) {
    const ok = window.confirm(
      `"${title}" bildirimini silmek istediğine emin misin?`
    );
    if (!ok) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("dailyspark_admin_token")
        : null;

    if (!token) {
      showToast({
        type: "error",
        title: "Oturum bulunamadı",
        message: "Devam etmek için lütfen tekrar giriş yap.",
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/notifications/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("DELETE ERROR:", res.status, text);
        showToast({
          type: "error",
          title: "Silinemedi",
          message: "Bildirim silinirken bir hata oluştu.",
        });
        return;
      }

      // Başarılı → state'den çıkar
      setNotifications((prev) => prev.filter((n) => n.id !== id));

      showToast({
        type: "success",
        title: "Silindi",
        message: `"${title}" bildirimi başarıyla silindi.`,
      });
    } catch (err) {
      console.error("DELETE ERROR:", err);
      showToast({
        type: "error",
        title: "Silinemedi",
        message: "Beklenmeyen bir hata oluştu.",
      });
    }
  }

  /* ===== RESEND HANDLER (tekil tekrar gönder) ===== */
  async function handleResend(id: number | string, title: string) {
    const ok = window.confirm(
      `"${title}" bildirimini tekrar göndermek istediğine emin misin?`
    );
    if (!ok) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("dailyspark_admin_token")
        : null;

    if (!token) {
      showToast({
        type: "error",
        title: "Oturum bulunamadı",
        message: "Devam etmek için lütfen tekrar giriş yap.",
      });
      return;
    }

    try {
      setResendLoadingId(id);

      const res = await fetch(`${API_BASE}/admin/notifications/${id}/send-now`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text || null;
      }

      if (!res.ok) {
        console.error("RESEND ERROR:", res.status, data);
        const message =
          (data && (data.message || data.error)) ||
          `Tekrar gönderim başarısız (status: ${res.status})`;
        showToast({
          type: "error",
          title: "Tekrar gönderilemedi",
          message,
        });
        return;
      }

      showToast({
        type: "success",
        title: "Tekrar gönderildi",
        message: `"${title}" bildirimi tekrar gönderildi.`,
      });

      // Listeyi güncelle (status + sentAt güncellensin)
      await loadNotifications();
    } catch (err) {
      console.error("RESEND ERROR:", err);
      showToast({
        type: "error",
        title: "Tekrar gönderilemedi",
        message: "Beklenmeyen bir hata oluştu.",
      });
    } finally {
      setResendLoadingId(null);
    }
  }

  /* ===== Filtrelenmiş liste ===== */
  const filteredNotifications = useMemo(() => {
    const term = search.trim().toLowerCase();

    return notifications.filter((n) => {
      if (term.length > 0) {
        const haystack = `${n.title} ${n.bodyPreview} ${n.segmentName}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (statusFilter !== "ALL" && n.status !== statusFilter) return false;
      if (channelFilter !== "ALL" && n.channel !== channelFilter) return false;

      return true;
    });
  }, [notifications, search, statusFilter, channelFilter]);

  /* ===== KPI kartları için metrikler ===== */
  const totalSent = useMemo(
    () =>
      notifications.reduce(
        (acc, n) => acc + (Number.isFinite(n.sentCount) ? n.sentCount : 0),
        0
      ),
    [notifications]
  );

  const totalDelivered = useMemo(
    () =>
      notifications.reduce(
        (acc, n) =>
          acc + (Number.isFinite(n.deliveredCount) ? n.deliveredCount : 0),
        0
      ),
    [notifications]
  );

  const totalOpens = useMemo(
    () =>
      notifications.reduce(
        (acc, n) => acc + (Number.isFinite(n.openCount) ? n.openCount : 0),
        0
      ),
    [notifications]
  );

  const openRate =
    totalDelivered > 0 ? Math.round((totalOpens / totalDelivered) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <TopBar />

      <main className="pt-24 pl-[262px] px-6 pb-8 space-y-6">
        {/* Üst başlık */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
              <Bell className="h-3.5 w-3.5" />
              Notification Center
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-slate-50">
              Bildirimler
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">
              DailySpark kullanıcılarına gönderdiğin{" "}
              <span className="text-[#4FFFB0] font-medium">
                push bildirimleri
              </span>{" "}
              bu ekrandan yönetiyorsun. Taslak, planlanmış ve gönderilmiş
              bildirimleri filtreleyebilirsin.
            </p>
          </div>

          {/* Sağ tarafa badge */}
  <OneSignalStatusBadge />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] font-medium text-slate-200 hover:border-slate-600"
              onClick={() => {
                // ileride gelişmiş filtre modal
              }}
            >
              <Filter className="h-3.5 w-3.5" />
              Gelişmiş filtreler
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2979FF] to-[#4FFFB0] px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-[0_12px_35px_rgba(41,121,255,0.6)]"
              onClick={() => {
                router.push("/notifications/create");
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Yeni bildirim oluştur
            </button>
          </div>
        </header>

        {/* Hata mesajı */}
        {error && (
          <div className="rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-3 text-[12px] text-red-200">
            {error}
          </div>
        )}

        {/* KPI Kartları */}
        <section className="grid gap-3 md:grid-cols-4">
          <KpiCard
            label="Toplam Gönderim"
            value={totalSent}
            helper="Bu panel üzerinden gönderilen toplam notification sayısı"
          />
          <KpiCard
            label="Teslim Edilen"
            value={totalDelivered}
            helper="OneSignal tarafından başarıyla teslim edilenler"
          />
          <KpiCard
            label="Açılma Sayısı"
            value={totalOpens}
            helper="Bildirim tıklanarak açılan oturumlar"
          />
          <KpiCard
            label="Ortalama Open Rate"
            value={`${openRate}%`}
            helper="Teslim edilenlere göre açılma oranı"
          />
        </section>

        {/* Arama + üst filtre barı */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
          {/* Search & quick filters */}
          <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 sm:px-5 sm:py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-300">
                <Search className="h-3.5 w-3.5 text-slate-500" />
                <input
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-slate-500"
                  placeholder="Başlık, içerik veya segment ismi ile ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-slate-300 hover:border-slate-600"
              >
                <Filter className="h-3.5 w-3.5" />
                Hızlı filtre
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-slate-300 hover:border-slate-600"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setChannelFilter("ALL");
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sıfırla
              </button>
            </div>
          </div>

          {/* Kolon başı filtreler */}
          <div className="border-b border-slate-800/80 px-4 py-3 sm:px-5">
            <div className="grid gap-2 text-[11px] md:grid-cols-[60px_minmax(0,1.7fr)_minmax(0,1.4fr)_120px_120px_140px_130px]">
              <span className="flex items-center text-[10px] uppercase tracking-[0.16em] text-slate-400">
                ID
              </span>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Başlık
                </span>
                <input
                  className="h-7 rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200 outline-none placeholder:text-slate-500"
                  placeholder="Başlığa göre filtrele"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Segment
                </span>
                <button className="inline-flex h-7 items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200">
                  <span>Tümü</span>
                  <ChevronDown className="h-3 w-3 text-slate-500" />
                </button>
              </div>

              {/* Durum filtresi */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Durum
                </span>
                <select
                  className="h-7 rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200 outline-none"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as StatusFilter)
                  }
                >
                  <option value="ALL">Tümü</option>
                  <option value="SENT">Gönderildi</option>
                  <option value="SCHEDULED">Planlandı</option>
                  <option value="DRAFT">Taslak</option>
                  <option value="FAILED">Hata aldı</option>
                </select>
              </div>

              {/* Kanal filtresi */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Kanal
                </span>
                <select
                  className="h-7 rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200 outline-none"
                  value={channelFilter}
                  onChange={(e) =>
                    setChannelFilter(e.target.value as ChannelFilter)
                  }
                >
                  <option value="ALL">Tümü</option>
                  <option value="PUSH">Push</option>
                  <option value="EMAIL">E-posta</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Plan / Gönderim
                </span>
                <button className="inline-flex h-7 items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200">
                  <span>Tarih aralığı (dummy)</span>
                  <ChevronDown className="h-3 w-3 text-slate-500" />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Aksiyon
                </span>
                <button className="inline-flex h-7 items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200">
                  <span>Hızlı filtre</span>
                  <ChevronDown className="h-3 w-3 text-slate-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Tablo */}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <th className="w-10 px-4 py-2 text-left">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900"
                    />
                  </th>
                  <th className="px-2 py-2 text-left">ID</th>
                  <th className="px-2 py-2 text-left">Başlık</th>
                  <th className="px-2 py-2 text-left">Segment</th>
                  <th className="px-2 py-2 text-left">Kanal</th>
                  <th className="px-2 py-2 text-left">Durum</th>
                  <th className="px-2 py-2 text-left">Oluşturulma</th>
                  <th className="px-2 py-2 text-left">Plan / Gönderim</th>
                  <th className="px-2 py-2 text-left">Performans</th>
                  <th className="w-28 px-4 py-2 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {/* Loading skeleton */}
                {loading && (
                  <>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <tr
                        key={`skeleton-${i}`}
                        className="border-b border-slate-800/60 bg-slate-900/60"
                      >
                        <td className="px-4 py-3">
                          <div className="h-3.5 w-3.5 rounded bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-3 w-8 rounded bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-4 w-40 rounded bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-4 w-32 rounded bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-4 w-16 rounded bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-5 w-14 rounded-full bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-4 w-28 rounded bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-4 w-32 rounded bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-4 w-28 rounded bg-slate-800" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <div className="h-7 w-7 rounded-md bg-slate-800" />
                            <div className="h-7 w-7 rounded-md bg-slate-800" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Veri yok */}
                {!loading && filteredNotifications.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-6 text-center text-[12px] text-slate-400"
                    >
                      Gösterilecek bildirim bulunamadı. Filtreleri değiştirerek
                      tekrar dene.
                    </td>
                  </tr>
                )}

                {/* Gerçek satırlar */}
                {!loading &&
                  filteredNotifications.map((n, idx) => (
                    <tr
                      key={n.id}
                      className={`border-b border-slate-800/60 text-[13px] ${
                        idx % 2 === 1 ? "bg-slate-950/40" : "bg-slate-900/50"
                      } hover:bg-slate-900 transition-colors`}
                    >
                      <td className="px-4 py-2 align-middle">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900"
                        />
                      </td>
                      <td className="px-2 py-2 align-middle text-slate-300">
                        {n.id}
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <div className="flex flex-col">
                          <span className="text-slate-100 font-medium">
                            {n.title}
                          </span>
                          {n.bodyPreview && (
                            <span className="mt-0.5 text-[11px] text-slate-400">
                              {n.bodyPreview}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle text-slate-300">
                        <span className="inline-flex items-center rounded-full bg-slate-800/70 px-2 py-1 text-[11px] text-slate-200">
                          {n.segmentName}
                        </span>
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <ChannelBadge channel={n.channel} />
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <StatusBadge status={n.status} />
                      </td>
                      <td className="px-2 py-2 align-middle text-slate-300">
                        {n.createdAt}
                      </td>
                      <td className="px-2 py-2 align-middle text-slate-300">
                        {n.scheduledAt ? (
                          <div className="flex flex-col">
                            <span className="text-[11px] text-slate-400">
                              Plan:
                            </span>
                            <span>{n.scheduledAt}</span>
                          </div>
                        ) : n.sentAt ? (
                          <div className="flex flex-col">
                            <span className="text-[11px] text-slate-400">
                              Gönderim:
                            </span>
                            <span>{n.sentAt}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[12px]">
                            Henüz planlanmadı
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 align-middle text-slate-300">
                        <div className="flex flex-col text-[11px]">
                          <span>Gönderilen: {n.sentCount}</span>
                          <span>Teslim: {n.deliveredCount}</span>
                          <span>Açılma: {n.openCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle text-right">
                        <div className="inline-flex items-center gap-2">
                          {/* Detay / preview */}
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600 hover:text-slate-50"
                            onClick={() => {
                              // ileride detay sayfası /notifications/:id
                            }}
                          >
                            <BellDot className="h-3.5 w-3.5" />
                          </button>

                          {/* Yeniden gönder */}
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-sky-900/70 bg-sky-950/40 text-sky-300 hover:border-sky-500 hover:text-sky-100 disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={() => handleResend(n.id, n.title)}
                            disabled={resendLoadingId === n.id}
                          >
                            {resendLoadingId === n.id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {/* Düzenle */}
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600 hover:text-slate-50"
                            onClick={() => {
                              router.push(`/notifications/${n.id}/edit`);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          {/* Sil */}
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-900/70 bg-red-950/40 text-red-300 hover:border-red-500 hover:text-red-100"
                            onClick={() => handleDelete(n.id, n.title)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Alt bilgi (pagination placeholder) */}
          <div className="flex flex-col gap-2 border-t border-slate-800 px-4 py-3 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              Toplam {filteredNotifications.length} bildirim
              {loading && " (yükleniyor...)"}.
            </div>
            <div className="inline-flex items-center gap-2">
              <span>Pagination ileride eklenecek</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ===== Küçük bileşenler ===== */

function KpiCard(props: {
  label: string;
  value: number | string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 sm:px-5 sm:py-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {props.label}
      </div>
      <div className="mt-2 text-xl font-semibold text-slate-50">
        {props.value}
      </div>
      <div className="mt-1 text-[11px] text-slate-400">{props.helper}</div>
    </div>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const ch = channel.toUpperCase();
  const isPush = ch === "PUSH";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] border ${
        isPush
          ? "border-sky-400/50 bg-sky-900/30 text-sky-200"
          : "border-emerald-400/50 bg-emerald-900/30 text-emerald-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isPush ? "bg-sky-400" : "bg-emerald-400"
        }`}
      />
      {isPush ? "Push" : "E-posta"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();

  if (s === "SENT" || s === "SENDED" || s === "DELIVERED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-900/30 px-2 py-1 text-[11px] text-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Gönderildi
      </span>
    );
  }

  if (s === "SCHEDULED" || s === "PLANNED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-900/30 px-2 py-1 text-[11px] text-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Planlandı
      </span>
    );
  }

  if (s === "FAILED" || s === "ERROR") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-400/60 bg-red-900/30 px-2 py-1 text-[11px] text-red-200">
        <AlertTriangle className="h-3 w-3" />
        Hata aldı
      </span>
    );
  }

  // DRAFT ve diğerleri
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-600/70 bg-slate-900/60 px-2 py-1 text-[11px] text-slate-200">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Taslak
    </span>
  );
}
