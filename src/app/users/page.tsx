// src/app/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import { AddUserButton } from "@/components/AddUserButton";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import {
  UserCog,
  Search,
  Filter,
  RefreshCw,
  Upload,
  ChevronDown,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

/* ===== Tipler ===== */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiUser = any;

type UserRow = {
  id: number | string;
  name: string;
  email: string;
  role: string; // "ADMIN" | "USER" | ...
  createdAt: string;
  status: "AKTIF" | "PASIF" | string;
};

type PendingDeleteState = {
  id: number | string;
  timeoutId: ReturnType<typeof setTimeout>;
  expiresAt: number;
};

type RoleFilter = "ALL" | "USER" | "ADMIN";
type StatusFilter = "ALL" | "AKTIF" | "PASIF";

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // backend pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // filtreler
  const [search, setSearch] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [dateFilter, setDateFilter] = useState(""); // yyyy-mm-dd
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL"); // sadece front-end

  // silme için beklemede olan user
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(
    null
  );
  const [now, setNow] = useState<number>(() => Date.now());

  // durum toggle için loading
  const [togglingId, setTogglingId] = useState<number | string | null>(null);

  const router = useRouter();
  const { showToast } = useToast();

  /* ===== Data fetch: GET /mobile/users (filtreli) ===== */
  useEffect(() => {
    async function loadUsers() {
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

        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));

        if (search.trim()) params.set("search", search.trim());
        if (nameFilter.trim()) params.set("fullName", nameFilter.trim());
        if (emailFilter.trim()) params.set("email", emailFilter.trim());
        if (roleFilter !== "ALL") params.set("role", roleFilter);
        if (dateFilter) {
          params.set("createdFrom", dateFilter);
          params.set("createdTo", dateFilter);
        }

        const url = `${API_BASE}/mobile/users?${params.toString()}`;

        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Kullanıcılar alınamadı (status: ${res.status})`);
        }

        const data = await res.json();

        const rawList: ApiUser[] = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.data)
          ? data.data
          : [];

        const total =
          typeof data?.total === "number" ? data.total : rawList.length;
        const totalPagesFromApi =
          typeof data?.totalPages === "number" ? data.totalPages : 1;

        const mapped: UserRow[] = rawList.map((u: ApiUser): UserRow => {
          const id = u.id ?? u.userId ?? "?";
          const name =
            u.fullName ??
            (`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ||
              "İsimsiz Kullanıcı");
          const email = u.email ?? "—";
          const role =
            (u.role ?? u.userRole ?? "USER").toString().toUpperCase();
          const createdAtRaw =
            u.createdAt ??
            u.created_at ??
            u.joinedAt ??
            u.createdDate ??
            null;
          const createdAt = createdAtRaw
            ? new Date(createdAtRaw).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "—";

          const active =
            u.isActive ??
            u.active ??
            (typeof u.status === "string"
              ? u.status.toUpperCase() === "ACTIVE"
              : true);
          const status: "AKTIF" | "PASIF" | string = active ? "AKTIF" : "PASIF";

          return { id, name, email, role, createdAt, status };
        });

        setUsers(mapped);
        setTotalCount(total);
        setTotalPages(Math.max(1, totalPagesFromApi));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Kullanıcılar alınırken hata:", err);
        setError(
          err?.message ||
            "Kullanıcılar alınırken bir hata oluştu. Lütfen tekrar dene."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadUsers();
  }, [page, limit, search, nameFilter, emailFilter, roleFilter, dateFilter]);

  const hasUsers = users.length > 0;

  /* ===== Countdown için now state’ini güncelle ===== */
  useEffect(() => {
    if (!pendingDelete) return;

    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 200);

    return () => clearInterval(intervalId);
  }, [pendingDelete]);

  /* ===== Gerçek silme işlemi: DELETE /mobile/users/:id ===== */
  async function actuallyDelete(user: UserRow) {
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
        setPendingDelete(null);
        return;
      }

      const res = await fetch(`${API_BASE}/mobile/users/${user.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let msg = `Kullanıcı silinemedi (status: ${res.status})`;
        try {
          const data = await res.json();
          if (data?.message) {
            msg =
              Array.isArray(data.message) && data.message.length
                ? data.message.join("\n")
                : String(data.message);
          }
        } catch {
          // parse edemezsek default mesaj
        }
        throw new Error(msg);
      }

      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setPendingDelete(null);

      showToast({
        type: "success",
        title: "Kullanıcı silindi",
        message: `"${user.name}" başarıyla silindi.`,
        autoCloseMs: 3000,
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Kullanıcı silinirken hata:", err);
      setPendingDelete(null);
      showToast({
        type: "error",
        title: "Silme başarısız",
        message:
          err?.message ||
          "Kullanıcı silinirken bir hata oluştu. Lütfen tekrar dene.",
        autoCloseMs: 4000,
      });
    }
  }

  /* ===== Sil butonu tıklanınca: undo’lu toast + timer ===== */
  function handleDeleteClick(user: UserRow) {
    setPendingDelete((current) => {
      if (current) {
        clearTimeout(current.timeoutId);
      }
      return null;
    });

    const timeoutId = setTimeout(() => {
      void actuallyDelete(user);
    }, 4000);

    const expiresAt = Date.now() + 4000;

    setPendingDelete({
      id: user.id,
      timeoutId,
      expiresAt,
    });

    showToast({
      type: "error",
      title: "Silme işlemi hazırlanıyor",
      message: `"${user.name}" 4 saniye içinde silinecek. Geri almak için 'Geri al' butonuna tıkla.`,
      actionLabel: "Geri al",
      onAction: () => {
        setPendingDelete((current) => {
          if (!current || current.id !== user.id) return current;
          clearTimeout(current.timeoutId);
          return null;
        });
      },
      autoCloseMs: 4000,
    });
  }

  // Aktif satır için kalan süre (saniye)
  function getRemainingSeconds(userId: number | string): number | null {
    if (!pendingDelete || pendingDelete.id !== userId) return null;
    const diff = pendingDelete.expiresAt - now;
    if (diff <= 0) return 0;
    return Math.ceil(diff / 1000);
  }

  // Durum filtresini front-end’de uygula
  const filteredUsers = users.filter((u) => {
    if (statusFilter === "ALL") return true;
    return u.status === statusFilter;
  });

  /* ===== Durum toggle handler ===== */
  async function handleToggleStatus(user: UserRow) {
    const prevStatus = user.status as "AKTIF" | "PASIF";
    const nextStatus = prevStatus === "AKTIF" ? "PASIF" : "AKTIF";
    const isActive = nextStatus === "AKTIF";

    const prevUsers = users;
    setTogglingId(user.id);

    // optimistic update
    setUsers((current) =>
      current.map((u) =>
        u.id === user.id ? { ...u, status: nextStatus } : u
      )
    );

    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("dailyspark_admin_token")
          : null;

      if (!token) {
        throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yap.");
      }

      const res = await fetch(
        `${API_BASE}/mobile/users/${user.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isActive }),
        }
      );

      if (!res.ok) {
        let msg = `Durum güncellenemedi (status: ${res.status})`;
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

      showToast({
        type: "success",
        title: "Durum güncellendi",
        message: `"${user.name}" ${
          isActive ? "aktif" : "pasif"
        } olarak işaretlendi.`,
        autoCloseMs: 2500,
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Durum güncellenirken hata:", err);
      // revert
      setUsers(prevUsers);
      showToast({
        type: "error",
        title: "Durum güncellenemedi",
        message:
          err?.message ||
          "Kullanıcının durumu güncellenirken bir hata oluştu.",
        autoCloseMs: 3500,
      });
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <TopBar />

      <main className="pt-24 pl-[262px] px-6 pb-6 space-y-6">
        {/* Üst başlık + aksiyonlar */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
              <UserCog className="h-3.5 w-3.5" />
              User Management
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-slate-50">
              Kullanıcı listesi
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">
              DailySpark’e kayıtlı kullanıcılarını, rollerini ve durumlarını bu
              ekrandan yönetiyorsun. Veriler{" "}
              <span className="text-[#4FFFB0] font-medium">
                /mobile/users
              </span>{" "}
              API&apos;sinden dinamik olarak geliyor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] font-medium text-slate-200 hover:border-slate-600">
              <Upload className="h-3.5 w-3.5" />
              Verileri içe aktar
            </button>
            <AddUserButton />
          </div>
        </header>

        {/* Hata mesajı */}
        {error && (
          <div className="rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-3 text-[12px] text-red-200">
            {error}
          </div>
        )}

        {/* Filtre barı + aksiyonlar + tablo */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
          {/* Top tools row */}
          <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 sm:px-5 sm:py-4 md:flex-row md:items-center md:justify-between">
            {/* Arama (global search) */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-300">
                <Search className="h-3.5 w-3.5 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-slate-500"
                  placeholder="ID, isim, e-posta veya rol ile ara..."
                />
              </div>
            </div>

            {/* Sağ aksiyonlar */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <button className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-slate-300 hover:border-slate-600">
                <Filter className="h-3.5 w-3.5" />
                Filtreler
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-slate-300 hover:border-slate-600"
                onClick={() => {
                  setSearch("");
                  setNameFilter("");
                  setEmailFilter("");
                  setRoleFilter("ALL");
                  setDateFilter("");
                  setStatusFilter("ALL");
                  setPage(1);
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sıfırla
              </button>
            </div>
          </div>

          {/* Filtre satırı (kolon altı inputlar) */}
          <div className="border-b border-slate-800/80 px-4 py-3 sm:px-5">
            <div className="grid gap-2 text-[11px] md:grid-cols-[80px_minmax(0,1.3fr)_minmax(0,1.3fr)_130px_150px_90px]">
              <div className="flex items-center gap-1 text-slate-400">
                <span className="text-[10px] uppercase tracking-[0.16em]">
                  ID
                </span>
              </div>

              {/* Ad Soyad filtresi */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Ad Soyad
                </span>
                <input
                  value={nameFilter}
                  onChange={(e) => {
                    setPage(1);
                    setNameFilter(e.target.value);
                  }}
                  className="h-7 rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200 outline-none placeholder:text-slate-500"
                  placeholder="İsme göre filtrele"
                />
              </div>

              {/* E-posta filtresi */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  E-posta
                </span>
                <input
                  value={emailFilter}
                  onChange={(e) => {
                    setPage(1);
                    setEmailFilter(e.target.value);
                  }}
                  className="h-7 rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200 outline-none placeholder:text-slate-500"
                  placeholder="E-postaya göre filtrele"
                />
              </div>

              {/* Rol filtresi */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Rol
                </span>
                <div className="inline-flex h-7 items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200">
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setPage(1);
                      setRoleFilter(e.target.value as RoleFilter);
                    }}
                    className="w-full bg-transparent text-[11px] outline-none"
                  >
                    <option value="ALL">Tümü</option>
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <ChevronDown className="h-3 w-3 text-slate-500" />
                </div>
              </div>

              {/* Kayıt Tarihi filtresi */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Kayıt Tarihi
                </span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setPage(1);
                    setDateFilter(e.target.value);
                  }}
                  className="h-7 rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200 outline-none placeholder:text-slate-500"
                />
              </div>

              {/* Durum filtresi (sadece front-end) */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Durum
                </span>
                <div className="inline-flex h-7 items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-2 text-[11px] text-slate-200">
                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as StatusFilter)
                    }
                    className="w-full bg-transparent text-[11px] outline-none"
                  >
                    <option value="ALL">Tümü</option>
                    <option value="AKTIF">Aktif</option>
                    <option value="PASIF">Pasif</option>
                  </select>
                  <ChevronDown className="h-3 w-3 text-slate-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Tablo header + satırlar */}
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
                  <th className="px-2 py-2 text-left">Ad Soyad</th>
                  <th className="px-2 py-2 text-left">E-posta</th>
                  <th className="px-2 py-2 text-left">Rol</th>
                  <th className="px-2 py-2 text-left">Kayıt Tarihi</th>
                  <th className="px-2 py-2 text-left">Durum</th>
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
                          <div className="h-4 w-40 rounded bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-4 w-44 rounded bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-4 w-16 rounded bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-4 w-28 rounded bg-slate-800" />
                        </td>
                        <td className="px-2 py-3">
                          <div className="h-5 w-11 rounded-full bg-slate-800" />
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

                {/* Veri yoksa empty state */}
                {!loading && !filteredUsers.length && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-[12px] text-slate-400"
                    >
                      Filtrelere göre görüntülenecek kullanıcı bulunamadı.
                    </td>
                  </tr>
                )}

                {/* Gerçek kullanıcı satırları */}
                {!loading &&
                  filteredUsers.map((user, idx) => {
                    const remainingSeconds = getRemainingSeconds(user.id);

                    return (
                      <tr
                        key={user.id}
                        className={`border-b border-slate-800/60 text-[13px] ${
                          idx % 2 === 1
                            ? "bg-slate-950/40"
                            : "bg-slate-900/50"
                        } hover:bg-slate-900 transition-colors ${
                          pendingDelete?.id === user.id
                            ? "opacity-60"
                            : "opacity-100"
                        }`}
                      >
                        <td className="px-4 py-2 align-middle">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900"
                          />
                        </td>
                        <td className="px-2 py-2 align-middle text-slate-300">
                          {user.id}
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-100">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-slate-100">
                                {user.name}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 align-middle text-slate-300">
                          {user.email}
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-2 py-2 align-middle text-slate-300">
                          {user.createdAt}
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <StatusToggle
                            status={user.status}
                            loading={togglingId === user.id}
                            onToggle={() => handleToggleStatus(user)}
                          />
                        </td>
                        <td className="px-4 py-2 align-middle text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/users/${user.id}/edit`)
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600 hover:text-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(user)}
                              disabled={pendingDelete?.id === user.id}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-900/70 bg-red-950/40 text-red-300 hover:border-red-500 hover:text-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {pendingDelete?.id === user.id ? (
                                <span className="text-[10px]">
                                  {remainingSeconds ?? 4}s
                                </span>
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Alt bar: gerçek pagination */}
          <div className="flex flex-col gap-2 border-t border-slate-800 px-4 py-3 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              Toplam {totalCount} kullanıcı
              {loading && " (yükleniyor...)"}.
            </div>
            <div className="inline-flex items-center gap-2">
              <span>
                Sayfa {page} / {totalPages}
              </span>
              <div className="inline-flex rounded-full border border-slate-800 bg-slate-950/80 text-[10px]">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
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

/* ===== Yardımcı küçük bileşenler ===== */

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role.toUpperCase() === "ADMIN";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${
        isAdmin
          ? "bg-[#2979FF]/20 text-[#4FFFB0] border border-[#4FFFB0]/40"
          : "bg-slate-800/80 text-slate-200 border border-slate-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isAdmin ? "bg-[#4FFFB0]" : "bg-slate-400"
        }`}
      />
      {isAdmin ? "Admin" : "User"}
    </span>
  );
}

function StatusToggle({
  status,
  loading,
  onToggle,
}: {
  status: "AKTIF" | "PASIF" | string;
  loading: boolean;
  onToggle: () => void;
}) {
  const active = status === "AKTIF";

  return (
    <button
      type="button"
      onClick={loading ? undefined : onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
        active
          ? "border-emerald-400 bg-gradient-to-r from-[#2979FF] to-[#4FFFB0]"
          : "border-slate-700 bg-slate-900"
      } ${loading ? "opacity-70 cursor-wait" : "cursor-pointer"}`}
    >
      <span
        className={`absolute h-4 w-4 rounded-full bg-slate-950 shadow-[0_0_12px_rgba(15,23,42,0.9)] transition-transform ${
          active ? "translate-x-5" : "translate-x-1"
        }`}
      />
      <span className="sr-only">Durum değiştir</span>
    </button>
  );
}
