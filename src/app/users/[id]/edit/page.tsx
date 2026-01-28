// src/app/users/[id]/edit/page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useToast } from "@/components/Toast";
import {
  ArrowLeft,
  Loader2,
  Mail,
  User2,
  Shield,
  Calendar,
} from "lucide-react";

const API_BASE = "https://notification-backend-d1ol.onrender.com";

type EditUserDto = {
  fullName: string;
  email: string;
  role: "ADMIN" | "USER";
  birthYear?: number | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY" | "";
};

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const { showToast } = useToast();

  const [form, setForm] = useState<EditUserDto>({
    fullName: "",
    email: "",
    role: "USER",
    birthYear: undefined,
    gender: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  /* ================= Kullanıcıyı çek ================= */
  useEffect(() => {
    async function loadUser() {
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

        const res = await fetch(`${API_BASE}/mobile/users/${userId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Kullanıcı yüklenemedi:", res.status, text);
          const msg = `Kullanıcı bilgileri alınamadı (status: ${res.status}). Backend /mobile/users/:id endpointini kontrol etmeliyiz.`;
          setError(msg);
          showToast({
            type: "error",
            title: "Kullanıcı yüklenemedi",
            message:
              "Kullanıcı bilgileri alınamadı. Lütfen sayfayı yenilemeyi dene.",
          });
          setLoading(false);
          return;
        }

        const data = await res.json();

        setForm({
          fullName: data.fullName ?? "",
          email: data.email ?? "",
          role: (data.role ?? "USER") === "ADMIN" ? "ADMIN" : "USER",
          birthYear: data.birthYear ?? undefined,
          gender: data.gender ?? "",
        });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Kullanıcı yüklenirken hata:", err);
        const msg =
          err?.message ||
          "Kullanıcı bilgileri alınırken bir hata oluştu. Lütfen tekrar dene.";
        setError(msg);
        showToast({
          type: "error",
          title: "Bir şeyler ters gitti",
          message: msg,
        });
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      loadUser();
    }
  }, [userId, showToast]);

  function handleChange(
    field: keyof EditUserDto,
    value: string | number | null
  ) {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === "birthYear" && value !== null && value !== ""
          ? Number(value)
          : value === ""
          ? undefined
          : value,
    }));
  }

  /* ================= Submit ================= */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

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
      return;
    }

    try {
      setSaving(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        fullName: form.fullName || null,
        email: form.email || null,
        role: form.role,
        birthYear: form.birthYear ?? null,
        gender: form.gender || null,
      };

      const res = await fetch(`${API_BASE}/mobile/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Kullanıcı güncellenemedi:", res.status, text);
        const msg = `Kullanıcı güncellenemedi (status: ${res.status}).`;
        setError(msg);
        showToast({
          type: "error",
          title: "Güncelleme başarısız",
          message:
            "Kullanıcı bilgileri güncellenemedi. Lütfen biraz sonra tekrar dene.",
        });
        return;
      }

      setInfo("Kullanıcı bilgileri başarıyla güncellendi.");
      showToast({
        type: "success",
        title: "Kullanıcı güncellendi",
        message:
          "Değişiklikler kaydedildi. Birkaç saniye içinde listeye yönlendirileceksin.",
        autoCloseMs: 3500,
        onAutoClose: () => {
          router.push("/users");
        },
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Güncelleme hatası:", err);
      const msg =
        err?.message ||
        "Kullanıcı güncellenirken bir hata oluştu. Lütfen tekrar dene.";
      setError(msg);
      showToast({
        type: "error",
        title: "Bir şeyler ters gitti",
        message: msg,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <TopBar />

      {/* 256px sidebar + topbar yüksekliği */}
      <main className="pl-[262px] pt-20 px-6 pb-10">
        {/* Breadcrumb + başlık satırı */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              DAILYSPARK • ADMIN
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-50">
              Kullanıcıyı düzenle
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              DailySpark kullanıcısının temel bilgilerini ve rolünü buradan
              güncelliyorsun.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/users")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] font-medium text-slate-200 hover:border-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kullanıcı listesine dön
          </button>
        </div>

        <div className="rounded-2xl border border-slate-900 bg-slate-950/80 shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
          {/* Üst şerit */}
          <div className="border-b border-slate-900 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-50">
                Kullanıcı bilgileri
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Zorunlu alanlar <span className="text-red-400">*</span> ile
                işaretlenmiştir.
              </p>
            </div>
            <div className="hidden sm:flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs text-slate-500">
                <User2 className="h-6 w-6" />
              </div>
              <span className="text-[10px] text-slate-500">
                Avatar (ileride eklenecek)
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-8">
            {/* Temel bilgiler */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-[0.18em]">
                Temel Bilgiler
              </h3>

              {loading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kullanıcı bilgileri yükleniyor...
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Ad Soyad */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-200">
                      Ad Soyad <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                      <User2 className="h-4 w-4 text-slate-500" />
                      <input
                        required
                        value={form.fullName}
                        onChange={(e) =>
                          handleChange("fullName", e.target.value)
                        }
                        placeholder="Örn: Seyhmus Tintebilisim"
                        className="flex-1 bg-transparent text-sm text-slate-50 outline-none placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {/* E-posta */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-200">
                      E-posta <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                      <Mail className="h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) =>
                          handleChange("email", e.target.value)
                        }
                        placeholder="kullanici@dailyspark.app"
                        className="flex-1 bg-transparent text-sm text-slate-50 outline-none placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {/* Doğum yılı */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-200">
                      Doğum yılı
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <input
                        type="number"
                        min={1900}
                        max={2100}
                        value={form.birthYear ?? ""}
                        onChange={(e) =>
                          handleChange("birthYear", e.target.value || "")
                        }
                        placeholder="Örn: 1997"
                        className="flex-1 bg-transparent text-sm text-slate-50 outline-none placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {/* Cinsiyet */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-200">
                      Cinsiyet
                    </label>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                      <select
                        value={form.gender ?? ""}
                        onChange={(e) =>
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          handleChange("gender", e.target.value as any)
                        }
                        className="w-full bg-transparent text-sm text-slate-50 outline-none"
                      >
                        <option value="">Seçiniz</option>
                        <option value="MALE">Erkek</option>
                        <option value="FEMALE">Kadın</option>
                        <option value="OTHER">Diğer</option>
                        <option value="PREFER_NOT_TO_SAY">
                          Belirtmek istemiyorum
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Rol */}
            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-200">
                  Rol
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                  <Shield className="h-4 w-4 text-slate-500" />
                  <select
                    value={form.role}
                    onChange={(e) =>
                      handleChange("role", e.target.value as "ADMIN" | "USER")
                    }
                    className="flex-1 bg-transparent text-sm text-slate-50 outline-none"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <p className="text-[10px] text-slate-500">
                  Admin rolü, DailySpark yönetim paneline giriş yapabilir.
                </p>
              </div>

              <div className="hidden md:block" />
            </section>

            {/* Inline hata / info küçük bantlar */}
            <div className="space-y-2">
              {error && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/60 rounded-md px-3 py-2 whitespace-pre-line">
                  {error}
                </p>
              )}
              {info && !error && (
                <p className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-900/60 rounded-md px-3 py-2">
                  {info}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-900 mt-2">
              <button
                type="button"
                onClick={() => router.push("/users")}
                className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-medium text-slate-200 hover:border-slate-700"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#2979FF] to-[#4FFFB0] px-4 py-2 text-xs font-semibold text-slate-950 shadow-[0_10px_30px_rgba(41,121,255,0.5)] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  "Kullanıcıyı kaydet"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
