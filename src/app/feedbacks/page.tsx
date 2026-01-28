// src/app/feedbacks/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useToast } from "@/components/Toast";
import {
  MessageSquare,
  Search,
  RefreshCw,
  AlertTriangle,
  Eye,
} from "lucide-react";

const API_BASE = "https://notification-backend-d1ol.onrender.com";

// Backend generic tipi
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiFeedback = any;

type FeedbackRow = {
  id: number | string;
  note: string;
  notePreview: string;
  rating: number | null;
  userEmail?: string | null;
  userName?: string | null;
  userId?: number | null;
  createdAt: string;
};

export default function FeedbacksPage() {
  const { showToast } = useToast();
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  const loadFeedbacks = useCallback(async () => {
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

      const params = new URLSearchParams();
      if (search.trim().length > 0) params.set("search", search.trim());
      if (ratingFilter) params.set("rating", String(ratingFilter));

      const query = params.toString();
      const url =
        query.length > 0
          ? `${API_BASE}/admin/feedbacks?${query}`
          : `${API_BASE}/admin/feedbacks`;

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Feedback list error:", res.status, text);
        throw new Error(`Feedback listesi alınamadı (status: ${res.status}).`);
      }

      const data = await res.json();

      const rawList: ApiFeedback[] = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.data)
        ? data.data
        : [];

      const mapped: FeedbackRow[] = rawList.map((f: ApiFeedback) => {
        const id = f.id ?? "?";
        const note: string =
          f.note ?? f.message ?? f.text ?? "(Not girilmemiş)";
        const trimmed = note.trim();
        const notePreview =
          trimmed.length > 100
            ? trimmed.slice(0, 97).trimEnd() + "..."
            : trimmed;

        const createdAtRaw =
          f.createdAt ?? f.created_at ?? f.createdDate ?? null;
        const createdAt = createdAtRaw
          ? new Date(createdAtRaw).toLocaleString("tr-TR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-";

        const user = f.user ?? {};
        const userEmail = user.email ?? null;
        const userName =
          user.firstName || user.lastName
            ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
            : null;

        return {
          id,
          note,
          notePreview,
          rating:
            typeof f.rating === "number" && !Number.isNaN(f.rating)
              ? f.rating
              : null,
          userEmail,
          userName,
          userId: user.id ?? null,
          createdAt,
        };
      });

      setFeedbacks(mapped);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Feedback list load error:", err);
      const msg =
        err?.message ||
        "Feedbackler alınırken bir hata oluştu. Lütfen tekrar dene.";
      setError(msg);
      showToast({
        type: "error",
        title: "Feedbackler yüklenemedi",
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  }, [search, ratingFilter, showToast]);

  useEffect(() => {
    void loadFeedbacks();
  }, [loadFeedbacks]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return feedbacks.filter((f) => {
      if (term.length > 0) {
        const haystack = `${f.note} ${f.userEmail ?? ""} ${
          f.userName ?? ""
        }`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (ratingFilter && f.rating !== ratingFilter) return false;

      return true;
    });
  }, [feedbacks, search, ratingFilter]);

  const total = filtered.length;
  const avgRating =
    filtered.length > 0
      ? (
          filtered.reduce(
            (acc, f) => acc + (f.rating ?? 0),
            0
          ) / filtered.length
        ).toFixed(1)
      : "-";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <TopBar />

      <main className="pt-24 pl-[262px] px-6 pb-8 space-y-6">
        {/* Başlık */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
              <MessageSquare className="h-3.5 w-3.5" />
              Feedback Center
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-slate-50">
              Kullanıcı Feedbackleri
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">
              DailySpark kullanıcılarının uygulama içinden gönderdikleri{" "}
              <span className="text-[#4FFFB0] font-medium">
                puan ve yorumları
              </span>{" "}
              bu ekrandan takip edebilirsin.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] font-medium text-slate-200 hover:border-slate-600"
            onClick={() => void loadFeedbacks()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Yenile
          </button>
        </header>

        {error && (
          <div className="rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-3 text-[12px] text-red-200">
            {error}
          </div>
        )}

        {/* KPI kartları */}
        <section className="grid gap-3 md:grid-cols-3">
          <KpiCard
            label="Toplam Feedback"
            value={total}
            helper="Filtrelere göre listelenen feedback sayısı"
          />
          <KpiCard
            label="Ortalama Puan"
            value={avgRating}
            helper="Kullanıcıların verdiği ortalama rating"
          />
          <KpiCard
            label="Bugün Gönderilen"
            value={feedbacks.filter((f) => isTodayString(f.createdAt)).length}
            helper="Sadece bugün oluşturulan feedbackler"
          />
        </section>

        {/* Ana kart */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
          {/* Arama + filtreler */}
          <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 sm:px-5 sm:py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-300">
                <Search className="h-3.5 w-3.5 text-slate-500" />
                <input
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-slate-500"
                  placeholder="Not, kullanıcı adı veya e-posta ile ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <select
                className="h-8 rounded-lg border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200 outline-none"
                value={ratingFilter ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setRatingFilter(v ? Number(v) : null);
                }}
              >
                <option value="">Tüm puanlar</option>
                <option value="5">5 ⭐️</option>
                <option value="4">4 ⭐️</option>
                <option value="3">3 ⭐️</option>
                <option value="2">2 ⭐️</option>
                <option value="1">1 ⭐️</option>
              </select>

              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-slate-300 hover:border-slate-600"
                onClick={() => {
                  setSearch("");
                  setRatingFilter(null);
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sıfırla
              </button>
            </div>
          </div>

          {/* Tablo */}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-2 py-2 text-left">Feedback</th>
                  <th className="px-2 py-2 text-left">Kullanıcı</th>
                  <th className="px-2 py-2 text-left">Puan</th>
                  <th className="px-2 py-2 text-left">Oluşturulma</th>
                  <th className="w-20 px-4 py-2 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr
                      key={`sk-${i}`}
                      className="border-b border-slate-800/60 bg-slate-900/60"
                    >
                      <td className="px-4 py-3">
                        <div className="h-3 w-8 rounded bg-slate-800" />
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-4 w-64 rounded bg-slate-800" />
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-4 w-40 rounded bg-slate-800" />
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-4 w-10 rounded bg-slate-800" />
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-4 w-28 rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="h-7 w-7 rounded bg-slate-800" />
                      </td>
                    </tr>
                  ))}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-[12px] text-slate-400"
                    >
                      Gösterilecek feedback bulunamadı.
                    </td>
                  </tr>
                )}

                {!loading &&
                  filtered.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-slate-800/60 bg-slate-900/50 hover:bg-slate-900 transition-colors text-[13px]"
                    >
                      <td className="px-4 py-2 align-middle text-slate-300">
                        {f.id}
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <div className="flex flex-col">
                          <span className="text-slate-100">
                            {f.notePreview}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle text-slate-300">
                        {f.userEmail ? (
                          <span className="text-[12px]">
                            {f.userName ? `${f.userName} • ` : ""}
                            {f.userEmail}
                          </span>
                        ) : f.userId ? (
                          <span className="text-[12px]">
                            Kullanıcı #{f.userId}
                          </span>
                        ) : (
                          <span className="text-[12px] text-slate-500">
                            Anonim
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 align-middle text-slate-300">
                        {f.rating ? `${f.rating} / 5` : "-"}
                      </td>
                      <td className="px-2 py-2 align-middle text-slate-300">
                        {f.createdAt}
                      </td>
                      <td className="px-4 py-2 align-middle text-right">
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600 hover:text-slate-50"
                          onClick={() => {
                            // ileride detay modal / sayfa ekleriz
                            alert(f.note);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ==== yardımcılar & küçük bileşenler ==== */

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

// createdAt string'i "bugün mü" kontrolü için küçük helper
function isTodayString(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
