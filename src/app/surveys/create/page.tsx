"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Plus,
  Trash2,
  Save,
  ChevronLeft,
  Users,
  HelpCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

/* ===================== CONFIG ===================== */
const API_BASE = "https://notification-backend-d1ol.onrender.com";

/* ===================== TYPES ===================== */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiAudience = any;

type AudienceRow = {
  id: number;
  name: string;
  description?: string | null;
  userCount?: number | null;
};

type UiOption = { id: string; text: string };
type UiQuestion = { id: string; text: string; options: UiOption[] };

/* ===================== HELPERS ===================== */
function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dailyspark_admin_token");
}

/**
 * ✅ Backend whitelist hatalarını bitiren payload builder
 * - type göndermez
 * - audienceId göndermez -> audienceIds[]
 * - questions[].title göndermez -> questions[].text string
 * - options string[] göndermez -> options: [{text}]
 */
function buildSurveyCreatePayload(input: {
  title: string;
  audienceIds: number[];
  questions: UiQuestion[];
}) {
  const title = String(input?.title || "").trim();

  const audienceIds = Array.from(
    new Set((input?.audienceIds || []).map((x) => Number(x)).filter((n) => Number.isFinite(n)))
  );

  const questions = (input?.questions || [])
    .map((q) => {
      const text = String(q?.text || "").trim();

      const options = (q?.options || [])
        .map((o) => {
          const t = String(o?.text || "").trim();
          return t ? { text: t } : null;
        })
        .filter(Boolean) as { text: string }[];

      if (!text) return null;
      if (!options.length) return null;

      return { text, options };
    })
    .filter(Boolean) as { text: string; options: { text: string }[] }[];

  return { title, audienceIds, questions };
}

