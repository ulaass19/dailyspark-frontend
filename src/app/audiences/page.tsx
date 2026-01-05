// src/app/audiences/page.tsx
"use client";

import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Pencil,
  Trash2,
} from "lucide-react";

import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

type AudienceRow = {
  id: number | string;
  name: string;
  description: string;
  userCount: number;
  createdAt: string;
};

type PendingDeleteState = {
  id: number | string;
  timeoutId: ReturnType<typeof setTimeout>;
};

export default function AudiencesPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [audiences, setAudiences] = useState<AudienceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [descFilter, setDescFilter] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const limit = 10;

  // undo için pending delete state (TEKİL silme)
  const [pendingDelete, setPendingDelete] =
    useState<PendingDeleteState | null>(null);

  // toplu seçim için seçili ID’ler
  const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);

  /* ========= Data Fetch: GET /admin/audiences ========= */
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("dailyspark_admin_token")
            : null;

        if (!token) {
          setError("Oturum bulunamadı. Lütfen tekrar giriş yap.");
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/admin/audiences`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Audiences list error:", res.status, text);
          throw new Error(
            `Kitleler alınamadı (status: ${res.status}).`
          );
        }

        const data = await res.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawList: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.data)
          ? data.data
          : [];

        const mapped: AudienceRow[] = rawList.map((a) => {
          const id = a.id ?? a.audienceId ?? "?";
          const name = a.name ?? "İsimsiz kitle";
          const description = a.description ?? "";
          const userCount = Number(a.userCount ?? 0);
          const createdAtRaw =
            a.createdAt ?? a.created_at ?? a.createdDate ?? null;

          const createdAt = createdAtRaw
            ? new Date(createdAtRaw).toLocaleString("tr-TR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-";

          return {
            id,
            name,
            description,
            userCount,
            createdAt,
          };
        });

        setAudiences(mapped);
        setSelectedIds([]); // liste yenilenince seçimleri temizle
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Audiences load error:", err);
        setError(
          err?.message ||
            "Kitleler alınırken bir hata oluştu. Lütfen tekrar dene."
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  /* ========= Filtrelenmiş liste ========= */
  const filtered = useMemo(() => {
    return audiences.filter((a) => {
      if (search.trim()) {
        const txt = `${a.name} ${a.description}`.toLowerCase();
        if (!txt.includes(search.toLowerCase())) return false;
      }
      if (
        nameFilter.trim() &&
        !a.name.toLowerCase().includes(nameFilter.toLowerCase())
      ) {
        return false;
      }
      if (
        descFilter.trim() &&
        !a.description.toLowerCase().includes(descFilter.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [audiences, search, nameFilter, descFilter]);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  // Sayfa dışına çıkmışsa geri çek
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * limit, page * limit),
    [filtered, page, limit]
  );

  /* ========= Checkbox helpers ========= */
  function toggleSelect(id: number | string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAllOnPage() {
    const idsOnPage = paged.map((a) => a.id);
    const allSelectedOnPage = idsOnPage.every((id) =>
      selectedIds.includes(id)
    );

    if (allSelectedOnPage) {
      // bu sayfadakileri seçimden çıkart
      setSelectedIds((prev) => prev.filter((id) => !idsOnPage.includes(id)));
    } else {
      // bu sayfadakileri ekle
      setSelectedIds((prev) => {
        const set = new Set(prev);
        idsOnPage.forEach((id) => set.add(id));
        return Array.from(set);
      });
    }
  }

  const allSelectedOnPage =
    paged.length > 0 &&
    paged.every((a) => selectedIds.includes(a.id));

  /* ========= Gerçek silme işlemi (TEKİL, UNDO ile) ========= */
  async function actuallyDelete(audience: AudienceRow) {
    try {
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

      const res = await fetch(
        `${API_BASE}/admin/audiences/${audience.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        let msg = `Kitle silinemedi (status: ${res.status})`;
        try {
          const data = await res.json();
          if (data?.message) {
            msg =
              Array.isArray(data.message) && data.message.length
                ? data.message.join("\n")
                : String(data.message);
          }
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      setAudiences((prev) =>
        prev.filter((x) => x.id !== audience.id)
      );
      setSelectedIds((prev) => prev.filter((id) => id !== audience.id));

      showToast({
        type: "success",
        title: "Kitle silindi",
        message: `"${audience.name}" başarıyla silindi.`,
        autoCloseMs: 3000,
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Audience delete error:", err);
      showToast({
        type: "error",
        title: "Silme başarısız",
        message:
          err?.message ||
          "Kitle silinirken bir hata oluştu. Lütfen tekrar dene.",
        autoCloseMs: 4000,
      });
    } finally {
      setPendingDelete((current) =>
        current && current.id === audience.id ? null : current
      );
    }
  }

  /* ========= Sil butonu (5 sn UNDO’lu TEKİL) ========= */
  function handleDeleteClick(audience: AudienceRow) {
    // Mevcut pending delete varsa iptal et
    setPendingDelete((current) => {
      if (current) {
        clearTimeout(current.timeoutId);
      }
      return null;
    });

    const timeoutId = setTimeout(() => {
      void actuallyDelete(audience);
    }, 5000);

    setPendingDelete({
      id: audience.id,
      timeoutId,
    });

    showToast({
      type: "error",
      title: "Silme işlemi hazırlanıyor",
      message: `"${audience.name}" 5 saniye içinde silinecek. Geri almak için 'Geri al' butonuna tıkla.`,
      actionLabel: "Geri al",
      onAction: () => {
        setPendingDelete((current) => {
          if (!current || current.id !== audience.id) return current;
          clearTimeout(current.timeoutId);
          return null;
        });
      },
      autoCloseMs: 5000,
    });
  }

  /* ========= TOPLU SİLME (anında, confirm ile) ========= */
  async function handleBulkDelete() {
    if (selectedIds.length === 0) {
      showToast({
        type: "success",
        title: "Seçim yok",
        message: "Lütfen önce silmek istediğin kitleleri seç.",
        autoCloseMs: 3000,
      });
      return;
    }

    const ok = window.confirm(
      `Seçili ${selectedIds.length} kitleyi silmek istediğine emin misin?`
    );
    if (!ok) return;

    try {
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

      setLoading(true);

      const idsToDelete = [...selectedIds];
      let successCount = 0;
      let failCount = 0;

      for (const id of idsToDelete) {
        try {
          const res = await fetch(
            `${API_BASE}/admin/audiences/${id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!res.ok) {
            failCount++;
          } else {
            successCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) {
        setAudiences((prev) =>
          prev.filter((a) => !idsToDelete.includes(a.id))
        );
        setSelectedIds((prev) =>
          prev.filter((id) => !idsToDelete.includes(id))
        );
      }

      if (successCount > 0) {
        showToast({
          type: "success",
          title: "Toplu silme tamamlandı",
          message: `${successCount} kitle başarıyla silindi.${
            failCount > 0 ? ` ${failCount} kitle silinemedi.` : ""
          }`,
          autoCloseMs: 4000,
        });
      } else if (failCount > 0) {
        showToast({
          type: "error",
          title: "Toplu silme başarısız",
          message: "Kitleler silinirken bir hata oluştu.",
          autoCloseMs: 4000,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <TopBar />

      <main className="pt-24 pl-[262px] px-6 pb-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
              <Users className="h-3.5 w-3.5" />
              Audience Center
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-slate-50">
              Kitleler
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">
              Kitlelerini yönet, düzenle ve hedefli bildirimler oluştur.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/audiences/create")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2979FF] to-[#4FFFB0] px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-[0_12px_35px_rgba(41,121,255,0.6)]"
          >
            + Yeni kitle oluştur
          </button>
        </header>

        {/* Hata mesajı */}
        {error && (
          <div className="rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-3 text-[12px] text-red-200">
            {error}
          </div>
        )}

        {/* Data Table Container */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
          {/* Top search & filters */}
          <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 sm:px-5 sm:py-4 md:flex-row md:items-center md:justify-between">
            {/* Search */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-300">
                <Search className="h-3.5 w-3.5 text-slate-500" />
                <input
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-slate-500"
                  placeholder="Kitle adı veya açıklama ile ara..."
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                />
              </div>
            </div>

            {/* Quick filters + bulk delete */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <button className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-slate-300 hover:border-slate-600">
                <Filter className="h-3.5 w-3.5" />
                Filtreler
              </button>

              <button
                onClick={() => {
                  setSearch("");
                  setNameFilter("");
                  setDescFilter("");
                  setPage(1);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-slate-300 hover:border-slate-600"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sıfırla
              </button>

              {/* BULK DELETE BUTTON */}
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0 || loading}
                className="inline-flex items-center gap-1 rounded-full border border-red-900/70 bg-red-950/40 px-2.5 py-1.5 text-red-300 hover:border-red-500 hover:text-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {selectedIds.length > 0
                  ? `Seçili (${selectedIds.length}) kitleyi sil`
                  : "Seçili kitleleri sil"}
              </button>
            </div>
          </div>

          {/* Filter Row (column filters) */}
          <div className="border-b border-slate-800/80 px-4 py-3 sm:px-5">
            <div className="grid gap-2 text-[11px] md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_120px_150px_90px]">
              {/* Kitle Adı */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Kitle Adı
                </span>
                <input
                  className="h-7 rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200 outline-none placeholder:text-slate-500"
                  placeholder="Ada göre filtrele"
                  value={nameFilter}
                  onChange={(e) => {
                    setPage(1);
                    setNameFilter(e.target.value);
                  }}
                />
              </div>

              {/* Açıklama */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Açıklama
                </span>
                <input
                  className="h-7 rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200 outline-none placeholder:text-slate-500"
                  placeholder="Açıklamaya göre filtrele"
                  value={descFilter}
                  onChange={(e) => {
                    setPage(1);
                    setDescFilter(e.target.value);
                  }}
                />
              </div>

              {/* Kullanıcı */}
              <div className="flex items-end text-slate-400 text-[11px]">
                Kullanıcı
              </div>

              {/* Tarih */}
              <div className="flex items-end text-slate-400 text-[11px]">
                Oluşturulma
              </div>

              {/* Aksiyon */}
              <div className="flex items-end text-slate-400 text-[11px]">
                İşlemler
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  {/* CHECKBOX HEADER */}
                  <th className="w-10 px-4 py-2 text-left">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900"
                      checked={allSelectedOnPage}
                      onChange={toggleSelectAllOnPage}
                    />
                  </th>

                  <th className="px-2 py-2 text-left">ID</th>
                  <th className="px-2 py-2 text-left">Kitle adı</th>
                  <th className="px-2 py-2 text-left">Açıklama</th>
                  <th className="px-2 py-2 text-left">Kullanıcı sayısı</th>
                  <th className="px-4 py-2 text-right">İşlemler</th>
                </tr>
              </thead>

              <tbody>
                {/* LOADING SKELETON */}
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-800/60 bg-slate-900/60"
                    >
                      <td className="px-4 py-3">
                        <div className="h-3.5 w-3.5 rounded bg-slate-800" />
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-3 w-6 rounded bg-slate-800" />
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-4 w-40 rounded bg-slate-800" />
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-4 w-60 rounded bg-slate-800" />
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-4 w-10 rounded bg-slate-800" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <div className="h-7 w-7 rounded-md bg-slate-800" />
                        </div>
                      </td>
                    </tr>
                  ))}

                {/* EMPTY STATE */}
                {!loading && paged.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-[12px] text-slate-400"
                    >
                      Gösterilecek kitle bulunamadı.
                    </td>
                  </tr>
                )}

                {/* NORMAL ROWS */}
                {!loading &&
                  paged.map((a, idx) => (
                    <tr
                      key={a.id}
                      className={`border-b border-slate-800/60 text-[13px] ${
                        idx % 2 === 1
                          ? "bg-slate-950/40"
                          : "bg-slate-900/50"
                      } hover:bg-slate-900 transition-colors`}
                    >
                      {/* ROW CHECKBOX */}
                      <td className="px-4 py-2 align-middle">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900"
                          checked={selectedIds.includes(a.id)}
                          onChange={() => toggleSelect(a.id)}
                        />
                      </td>

                      <td className="px-2 py-2 align-middle text-slate-300">
                        {a.id}
                      </td>

                      <td className="px-2 py-2 align-middle">
                        <span className="text-slate-100 font-medium">
                          {a.name}
                        </span>
                      </td>

                      <td className="px-2 py-2 align-middle text-slate-300">
                        {a.description || "—"}
                      </td>

                      <td className="px-2 py-2 align-middle text-slate-300">
                        {a.userCount}
                      </td>

                      <td className="px-4 py-2 align-middle text-right">
                        <div className="inline-flex items-center gap-2">
                          {/* EDIT */}
                          <button
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600 hover:text-slate-50"
                            onClick={() =>
                              router.push(`/audiences/${a.id}/edit`)
                            }
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          {/* DELETE (5 sn UNDO) */}
                          <button
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-900/70 bg-red-950/40 text-red-300 hover:border-red-500 hover:text-red-100"
                            onClick={() => handleDeleteClick(a)}
                            disabled={
                              pendingDelete?.id === a.id
                            }
                          >
                            {pendingDelete?.id === a.id ? (
                              <span className="text-[10px]">
                                ...
                              </span>
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex items-center justify-between px-4 py-3 text-[11px] text-slate-400 border-t border-slate-800">
            <div>Toplam {totalCount} kitle</div>
            <div className="inline-flex items-center gap-2">
              <span>
                Sayfa {page} / {totalPages}
              </span>
              <div className="inline-flex rounded-full border border-slate-800 bg-slate-950/80 text-[10px]">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() =>
                    setPage((p) => Math.max(1, p - 1))
                  }
                  className="px-2 py-1 text-slate-500 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Önceki
                </button>
                <div className="h-5 w-px bg-slate-800" />
                <button
                  disabled={page >= totalPages || loading}
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="px-2 py-1 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sonraki
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
