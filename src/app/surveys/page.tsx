"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useToast } from "@/components/Toast";
import {
  ClipboardList,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ChevronDown,
  Pencil,
  Trash2,
  AlertTriangle,
  Send,
  Archive,
  BarChart3,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

/* ====================== Types ====================== */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiSurvey = any;

type SurveyRow = {
  id: number | string;
  title: string;
  descriptionPreview: string;

  status: string; // DRAFT | ACTIVE | ARCHIVED | ...
  audienceName: string; // kitle adı
  questionCount: number;
  totalResponses: number;

  createdAt: string;
  publishedAt?: string | null;
};

type StatusFilter = "ALL" | "DRAFT" | "ACTIVE" | "ARCHIVED";

function safePreview(v: any, max = 90) {
  const s = (v ?? "").toString().trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 3).trimEnd() + "..." : s;
}

function fmtTR(d: any) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStatus(v: any) {
  const s = (v ?? "DRAFT").toString().toUpperCase();
  if (s === "PUBLISHED") return "ACTIVE";
  if (s === "LIVE") return "ACTIVE";
  if (s === "INACTIVE") return "ARCHIVED";
  return s;
}

export default function SurveysPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [actionLoadingId, setActionLoadingId] = useState<number | string | null>(
    null
  );

  /* ====================== Load ====================== */
  const loadSurveys = useCallback(async () => {
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
        showToast({ type: "error", title: "Oturum bulunamadı", message: msg });
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/admin/surveys`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Anketler alınamadı:", res.status, text);
        throw new Error(`Anket listesi alınamadı (status: ${res.status}).`);
      }

      const data = await res.json();

      const rawList: ApiSurvey[] = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.data)
        ? data.data
        : [];

      const mapped: SurveyRow[] = rawList.map((s: ApiSurvey) => {
        const id = s.id ?? s.surveyId ?? "?";
        const title = s.title ?? "Başlıksız anket";
        const descriptionPreview = safePreview(
          s.description ?? s.desc ?? s.note ?? "",
          90
        );

        const status = normalizeStatus(s.status ?? s.surveyStatus ?? "DRAFT");

        const audienceName =
          s.audienceName ??
          s.segmentName ??
          s.audience?.name ??
          s.audience?.title ??
          "Tüm kullanıcılar";

        // Çoktan seçmeli: tek soru veya çok soru olabilir; backend nasıl döndürürse
        const questionCount = Number(
          s.questionCount ??
            s.questionsCount ??
            (Array.isArray(s.questions) ? s.questions.length : 0) ??
            0
        );

        const totalResponses = Number(
          s.totalResponses ??
            s.responsesCount ??
            s.answerCount ??
            s.submissionsCount ??
            0
        );

        const createdAt = fmtTR(s.createdAt ?? s.created_at ?? s.createdDate);
        const publishedAt = s.publishedAt ?? s.sentAt ?? s.activatedAt ?? null;

        return {
          id,
          title,
          descriptionPreview,
          status,
          audienceName,
          questionCount,
          totalResponses,
          createdAt,
          publishedAt: publishedAt ? fmtTR(publishedAt) : null,
        };
      });

      setSurveys(mapped);
    } catch (err: any) {
      console.error("Anket listesi yüklenirken hata:", err);
      const msg =
        err?.message || "Anketler alınırken bir hata oluştu. Lütfen tekrar dene.";
      setError(msg);
      showToast({ type: "error", title: "Anketler yüklenemedi", message: msg });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadSurveys();
  }, [loadSurveys]);

  /* ====================== Actions ====================== */

  async function withToken() {
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
      return null;
    }
    return token;
  }

  async function handleDelete(id: number | string, title: string) {
    const ok = window.confirm(`"${title}" anketini silmek istediğine emin misin?`);
    if (!ok) return;

    const token = await withToken();
    if (!token) return;

    try {
      setActionLoadingId(id);

      const res = await fetch(`${API_BASE}/admin/surveys/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("DELETE SURVEY ERROR:", res.status, text);
        showToast({
          type: "error",
          title: "Silinemedi",
          message: "Anket silinirken bir hata oluştu.",
        });
        return;
      }

      setSurveys((prev) => prev.filter((x) => x.id !== id));
      showToast({
        type: "success",
        title: "Silindi",
        message: `"${title}" anketi başarıyla silindi.`,
      });
    } catch (e) {
      console.error("DELETE SURVEY ERROR:", e);
      showToast({
        type: "error",
        title: "Silinemedi",
        message: "Beklenmeyen bir hata oluştu.",
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handlePublish(id: number | string, title: string) {
    const ok = window.confirm(`"${title}" anketini yayınlamak istediğine emin misin?`);
    if (!ok) return;

    const token = await withToken();
    if (!token) return;

    try {
      setActionLoadingId(id);

      const res = await fetch(`${API_BASE}/admin/surveys/${id}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text || null;
      }

      if (!res.ok) {
        const msg = data?.message || data?.error || "Yayınlanamadı";
        showToast({ type: "error", title: "Yayınlanamadı", message: String(msg) });
        return;
      }

      showToast({
        type: "success",
        title: "Yayınlandı",
        message: `"${title}" anketi yayınlandı.`,
      });

      await loadSurveys();
    } catch (e) {
      console.error("PUBLISH SURVEY ERROR:", e);
      showToast({ type: "error", title: "Yayınlanamadı", message: "Beklenmeyen hata." });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleArchive(id: number | string, title: string) {
    const ok = window.confirm(`"${title}" anketini arşivlemek istediğine emin misin?`);
    if (!ok) return;

    const token = await withToken();
    if (!token) return;

    try {
      setActionLoadingId(id);

      const res = await fetch(`${API_BASE}/admin/surveys/${id}/archive`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text || null;
      }

      if (!res.ok) {
        const msg = data?.message || data?.error || "Arşivlenemedi";
        showToast({ type: "error", title: "Arşivlenemedi", message: String(msg) });
        return;
      }

      showToast({
        type: "success",
        title: "Arşivlendi",
        message: `"${title}" anketi arşivlendi.`,
      });

      await loadSurveys();
    } catch (e) {
      console.error("ARCHIVE SURVEY ERROR:", e);
      showToast({ type: "error", title: "Arşivlenemedi", message: "Beklenmeyen hata." });
    } finally {
      setActionLoadingId(null);
    }
  }

  /* ====================== Filters ====================== */
  const filteredSurveys = useMemo(() => {
    const term = search.trim().toLowerCase();

    return surveys.filter((s) => {
      if (term.length > 0) {
        const hay = `${s.title} ${s.descriptionPreview} ${s.audienceName}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
      return true;
    });
  }, [surveys, search, statusFilter]);

  /* ====================== KPIs ====================== */
  const totalSurveys = surveys.length;

  const activeCount = useMemo(
    () => surveys.filter((s) => s.status === "ACTIVE").length,
    [surveys]
  );

  const totalResponses = useMemo(
    () =>
      surveys.reduce(
        (acc, s) => acc + (Number.isFinite(s.totalResponses) ? s.totalResponses : 0),
        0
      ),
    [surveys]
  );

  const avgQuestions = useMemo(() => {
    if (!surveys.length) return 0;
    const sum = surveys.reduce(
      (acc, s) => acc + (Number.isFinite(s.questionCount) ? s.questionCount : 0),
      0
    );
    return Math.round(sum / surveys.length);
  }, [surveys]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <TopBar />

      <main className="pt-24 pl-[262px] px-6 pb-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
              <ClipboardList className="h-3.5 w-3.5" />
              Survey Manager
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-slate-50">
              Anketler
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">
              DailySpark kullanıcılarına göndereceğin{" "}
              <span className="text-[#4FFFB0] font-medium">çoktan seçmeli</span>{" "}
              anketleri buradan yönetirsin. Taslak oluştur, yayınla veya arşivle.
            </p>
          </div>

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
              onClick={() => router.push("/surveys/create")}
            >
              <Plus className="h-3.5 w-3.5" />
              Yeni anket oluştur
            </button>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-3 text-[12px] text-red-200">
            {error}
          </div>
        )}

        {/* KPI */}
        <section className="grid gap-3 md:grid-cols-4">
          <KpiCard
            label="Toplam Anket"
            value={totalSurveys}
            helper="Panelde oluşturulan toplam anket sayısı"
            icon={<ClipboardList className="h-4 w-4" />}
          />
          <KpiCard
            label="Aktif Anket"
            value={activeCount}
            helper="Yayında olan anketler"
            icon={<Send className="h-4 w-4" />}
          />
          <KpiCard
            label="Toplam Yanıt"
            value={totalResponses}
            helper="Anketlere verilen toplam yanıt sayısı"
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <KpiCard
            label="Ortalama Soru"
            value={avgQuestions}
            helper="Anket başına ortalama soru sayısı"
            icon={<Users className="h-4 w-4" />}
          />
        </section>

        {/* Table wrapper */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
          {/* Search bar */}
          <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 sm:px-5 sm:py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-300">
                <Search className="h-3.5 w-3.5 text-slate-500" />
                <input
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-slate-500"
                  placeholder="Başlık, açıklama veya kitle adı ile ara..."
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
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sıfırla
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-slate-300 hover:border-slate-600"
                onClick={() => loadSurveys()}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Yenile
              </button>
            </div>
          </div>

          {/* Column filters */}
          <div className="border-b border-slate-800/80 px-4 py-3 sm:px-5">
            <div className="grid gap-2 text-[11px] md:grid-cols-[70px_minmax(0,1.7fr)_minmax(0,1.2fr)_140px_120px_150px_130px]">
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
                  Kitle
                </span>
                <button className="inline-flex h-7 items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200">
                  <span>Tümü</span>
                  <ChevronDown className="h-3 w-3 text-slate-500" />
                </button>
              </div>

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
                  <option value="DRAFT">Taslak</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="ARCHIVED">Arşiv</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Soru
                </span>
                <button className="inline-flex h-7 items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200">
                  <span>—</span>
                  <ChevronDown className="h-3 w-3 text-slate-500" />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Oluşturulma
                </span>
                <button className="inline-flex h-7 items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200">
                  <span>Tarih (dummy)</span>
                  <ChevronDown className="h-3 w-3 text-slate-500" />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Aksiyon
                </span>
                <button className="inline-flex h-7 items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200">
                  <span>Hızlı</span>
                  <ChevronDown className="h-3 w-3 text-slate-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
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
                  <th className="px-2 py-2 text-left">Kitle</th>
                  <th className="px-2 py-2 text-left">Durum</th>
                  <th className="px-2 py-2 text-left">Soru</th>
                  <th className="px-2 py-2 text-left">Yanıt</th>
                  <th className="px-2 py-2 text-left">Oluşturulma</th>
                  <th className="px-2 py-2 text-left">Yayın</th>
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
                          <div className="h-3 w-10 rounded bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-4 w-48 rounded bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-4 w-32 rounded bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-5 w-16 rounded-full bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-4 w-10 rounded bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-4 w-16 rounded bg-slate-800" />
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
                            <div className="h-7 w-7 rounded-md bg-slate-800" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Empty */}
                {!loading && filteredSurveys.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-6 text-center text-[12px] text-slate-400"
                    >
                      Gösterilecek anket bulunamadı. Filtreleri değiştirerek tekrar dene.
                    </td>
                  </tr>
                )}

                {/* Rows */}
                {!loading &&
                  filteredSurveys.map((s, idx) => {
                    const busy = actionLoadingId === s.id;

                    return (
                      <tr
                        key={s.id}
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
                          {s.id}
                        </td>

                        <td className="px-2 py-2 align-middle">
                          <div className="flex flex-col">
                            <span className="text-slate-100 font-medium">
                              {s.title}
                            </span>
                            {s.descriptionPreview ? (
                              <span className="mt-0.5 text-[11px] text-slate-400">
                                {s.descriptionPreview}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-2 py-2 align-middle text-slate-300">
                          <span className="inline-flex items-center rounded-full bg-slate-800/70 px-2 py-1 text-[11px] text-slate-200">
                            {s.audienceName}
                          </span>
                        </td>

                        <td className="px-2 py-2 align-middle">
                          <SurveyStatusBadge status={s.status} />
                        </td>

                        <td className="px-2 py-2 align-middle text-slate-300">
                          {s.questionCount}
                        </td>

                        <td className="px-2 py-2 align-middle text-slate-300">
                          {s.totalResponses}
                        </td>

                        <td className="px-2 py-2 align-middle text-slate-300">
                          {s.createdAt}
                        </td>

                        <td className="px-2 py-2 align-middle text-slate-300">
                          {s.publishedAt ? (
                            <div className="flex flex-col">
                              <span className="text-[11px] text-slate-400">
                                Yayın:
                              </span>
                              <span>{s.publishedAt}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[12px]">
                              —
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-2 align-middle text-right">
                          <div className="inline-flex items-center gap-2">
                            {/* Publish / Archive */}
                            {s.status === "DRAFT" ? (
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-emerald-900/70 bg-emerald-950/40 text-emerald-200 hover:border-emerald-500 hover:text-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={() => handlePublish(s.id, s.title)}
                                disabled={busy}
                                title="Yayınla"
                              >
                                {busy ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Send className="h-3.5 w-3.5" />
                                )}
                              </button>
                            ) : s.status === "ACTIVE" ? (
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-amber-900/70 bg-amber-950/40 text-amber-200 hover:border-amber-500 hover:text-amber-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={() => handleArchive(s.id, s.title)}
                                disabled={busy}
                                title="Arşivle"
                              >
                                {busy ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Archive className="h-3.5 w-3.5" />
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 bg-slate-950/70 text-slate-500 cursor-not-allowed"
                                disabled
                                title="Arşivde"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600 hover:text-slate-50"
                              onClick={() => router.push(`/surveys/${s.id}/edit`)}
                              title="Düzenle"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-900/70 bg-red-950/40 text-red-300 hover:border-red-500 hover:text-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
                              onClick={() => handleDelete(s.id, s.title)}
                              disabled={busy}
                              title="Sil"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-2 border-t border-slate-800 px-4 py-3 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              Toplam {filteredSurveys.length} anket
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

/* ====================== Small components ====================== */

function KpiCard(props: {
  label: string;
  value: number | string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          {props.label}
        </div>
        <div className="text-slate-500">{props.icon}</div>
      </div>
      <div className="mt-2 text-xl font-semibold text-slate-50">{props.value}</div>
      <div className="mt-1 text-[11px] text-slate-400">{props.helper}</div>
    </div>
  );
}

function SurveyStatusBadge({ status }: { status: string }) {
  const s = (status || "").toUpperCase();

  if (s === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-900/30 px-2 py-1 text-[11px] text-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Aktif
      </span>
    );
  }

  if (s === "ARCHIVED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-600/70 bg-slate-900/60 px-2 py-1 text-[11px] text-slate-200">
        <Archive className="h-3 w-3" />
        Arşiv
      </span>
    );
  }

  if (s === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-400/60 bg-red-900/30 px-2 py-1 text-[11px] text-red-200">
        <AlertTriangle className="h-3 w-3" />
        Hata
      </span>
    );
  }

  // Default: DRAFT
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-900/30 px-2 py-1 text-[11px] text-amber-200">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Taslak
    </span>
  );
}