function clampLen(s: string, n: number) {
  const t = (s || "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1).trimEnd() + "…";
}

/* ===================== PAGE ===================== */
export default function SurveyCreatePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loadingAudiences, setLoadingAudiences] = useState(true);
  const [audiences, setAudiences] = useState<AudienceRow[]>([]);
  const [selectedAudienceIds, setSelectedAudienceIds] = useState<number[]>([]);

  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<UiQuestion[]>([
    {
      id: uid("q"),
      text: "",
      options: [
        { id: uid("o"), text: "" },
        { id: uid("o"), text: "" },
      ],
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ===== Load audiences ===== */
  const loadAudiences = useCallback(async () => {
    const token = getToken();
    if (!token) {
      const msg = "Oturum bulunamadı. Lütfen tekrar giriş yap.";
      setError(msg);
      showToast({ type: "error", title: "Oturum bulunamadı", message: msg });
      setLoadingAudiences(false);
      return;
    }

    try {
      setLoadingAudiences(true);
      setError(null);

      const res = await fetch(`${API_BASE}/admin/audiences`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Kitleler alınamadı (status: ${res.status}) ${text || ""}`);
      }

      const data = await res.json();

      const raw: ApiAudience[] = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.data)
        ? data.data
        : [];

      const mapped: AudienceRow[] = raw
        .map((a: ApiAudience) => {
          const id = Number(a?.id);
          if (!Number.isFinite(id)) return null;

          return {
            id,
            name: String(a?.name ?? a?.title ?? `Kitle #${id}`),
            description: a?.description ?? null,
            userCount: typeof a?.userCount === "number" ? a.userCount : null,
          };
        })
        .filter(Boolean) as AudienceRow[];

      setAudiences(mapped);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const msg = e?.message || "Kitleler yüklenirken hata oluştu.";
      setError(msg);
      showToast({ type: "error", title: "Kitleler yüklenemedi", message: msg });
    } finally {
      setLoadingAudiences(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadAudiences();
  }, [loadAudiences]);

  /* ===== Derived validations ===== */
  const payloadPreview = useMemo(() => {
    return buildSurveyCreatePayload({
      title,
      audienceIds: selectedAudienceIds,
      questions,
    });
  }, [title, selectedAudienceIds, questions]);

  const canPublish = useMemo(() => {
    if (!payloadPreview.title) return false;
    if (!payloadPreview.audienceIds.length) return false;
    if (!payloadPreview.questions.length) return false;
    return true;
  }, [payloadPreview]);

  /* ===== Actions: audiences ===== */
  function toggleAudience(id: number) {
    setSelectedAudienceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllAudiences() {
    setSelectedAudienceIds(audiences.map((a) => a.id));
  }

  function clearAudiences() {
    setSelectedAudienceIds([]);
  }

  /* ===== Actions: questions/options ===== */
  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        id: uid("q"),
        text: "",
        options: [
          { id: uid("o"), text: "" },
          { id: uid("o"), text: "" },
        ],
      },
    ]);
  }

  function removeQuestion(qid: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== qid));
  }

  function updateQuestionText(qid: string, text: string) {
    setQuestions((prev) => prev.map((q) => (q.id === qid ? { ...q, text } : q)));
  }

  function addOption(qid: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid ? { ...q, options: [...q.options, { id: uid("o"), text: "" }] } : q
      )
    );
  }

  function removeOption(qid: string, oid: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q;
        const next = q.options.filter((o) => o.id !== oid);
        return { ...q, options: next.length ? next : [{ id: uid("o"), text: "" }] };
      })
    );
  }

  function updateOptionText(qid: string, oid: string, text: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q;
        return { ...q, options: q.options.map((o) => (o.id === oid ? { ...o, text } : o)) };
      })
    );
  }

  /* ===== Submit ===== */
  async function handlePublish() {
    const token = getToken();
    if (!token) {
      showToast({
        type: "error",
        title: "Oturum bulunamadı",
        message: "Devam etmek için lütfen tekrar giriş yap.",
      });
      return;
    }

    const payload = buildSurveyCreatePayload({
      title,
      audienceIds: selectedAudienceIds,
      questions,
    });

    // Son bir UI validasyonu (backend’e gitmeden)
    if (!payload.title) {
      showToast({ type: "error", title: "Eksik alan", message: "Anket başlığı boş olamaz." });
      return;
    }
    if (!payload.audienceIds.length) {
      showToast({ type: "error", title: "Eksik alan", message: "En az 1 kitle seçmelisin." });
      return;
    }
    if (!payload.questions.length) {
      showToast({
        type: "error",
        title: "Eksik alan",
        message: "En az 1 soru ve her soruda en az 1 seçenek olmalı.",
      });
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`${API_BASE}/admin/surveys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text || null;
      }

      if (!res.ok) {
        const msg = data?.message || data?.error || `Yayınlanamadı (status: ${res.status})`;
        throw new Error(Array.isArray(msg) ? msg.join("\n") : String(msg));
      }

      showToast({
        type: "success",
        title: "Yayınlandı ✅",
        message: "Anket başarıyla oluşturuldu ve hedef kitlelere gönderim için hazır.",
      });

      router.push("/surveys");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const msg = e?.message || "Yayınlanamadı. Lütfen tekrar dene.";
      setError(msg);
      showToast({ type: "error", title: "Yayınlanamadı", message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <TopBar />

      <main className="pt-24 pl-[262px] px-6 pb-10 space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
              <ClipboardList className="h-3.5 w-3.5" />
              Surveys / Anketler
            </div>

            <h1 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight text-slate-50">
              Yeni anket oluştur
            </h1>

            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">
              Bu ekrandan <span className="text-[#4FFFB0] font-medium">çoktan seçmeli</span>{" "}
              anket hazırlayıp seçtiğin kitlelere gönderebilirsin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] font-medium text-slate-200 hover:border-slate-600"
              onClick={() => router.push("/surveys")}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Geri
            </button>

            <button
              type="button"
              disabled={!canPublish || submitting}
              onClick={handlePublish}
              className={[
                "inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#2979FF] to-[#4FFFB0] px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-[0_12px_35px_rgba(41,121,255,0.6)]",
                (!canPublish || submitting) && "opacity-60 cursor-not-allowed",
              ].join(" ")}
            >
              <Save className="h-3.5 w-3.5" />
              {submitting ? "Yayınlanıyor..." : "Yayınla"}
            </button>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-3 text-[12px] text-red-200 whitespace-pre-line">
            {error}
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          {/* LEFT: FORM */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-[0_18px_45px_rgba(15,23,42,0.9)] overflow-hidden">
            <div className="border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950/70 border border-slate-800">
                  <HelpCircle className="h-4 w-4 text-slate-200" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-50">Anket içeriği</div>
                  <div className="text-[11px] text-slate-400">
                    Başlık + sorular + seçenekler
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Anket başlığı
                </div>
                <input
                  className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 text-[13px] text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-600"
                  placeholder="Örn: Günlük check-in anketi"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <div className="text-[11px] text-slate-500">
                  Kısa, net bir başlık yaz: {title.trim() ? clampLen(title, 70) : "—"}
                </div>
              </div>

              {/* Questions */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                    Sorular
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Her soru çoktan seçmeli olmalı.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addQuestion}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-200 hover:border-slate-600"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Soru ekle
                </button>
              </div>

              <div className="space-y-4">
                {questions.map((q, qIndex) => (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                          Soru {qIndex + 1}
                        </div>
                        <input
                          className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 text-[13px] text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-600"
                          placeholder="Örn: Bugün en çok hangisi zorladı?"
                          value={q.text}
                          onChange={(e) => updateQuestionText(q.id, e.target.value)}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-900/70 bg-red-950/30 text-red-200 hover:border-red-500"
                        title="Soruyu sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Options */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                          Seçenekler
                        </div>

                        <button
                          type="button"
                          onClick={() => addOption(q.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-200 hover:border-slate-600"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Seçenek ekle
                        </button>
                      </div>

                      <div className="space-y-2">
                        {q.options.map((o, oIndex) => (
                          <div key={o.id} className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/60 text-[11px] text-slate-300">
                              {oIndex + 1}
                            </div>

                            <input
                              className="h-10 flex-1 rounded-xl border border-slate-800 bg-slate-950/70 px-3 text-[13px] text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-600"
                              placeholder="Örn: Odaklanma"
                              value={o.text}
                              onChange={(e) => updateOptionText(q.id, o.id, e.target.value)}
                            />

                            <button
                              type="button"
                              onClick={() => removeOption(q.id, o.id)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/70 text-slate-300 hover:border-red-500 hover:text-red-200"
                              title="Seçeneği sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="text-[11px] text-slate-500">
                        İpucu: Boş seçenekler otomatik gönderilmez (payload normalize eder).
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer hint */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-[11px] text-slate-300">
                <div className="font-semibold text-slate-100">Not</div>
                <div className="mt-1 text-slate-400">
                  Backend sadece şu formatı kabul eder:{" "}
                  <span className="text-slate-200">
                    questions: {"[{ text, options: [{ text }] }]"}
                  </span>
                  . Bu sayfa zaten otomatik dönüştürüyor.
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: AUDIENCE + PREVIEW */}
          <div className="space-y-4">
            {/* Audience picker */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-[0_18px_45px_rgba(15,23,42,0.9)] overflow-hidden">
              <div className="border-b border-slate-800 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950/70 border border-slate-800">
                    <Users className="h-4 w-4 text-slate-200" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-50">Kitle seçimi</div>
                    <div className="text-[11px] text-slate-400">
                      Anketi hangi kullanıcı grupları alacak?
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllAudiences}
                    disabled={loadingAudiences || !audiences.length}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-200 hover:border-slate-600 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Tümünü seç
                  </button>

                  <button
                    type="button"
                    onClick={clearAudiences}
                    disabled={loadingAudiences || !selectedAudienceIds.length}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-200 hover:border-slate-600 disabled:opacity-60"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Temizle
                  </button>
                </div>

                <div className="mt-3 text-[11px] text-slate-400">
                  Seçili:{" "}
                  <span className="text-slate-100 font-semibold">
                    {selectedAudienceIds.length}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {loadingAudiences ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={`aud-skel-${i}`}
                          className="h-12 rounded-xl border border-slate-800 bg-slate-950/40"
                        />
                      ))}
                    </div>
                  ) : audiences.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-[12px] text-slate-400">
                      Henüz kitle bulunamadı. Önce “Kitleler” bölümünden bir kitle oluştur.
                    </div>
                  ) : (
                    <div className="max-h-[420px] overflow-auto pr-1 space-y-2">
                      {audiences.map((a) => {
                        const active = selectedAudienceIds.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => toggleAudience(a.id)}
                            className={[
                              "w-full text-left rounded-xl border px-3 py-2 transition",
                              active
                                ? "border-[#4FFFB0]/60 bg-slate-950/60 shadow-[0_0_0_1px_rgba(79,255,176,0.25)]"
                                : "border-slate-800 bg-slate-950/40 hover:border-slate-600",
                            ].join(" ")}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={[
                                      "inline-flex h-5 w-5 items-center justify-center rounded-md border text-[11px]",
                                      active
                                        ? "border-[#4FFFB0]/60 text-[#4FFFB0] bg-slate-950/60"
                                        : "border-slate-700 text-slate-400 bg-slate-950/60",
                                    ].join(" ")}
                                  >
                                    {active ? "✓" : ""}
                                  </span>

                                  <div className="truncate text-[12px] font-semibold text-slate-100">
                                    {a.name}
                                  </div>
                                </div>

                                {a.description ? (
                                  <div className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                                    {a.description}
                                  </div>
                                ) : null}
                              </div>

                              <div className="shrink-0 text-[11px] text-slate-400">
                                {typeof a.userCount === "number" ? `${a.userCount} kişi` : ""}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Preview / Validation */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-[0_18px_45px_rgba(15,23,42,0.9)] overflow-hidden">
              <div className="border-b border-slate-800 px-5 py-4">
                <div className="text-sm font-semibold text-slate-50">Yayın kontrolü</div>
                <div className="text-[11px] text-slate-400">
                  Gönderimden önce minimum gereksinimler
                </div>
              </div>

              <div className="px-5 py-4 space-y-2 text-[12px]">
                <CheckRow ok={!!payloadPreview.title} text="Başlık dolu" />
                <CheckRow ok={payloadPreview.audienceIds.length > 0} text="En az 1 kitle seçildi" />
                <CheckRow ok={payloadPreview.questions.length > 0} text="En az 1 geçerli soru var" />

                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    Payload preview (backend’e giden)
                  </div>
                  <pre className="mt-2 text-[11px] text-slate-200 overflow-auto max-h-64">
{JSON.stringify(payloadPreview, null, 2)}
                  </pre>
                </div>

                <button
                  type="button"
                  disabled={!canPublish || submitting}
                  onClick={handlePublish}
                  className={[
                    "mt-1 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#2979FF] to-[#4FFFB0] px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-[0_12px_35px_rgba(41,121,255,0.6)]",
                    (!canPublish || submitting) && "opacity-60 cursor-not-allowed",
                  ].join(" ")}
                >
                  <Save className="h-3.5 w-3.5" />
                  {submitting ? "Yayınlanıyor..." : "Yayınla"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom spacing */}
        <div className="h-6" />
      </main>
    </div>
  );
}

function CheckRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
      <div className="text-slate-200">{text}</div>
      <div
        className={[
          "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]",
          ok
            ? "border-emerald-400/60 bg-emerald-900/20 text-emerald-200"
            : "border-amber-400/60 bg-amber-900/20 text-amber-200",
        ].join(" ")}
      >
        {ok ? "OK" : "Eksik"}
      </div>
    </div>
  );
}
