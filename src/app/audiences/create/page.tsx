// src/app/audiences/create/page.tsx
"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import {
  Users,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

/* ================================
   FIELD KAYNAKLARI
================================ */
const FIELD_OPTIONS = [
  {
    value: "gender",
    label: "Cinsiyet",
    type: "enum",
    values: ["MALE", "FEMALE", "OTHER"],
  },
  { value: "city", label: "Şehir", type: "text" },
  {
    value: "interests",
    label: "İlgi Alanı",
    type: "enum",
    values: [
      "PERSONAL_DEVELOPMENT",
      "RELATIONSHIPS_PSYCHOLOGY",
      "BUSINESS_ENTREPRENEURSHIP",
      "FITNESS_HEALTH",
      "FOOD_LIFESTYLE",
      "FINANCE_INVESTING",
      "FASHION_STYLE",
      "TECHNOLOGY",
      "MINIMALISM",
      "MOTIVATION_HABITS",
    ],
  },
  {
    value: "stressLevel",
    label: "Stres Seviyesi",
    type: "enum",
    values: ["LOW", "MEDIUM", "HIGH"],
  },
  {
    value: "primaryGoal",
    label: "Hedef",
    type: "enum",
    values: [
      "SELF_IMPROVEMENT",
      "MORE_MONEY",
      "BETTER_RELATIONSHIP",
      "BETTER_APPEARANCE",
      "HEALTHIER",
      "CAREER_ADVANCEMENT",
      "QUIT_BAD_HABITS",
    ],
  },
] as const;

/* Operator seçenekleri */
const OPERATORS = {
  enum: [
    { value: "EQUALS", label: "= Eşittir" },
    { value: "NOT_EQUALS", label: "≠ Eşit değildir" },
    { value: "CONTAINS", label: "İçerir" },
  ],
  text: [
    { value: "EQUALS", label: "= Eşittir" },
    { value: "CONTAINS", label: "İçerir" },
  ],
} as const;

/* ================================
   TYPES
================================ */
type Rule = {
  field: string;
  operator: string;
  value: string;
};

type RuleRowProps = {
  index: number;
  rule: Rule;
  onChange: (index: number, updated: Rule) => void;
  onRemove: (index: number) => void;
};

/* ================================
   KURAL COMPONENTİ
================================ */
function RuleRow({ index, rule, onChange, onRemove }: RuleRowProps) {
  const fieldMeta = FIELD_OPTIONS.find((f) => f.value === rule.field);
  const operatorOptions = OPERATORS[fieldMeta?.type || "text"];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3">
      <div className="flex gap-2">
        {/* Field */}
        <select
          value={rule.field}
          onChange={(e) =>
            onChange(index, {
              ...rule,
              field: e.target.value,
              value: "",
            })
          }
          className="w-48 rounded-md border border-slate-800 bg-slate-900 px-2 py-2 text-[13px] text-slate-200"
        >
          {FIELD_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* Operator */}
        <select
          value={rule.operator}
          onChange={(e) =>
            onChange(index, {
              ...rule,
              operator: e.target.value,
            })
          }
          className="w-40 rounded-md border border-slate-800 bg-slate-900 px-2 py-2 text-[13px] text-slate-200"
        >
          {operatorOptions.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>

        {/* Value alanı FIELD tipine göre değişir */}
        {fieldMeta?.type === "enum" ? (
          <select
            value={rule.value}
            onChange={(e) =>
              onChange(index, {
                ...rule,
                value: e.target.value,
              })
            }
            className="flex-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-2 text-[13px] text-slate-200"
          >
            <option value="">Seçiniz...</option>
            {fieldMeta.values.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={rule.value}
            onChange={(e) =>
              onChange(index, {
                ...rule,
                value: e.target.value,
              })
            }
            className="flex-1 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-[13px] text-slate-200"
            placeholder="Değer..."
          />
        )}

        {/* Remove Button */}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-2 rounded-md border border-red-900/70 bg-red-950/40 text-red-300 hover:text-red-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ================================
   ANA CREATE SAYFASI
================================ */
export default function CreateAudiencePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [rules, setRules] = useState<Rule[]>([
    { field: "gender", operator: "EQUALS", value: "" },
  ]);

  function addRule() {
    setRules((prev) => [
      ...prev,
      { field: "gender", operator: "EQUALS", value: "" },
    ]);
  }

  function updateRule(i: number, updated: Rule) {
    setRules((prev) => prev.map((r, idx) => (i === idx ? updated : r)));
  }

  function removeRule(i: number) {
    setRules((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("dailyspark_admin_token")
          : null;

      if (!token) {
        showToast({
          type: "error",
          title: "Oturum yok",
          message: "Lütfen giriş yap.",
        });
        return;
      }

      const body = { name, description, rules };

      const res = await fetch(`${API_BASE}/admin/audiences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Kitle oluşturulamadı.");
      }

      showToast({
        type: "success",
        title: "Başarılı",
        message: `"${name}" başarıyla oluşturuldu`,
      });

      router.push("/audiences");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Hata",
        message: err?.message || "Bir hata oluştu",
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <TopBar />

      <main className="pt-24 pl-[262px] px-6 pb-10 space-y-6">
        {/* Üst başlık */}
        <header className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
              <Users className="h-3.5 w-3.5" />
              Kitle Yönetimi
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-semibold">
              Yeni kitle oluştur
            </h1>
            <p className="mt-1 text-xs max-w-xl text-slate-400">
              Bildirim gönderebileceğin kullanıcı segmentini dinamik kurallarla
              belirle.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-300 hover:border-slate-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Geri
          </button>
        </header>

        {/* FORM CARD */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6 shadow-[0_20px_45px_rgba(15,23,42,0.65)]">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-[12px] text-slate-400">Kitle adı</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 outline-none"
              placeholder="Ör: Sağlık odaklı kadın kullanıcılar"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[12px] text-slate-400">Açıklama</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 outline-none"
              placeholder="Bu kitle kimlerden oluşuyor?"
            />
          </div>

          {/* RULES */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Segment kuralları</h2>

            {rules.map((rule, i) => (
              <RuleRow
                key={i}
                index={i}
                rule={rule}
                onChange={updateRule}
                onRemove={removeRule}
              />
            ))}

            {/* Yeni kural ekle */}
            <button
              type="button"
              onClick={addRule}
              className="inline-flex items-center gap-1 text-[12px] text-slate-300 hover:text-white"
            >
              <Plus className="h-4 w-4" />
              Yeni kural ekle
            </button>
          </div>

          {/* Kaydet */}
          <div>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#2979FF] to-[#4FFFB0] px-5 py-2.5 text-[12px] font-semibold text-slate-950 shadow-[0_12px_32px_rgba(41,121,255,0.5)]"
            >
              <Save className="h-4 w-4" />
              Kaydet
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
