// src/app/notifications/create/page.tsx
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useToast } from "@/components/Toast";
import {
  ArrowLeft,
  Bell,
  Save,
  Rocket,
  Clock,
  Loader2,
  AlertTriangle,
  Users2,
  Target,
  Search,
} from "lucide-react";

const API_BASE = "https://notification-backend-d1ol.onrender.com";

type ScheduleMode = "NOW" | "LATER";
type SendTarget = "AUDIENCE" | "USER";

type AudienceOption = {
  id: number | string;
  name: string;
};

type UserOption = {
  id: number | string;
  fullName?: string | null;
  email?: string | null;
};

export default function CreateNotificationPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [sendTarget, setSendTarget] = useState<SendTarget>("AUDIENCE");

  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("NOW");
  const [scheduledAt, setScheduledAt] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AUDIENCE STATE
  const [audiences, setAudiences] = useState<AudienceOption[]>([]);
  const [audiencesLoading, setAudiencesLoading] = useState(false);
  const [audiencesError, setAudiencesError] = useState<string | null>(null);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string>("");

  // USER STATE (kişiye özel)
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // User search (dropdown içinde arama)
  const [userQuery, setUserQuery] = useState("");

  // Timezone / server time info
  const [timezoneLabel, setTimezoneLabel] = useState<string>("yerel saat dilimin");
  const [serverTimezone, setServerTimezone] = useState<string | null>(null);
  const [serverDiffMinutes, setServerDiffMinutes] = useState<number | null>(null);
  const [serverTimeError, setServerTimeError] = useState<string | null>(null);

  const bodyMaxLen = 240;

  /* ========== Token ========== */
  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("dailyspark_admin_token");
  }, []);

  /* ========== Timezone bilgisini al ========== */
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

  /* ========== Sunucu saatini al (drift kontrolü) ========== */
  useEffect(() => {
    async function loadServerTime() {
      try {
        const clientNow = new Date();
        const res = await fetch(`${API_BASE}/time`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        const serverNow = new Date(data.now ?? data.serverNow ?? data.date);
        if (Number.isNaN(serverNow.getTime())) throw new Error("Geçersiz server time");

        if (typeof data.tz === "string" && data.tz.trim()) setServerTimezone(data.tz);

        const diffMs = Math.abs(serverNow.getTime() - clientNow.getTime());
        setServerDiffMinutes(Math.round(diffMs / 60000));
      } catch (err) {
        console.error("Server time fetch error:", err);
        setServerTimeError(
          "Sunucu saati alınamadı, planlı gönderimlerde ufak sapmalar olabilir."
        );
      }
    }

    void loadServerTime();
  }, []);

  /* ========== Kitleleri Yükle: GET /admin/audiences ========== */
  useEffect(() => {
    async function loadAudiences() {
      try {
        setAudiencesLoading(true);
        setAudiencesError(null);

        if (!token) {
          setAudiencesError("Kitle listesi için oturum bulunamadı.");
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
          console.error("Audiences fetch error:", res.status, text);
          throw new Error("Kitle listesi alınamadı.");
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

        const mapped: AudienceOption[] = rawList.map((a) => ({
          id: a.id ?? a.audienceId ?? "?",
          name: a.name ?? "İsimsiz kitle",
        }));

        setAudiences(mapped);
        if (mapped.length > 0) setSelectedAudienceId(String(mapped[0].id));
      } catch (err: any) {
        console.error("Audiences fetch error:", err);
        setAudiencesError(
          err?.message || "Kitleler alınırken bir hata oluştu. Lütfen sayfayı yenile."
        );
      } finally {
        setAudiencesLoading(false);
      }
    }

    void loadAudiences();
  }, [token]);

  /* ========== Kullanıcıları Yükle (kişiye özel) ========== */
  useEffect(() => {
    async function loadUsers() {
      // sadece USER modunda lazım
      if (sendTarget !== "USER") return;

      try {
        setUsersLoading(true);
        setUsersError(null);

        if (!token) {
          setUsersError("Kullanıcı listesi için oturum bulunamadı.");
          return;
        }

        // ✅ Beklenen endpoint: GET /admin/users?q=...&take=50
        // Eğer sende yoksa, aşağıdaki bölümde ben backend endpointini de veriyorum.
        const qs = new URLSearchParams();
        if (userQuery.trim()) qs.set("q", userQuery.trim());
        qs.set("take", "50");

        const res = await fetch(`${API_BASE}/mobile/users?${qs.toString()}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Users fetch error:", res.status, text);
          throw new Error(
            "Kullanıcı listesi alınamadı. (Backend'de GET /admin/users endpoint'i yok olabilir)"
          );
        }

        const data = await res.json();

        // destek: {items:[]} / [] / {data:[]}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawList: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.data)
          ? data.data
          : [];

        const mapped: UserOption[] = rawList.map((u) => ({
          id: u.id ?? u.userId ?? "?",
          fullName: u.fullName ?? u.name ?? null,
          email: u.email ?? null,
        }));

        setUsers(mapped);
        if (!selectedUserId && mapped.length > 0) setSelectedUserId(String(mapped[0].id));
      } catch (err: any) {
        setUsersError(err?.message || "Kullanıcılar alınırken bir hata oluştu.");
      } finally {
        setUsersLoading(false);
      }
    }

    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendTarget, token, userQuery]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("Başlık alanı boş bırakılamaz.");
    if (!body.trim()) return setError("İçerik alanı boş bırakılamaz.");

    // hedef validasyonu
    if (sendTarget === "AUDIENCE" && !selectedAudienceId) {
      return setError("Lütfen bir kitle seç.");
    }
    if (sendTarget === "USER" && !selectedUserId) {
      return setError("Lütfen bir kullanıcı seç.");
    }

    // Planlı gönderim validasyonu (iki modda da geçerli)
    if (scheduleMode === "LATER") {
      if (!scheduledAt) return setError("Planlanmış gönderim için tarih/saat seçmelisin.");
      const dt = new Date(scheduledAt);
      if (Number.isNaN(dt.getTime())) return setError("Geçerli bir tarih/saat seçmelisin.");
      const now = new Date();
      if (dt.getTime() <= now.getTime())
        return setError("Planladığın tarih geçmişte olamaz. Gelecekte bir zaman seç.");
    }

    if (!token) {
      const msg = "Oturum bulunamadı. Lütfen tekrar giriş yap.";
      setError(msg);
      showToast({ type: "error", title: "Oturum hatası", message: msg });
      return;
    }

    try {
      setSaving(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        title: title.trim(),
        body: body.trim(),
      };

      // schedule
      if (scheduleMode === "LATER" && scheduledAt) {
        const dt = new Date(scheduledAt);
        if (!Number.isNaN(dt.getTime())) payload.sendAt = dt.toISOString();
      }

      let url = `${API_BASE}/admin/notifications`;

      // hedefe göre endpoint + payload
      if (sendTarget === "AUDIENCE") {
        payload.audienceId = Number(selectedAudienceId);
        url = `${API_BASE}/admin/notifications`;
      } else {
        payload.userIds = [Number(selectedUserId)];
        url = `${API_BASE}/admin/notifications/send-to-users`;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Bildirim gönderilemedi:", res.status, text);

        let msg = `Bildirim gönderilemedi (status: ${res.status}).`;
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
        showToast({ type: "error", title: "İşlem başarısız", message: msg, autoCloseMs: 5000 });
        return;
      }

      showToast({
        type: "success",
        title: "Başarılı",
        message:
          scheduleMode === "NOW"
            ? sendTarget === "AUDIENCE"
              ? "Bildirim oluşturuldu ve seçilen kitleye gönderim için işleme alındı."
              : "Bildirim oluşturuldu ve seçilen kullanıcıya gönderim için işleme alındı."
            : "Bildirim oluşturuldu ve seçtiğin tarih için planlandı.",
        autoCloseMs: 3500,
      });

      setTimeout(() => router.push("/notifications"), 400);
    } catch (err: any) {
      console.error("Bildirim oluşturma hatası:", err);
      const msg = err?.message || "Bildirim oluşturulurken bir hata oluştu.";
      setError(msg);
      showToast({ type: "error", title: "Bir şeyler ters gitti", message: msg, autoCloseMs: 5000 });
    } finally {
      setSaving(false);
    }
  }

  const bodyLength = body.length;
  const bodyOverLimit = bodyLength > bodyMaxLen;

  const selectedAudienceName =
    audiences.find((a) => String(a.id) === String(selectedAudienceId))?.name || "Seçilmedi";

  const selectedUserLabel =
    users.find((u) => String(u.id) === String(selectedUserId))
      ? `${users.find((u) => String(u.id) === String(selectedUserId))?.fullName ?? "Kullanıcı"}${
          users.find((u) => String(u.id) === String(selectedUserId))?.email
            ? ` • ${users.find((u) => String(u.id) === String(selectedUserId))?.email}`
            : ""
        }`
      : "Seçilmedi";

  const scheduledPreview =
    scheduleMode === "LATER" && scheduledAt
      ? (() => {
          const dt = new Date(scheduledAt);
          if (Number.isNaN(dt.getTime())) return "";
          return dt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
        })()
      : "";

  const significantDrift = serverDiffMinutes !== null && serverDiffMinutes > 3;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <TopBar />

      <main className="pt-24 pl-[262px] px-6 pb-10">
        {/* Üst başlık */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push("/notifications")}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300 hover:border-slate-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Bildirim listesine dön
            </button>
            <h1 className="mt-3 text-xl sm:text-2xl font-semibold tracking-tight text-slate-50">
              Yeni bildirim oluştur
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">
              Başlık, içerik, hedef (kitle / kişi) ve gönderim zamanını ayarlayarak push bildirimi
              oluştur.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              DAILYSPARK • PUSH NOTIFICATION
            </span>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-200">
              <Bell className="h-3.5 w-3.5 text-[#4FFFB0]" />
              Canlı OneSignal entegrasyonu
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.1fr)]">
          {/* Sol taraf: Form */}
          <div className="rounded-2xl border border-slate-900 bg-slate-950/80 shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-900 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">Bildirim detayları</h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Zorunlu alanlar <span className="text-red-400">*</span> ile işaretlenmiştir.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
                <span className="inline-flex h-7 items-center rounded-full border border-slate-800 bg-slate-900/70 px-3">
                  Kanal: <span className="ml-1 text-[#4FFFB0]">Push</span>
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
              {/* Gönderim hedefi */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-200">
                  Gönderim hedefi <span className="text-red-400">*</span>
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSendTarget("AUDIENCE");
                      setError(null);
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                      sendTarget === "AUDIENCE"
                        ? "border-[#4FFFB0] bg-[#1d293b] text-slate-50"
                        : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <Target className="h-3.5 w-3.5" />
                    Kitleye gönder
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSendTarget("USER");
                      setError(null);
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                      sendTarget === "USER"
                        ? "border-[#4FFFB0] bg-[#1d293b] text-slate-50"
                        : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <Users2 className="h-3.5 w-3.5" />
                    Kişiye özel
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Kitle seçersen <span className="text-slate-200 font-medium">segment kurallarına</span> göre,
                  kişi seçersen <span className="text-slate-200 font-medium">tek kullanıcıya</span> gönderilir.
                </p>
              </div>

              {/* Başlık */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-200">
                  Başlık <span className="text-red-400">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Günaydın! Bugün hedeflerin için bir adım at"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-slate-600"
                />
                <p className="text-[11px] text-slate-500">
                  Kullanıcının bildirim ekranında en üstte görünen satır.
                </p>
              </div>

              {/* İçerik */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-200">
                  İçerik <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Örn: Bugün kendine ayıracağın 10 dakika, 1 yıl sonraki seni değiştirebilir..."
                    className="min-h-[120px] w-full resize-none rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-slate-600"
                    maxLength={bodyMaxLen + 40}
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
                <p className="text-[11px] text-slate-500">
                  Tek satır push bildirimler için{" "}
                  <span className="font-medium text-slate-300">{bodyMaxLen} karakter</span> civarı idealdir.
                </p>
              </div>

              {/* Kitle seçimi / Kullanıcı seçimi */}
              {sendTarget === "AUDIENCE" ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200">
                    Kitle <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedAudienceId}
                      onChange={(e) => setSelectedAudienceId(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 outline-none focus:border-slate-600"
                    >
                      {audiencesLoading && <option value="">Kitleler yükleniyor...</option>}
                      {!audiencesLoading && audiences.length === 0 && (
                        <option value="">Kitle bulunamadı — önce kitle oluştur.</option>
                      )}
                      {!audiencesLoading &&
                        audiences.map((a) => (
                          <option key={a.id} value={String(a.id)}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 text-xs">
                      ▼
                    </div>
                  </div>
                  {audiencesError && <p className="text-[11px] text-red-300">{audiencesError}</p>}
                  {!audiencesError && (
                    <p className="text-[11px] text-slate-500">
                      Bu bildirim yalnızca seçtiğin kitledeki kullanıcılara gönderilir.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200">
                    Kullanıcı <span className="text-red-400">*</span>
                  </label>

                  {/* Search input */}
                  <div className="relative">
                    <input
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="Kullanıcı ara (isim/email)..."
                      className="w-full rounded-lg border border-slate-800 bg-slate-900/70 pl-9 pr-3 py-2.5 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-slate-600"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  </div>

                  <div className="relative">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 outline-none focus:border-slate-600"
                    >
                      {usersLoading && <option value="">Kullanıcılar yükleniyor...</option>}
                      {!usersLoading && users.length === 0 && (
                        <option value="">
                          Kullanıcı bulunamadı — backend'de /admin/users endpoint'i yok olabilir.
                        </option>
                      )}
                      {!usersLoading &&
                        users.map((u) => (
                          <option key={u.id} value={String(u.id)}>
                            {u.fullName ? `${u.fullName}` : `Kullanıcı #${u.id}`}
                            {u.email ? ` • ${u.email}` : ""}
                          </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 text-xs">
                      ▼
                    </div>
                  </div>

                  {usersError && <p className="text-[11px] text-red-300">{usersError}</p>}
                  {!usersError && (
                    <p className="text-[11px] text-slate-500">
                      Bu bildirim yalnızca seçtiğin kullanıcıya gönderilir.
                    </p>
                  )}
                </div>
              )}

              {/* Zamanlama */}
              <div className="space-y-3">
                <span className="block text-xs font-medium text-slate-200">Gönderim zamanı</span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleMode("NOW");
                      setError(null);
                    }}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                      scheduleMode === "NOW"
                        ? "border-[#4FFFB0] bg-[#1d293b] text-slate-50"
                        : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    Hemen gönder
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleMode("LATER");
                      setError(null);
                    }}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                      scheduleMode === "LATER"
                        ? "border-[#4FFFB0] bg-[#1d293b] text-slate-50"
                        : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Planlı gönder
                  </button>
                </div>

                <div className="rounded-lg border border-slate-900 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-400 space-y-1.5">
                  <div>
                    Cihaz saat dilimin:{" "}
                    <span className="font-medium text-slate-200">{timezoneLabel}</span>
                  </div>
                  {serverTimezone && (
                    <div>
                      Sunucu saat dilimi:{" "}
                      <span className="font-medium text-slate-200">{serverTimezone}</span>
                    </div>
                  )}
                  {serverTimeError && (
                    <div className="text-amber-300 flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 mt-[2px]" />
                      <span>{serverTimeError}</span>
                    </div>
                  )}
                  {!serverTimeError && serverDiffMinutes !== null && (
                    <div className={serverDiffMinutes > 3 ? "text-amber-300 flex items-start gap-1.5" : "text-slate-500"}>
                      {significantDrift ? (
                        <>
                          <AlertTriangle className="h-3 w-3 mt-[2px]" />
                          <span>
                            Sunucu saati ile cihaz saatin arasında yaklaşık{" "}
                            <span className="font-semibold">{serverDiffMinutes} dakika</span> fark var.
                          </span>
                        </>
                      ) : (
                        <span>Sunucu saati ile cihaz saatin arasında anlamlı bir fark görünmüyor.</span>
                      )}
                    </div>
                  )}
                </div>

                {scheduleMode === "LATER" && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-200">Planlanan tarih / saat</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-50 outline-none focus:border-slate-600"
                    />
                    {scheduledPreview && (
                      <p className="text-[11px] text-slate-300">
                        Yaklaşık:{" "}
                        <span className="font-semibold">{scheduledPreview} ({timezoneLabel})</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Hata bandı */}
              {error && (
                <div className="rounded-md border border-red-900/70 bg-red-950/40 px-3 py-2 text-[12px] text-red-100">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => router.push("/notifications")}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-medium text-slate-200 hover:border-slate-700"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#2979FF] to-[#4FFFB0] px-4 py-2 text-xs font-semibold text-slate-950 shadow-[0_10px_30px_rgba(41,121,255,0.5)] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      {sendTarget === "AUDIENCE" ? "Bildirimi oluştur" : "Kişiye gönder"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Sağ taraf: Canlı önizleme & özet */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-900 bg-slate-950/80 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-50">Canlı önizleme</h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Bildirim tipik iOS/Android push bildirimi gibi simüle edilir.
              </p>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>DailySpark</span>
                  <span>Şu an</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#2979FF] to-[#4FFFB0] text-xs font-semibold text-slate-950">
                    DS
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-semibold text-slate-50">
                      {title.trim() || "Günaydın! Bugün hedeflerin için bir adım at"}
                    </div>
                    <div className="text-[12px] leading-snug text-slate-200">
                      {body.trim() ||
                        "Bugün kendine ayıracağın 10 dakika, 1 yıl sonraki seni değiştirebilir."}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-900 bg-slate-950/80 px-5 py-4 text-[11px] text-slate-400">
              <h3 className="text-xs font-semibold text-slate-200">Gönderim özeti</h3>
              <ul className="mt-2 space-y-1.5">
                <li>
                  • Hedef:{" "}
                  <span className="text-slate-100 font-medium">
                    {sendTarget === "AUDIENCE" ? "Kitle" : "Kişiye özel"}
                  </span>
                </li>
                <li>
                  • Zamanlama:{" "}
                  {scheduleMode === "NOW" ? (
                    <span className="text-slate-100 font-medium">Hemen gönder</span>
                  ) : scheduledPreview ? (
                    <span className="text-slate-100 font-medium">
                      {scheduledPreview} ({timezoneLabel})
                    </span>
                  ) : (
                    <span className="text-slate-400">Tarih seçilmedi</span>
                  )}
                </li>
                <li>
                  • Segment/Kişi:{" "}
                  <span className="text-slate-100 font-medium">
                    {sendTarget === "AUDIENCE" ? selectedAudienceName : selectedUserLabel}
                  </span>
                </li>
              </ul>
              {sendTarget === "USER" && usersError && (
                <div className="mt-3 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-[2px]" />
                    <div>
                      <div className="font-semibold text-[12px]">Kullanıcı listesi alınamadı</div>
                      <div className="text-[11px] text-amber-200/90">
                        Backend’de <span className="font-semibold">GET /admin/users</span> yoksa
                        dropdown dolmaz. İstersen sana endpoint kodunu da hemen veririm.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
