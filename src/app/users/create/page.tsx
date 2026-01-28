"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import {
  ArrowLeft,
  Loader2,
  Mail,
  User2,
  Shield,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  Sparkles,
  Brain,
  Lock,
} from "lucide-react";

const API_BASE = "https://notification-backend-d1ol.onrender.com";

/* ==== Enum tipleri (Prisma enum’larıyla bire bir aynı) ==== */
type UserRole = "USER" | "ADMIN";

type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

type MaritalStatus =
  | "SINGLE"
  | "IN_RELATIONSHIP"
  | "MARRIED"
  | "SEPARATED_DIVORCED"
  | "PREFER_NOT_TO_SAY";

type InterestCategory =
  | "PERSONAL_DEVELOPMENT"
  | "RELATIONSHIPS_PSYCHOLOGY"
  | "BUSINESS_ENTREPRENEURSHIP"
  | "FITNESS_HEALTH"
  | "FOOD_LIFESTYLE"
  | "FINANCE_INVESTING"
  | "FASHION_STYLE"
  | "TECHNOLOGY"
  | "MINIMALISM"
  | "MOTIVATION_HABITS";

type PrimaryGoal =
  | "SELF_IMPROVEMENT"
  | "MORE_MONEY"
  | "BETTER_RELATIONSHIP"
  | "BETTER_APPEARANCE"
  | "HEALTHIER"
  | "CAREER_ADVANCEMENT"
  | "QUIT_BAD_HABITS";

type GoalTimeframe = "ONE_MONTH" | "THREE_MONTHS" | "SIX_MONTHS" | "ONE_YEAR";

type StressLevel = "LOW" | "MEDIUM" | "HIGH";

type ContentTypePreference =
  | "VIDEO"
  | "ARTICLE"
  | "QUIZ"
  | "PODCAST"
  | "SHORT_NOTES";

type MotivationType =
  | "MONEY"
  | "STATUS_APPROVAL"
  | "SECURITY_COMFORT"
  | "LOVE_ACCEPTANCE"
  | "FREEDOM"
  | "SUCCESS_POWER";

type BiggestStruggle =
  | "FOCUS"
  | "RELATIONSHIPS"
  | "MONEY_MANAGEMENT"
  | "SELF_CONFIDENCE"
  | "HEALTH_DISCIPLINE"
  | "WORK_LIFE"
  | "MOTIVATION";

export default function UserCreatePage() {
  const router = useRouter();

  /* ------- Temel Bilgiler ------- */
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // backend’e gidecek şifre
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // aşağıdakiler şimdilik sadece UI; backend’e gönderilmiyor
  const [birthYear, setBirthYear] = useState<string>("");
  const [gender, setGender] = useState<Gender | "">("");
  const [city, setCity] = useState("");
  const [occupation, setOccupation] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | "">("");

  /* ------- Rol & Durum ------- */
  const [role, setRole] = useState<UserRole>("USER");
  const [isActive, setIsActive] = useState(true);

  /* ------- Hedef & psikoloji ------- */
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | "">("");
  const [goalTimeframe, setGoalTimeframe] = useState<GoalTimeframe | "">("");
  const [stressLevel, setStressLevel] = useState<StressLevel | "">("");
  const [mainMotivation, setMainMotivation] = useState<MotivationType | "">("");
  const [biggestStruggle, setBiggestStruggle] = useState<BiggestStruggle | "">(
    ""
  );

  const [interests, setInterests] = useState<InterestCategory[]>([]);
  const [preferredContent, setPreferredContent] = useState<
    ContentTypePreference[]
  >([]);

  /* ------- Diğer state’ler ------- */
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleInterest(value: InterestCategory) {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
    );
  }

  function togglePreferredContent(value: ContentTypePreference) {
    setPreferredContent((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Şifre ve şifre tekrarı uyuşmuyor.");
      return;
    }

    setSaving(true);

    try {
      // NOT: ValidationPipe forbidNonWhitelisted = true olduğu için
      // sadece RegisterDto’da olan alanları gönderiyoruz.
      const payload = {
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role,
      };

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Kullanıcı oluşturulurken bir hata oluştu.";
        try {
          const data = await res.json();
          if (data?.message) {
            msg =
              Array.isArray(data.message) && data.message.length
                ? data.message.join("\n")
                : String(data.message);
          }
        } catch {
          // ignore parse error
        }
        throw new Error(msg);
      }

      // isteğin döndürdüğü token vs. ile şu an ekstra bir şey yapmıyoruz;
      // sadece listeye dönüyoruz.
      router.push("/users");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Yeni kullanıcı oluşturulurken hata:", err);
      setError(err.message || "Bir şeyler ters gitti, lütfen tekrar dene.");
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
              Yeni kullanıcı ekle
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              DailySpark’e yeni bir kullanıcı ekleyebilir, rol ve temel giriş
              bilgilerini buradan tanımlayabilirsin.
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
                Temel ayarlar
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
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="kullanici@dailyspark.app"
                      className="flex-1 bg-transparent text-sm text-slate-50 outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Şifre */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200">
                    Şifre <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                    <Lock className="h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Geçici şifre belirle"
                      className="flex-1 bg-transparent text-sm text-slate-50 outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Şifre tekrar */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200">
                    Şifre (tekrar) <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                    <Lock className="h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Şifreyi tekrar gir"
                      className="flex-1 bg-transparent text-sm text-slate-50 outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Doğum yılı – şimdilik sadece UI */}
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
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      placeholder="Örn: 1997"
                      className="flex-1 bg-transparent text-sm text-slate-50 outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Cinsiyet – UI only */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200">
                    Cinsiyet
                  </label>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as Gender | "")}
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

                {/* Şehir – UI only */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200">
                    Şehir
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Örn: İstanbul"
                      className="flex-1 bg-transparent text-sm text-slate-50 outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Meslek – UI only */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200">
                    Meslek
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                    <Briefcase className="h-4 w-4 text-slate-500" />
                    <input
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="Örn: Yazılım Geliştirici"
                      className="flex-1 bg-transparent text-sm text-slate-50 outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Eğitim seviyesi – UI only */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200">
                    Eğitim seviyesi
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                    <GraduationCap className="h-4 w-4 text-slate-500" />
                    <input
                      value={educationLevel}
                      onChange={(e) => setEducationLevel(e.target.value)}
                      placeholder="Örn: Lisans, Yüksek lisans"
                      className="flex-1 bg-transparent text-sm text-slate-50 outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Medeni durum – UI only */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200">
                    Medeni durum
                  </label>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                    <select
                      value={maritalStatus}
                      onChange={(e) =>
                        setMaritalStatus(
                          e.target.value as MaritalStatus | ""
                        )
                      }
                      className="w-full bg-transparent text-sm text-slate-50 outline-none"
                    >
                      <option value="">Seçiniz</option>
                      <option value="SINGLE">Bekar</option>
                      <option value="IN_RELATIONSHIP">İlişkisi var</option>
                      <option value="MARRIED">Evli</option>
                      <option value="SEPARATED_DIVORCED">
                        Ayrı / Boşanmış
                      </option>
                      <option value="PREFER_NOT_TO_SAY">
                        Belirtmek istemiyorum
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Rol & durum */}
            <section className="grid gap-4 md:grid-cols-2">
              {/* Rol */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-200">
                  Rol
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                  <Shield className="h-4 w-4 text-slate-500" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
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

              {/* Durum */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-200">
                  Durum
                </label>
                <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                  <div>
                    <p className="text-xs text-slate-200">
                      {isActive ? "Aktif kullanıcı" : "Pasif kullanıcı"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Pasif kullanıcılar bildirim almaz ve akışlarda görünmez.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isActive ? "bg-emerald-400" : "bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow-md transition-transform ${
                        isActive ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </section>

            {/* Hedefler & ilgi alanları (şimdilik UI only) */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-[0.18em] flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#4FFFB0]" />
                Hedefler & İlgi Alanları
              </h3>

              {/* Buradaki alanlar backend’e gönderilmiyor; sadece tasarım */}
              {/* İleride /admin/users gibi bir endpoint yazınca payload’a ekleriz */}

              <div className="grid gap-4 md:grid-cols-2">
                {/* Ana hedef */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200">
                    Ana hedef
                  </label>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                    <select
                      value={primaryGoal}
                      onChange={(e) =>
                        setPrimaryGoal(e.target.value as PrimaryGoal | "")
                      }
                      className="w-full bg-transparent text-sm text-slate-50 outline-none"
                    >
                      <option value="">Seçiniz</option>
                      <option value="SELF_IMPROVEMENT">
                        Kendimi geliştirmek
                      </option>
                      <option value="MORE_MONEY">
                        Daha fazla para kazanmak
                      </option>
                      <option value="BETTER_RELATIONSHIP">
                        Daha iyi ilişki kurmak
                      </option>
                      <option value="BETTER_APPEARANCE">
                        Daha iyi görünmek
                      </option>
                      <option value="HEALTHIER">Daha sağlıklı olmak</option>
                      <option value="CAREER_ADVANCEMENT">
                        Kariyerimde yükselmek
                      </option>
                      <option value="QUIT_BAD_HABITS">
                        Kötü alışkanlıkları bırakmak
                      </option>
                    </select>
                  </div>
                </div>

                {/* Hedef zaman aralığı */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200">
                    Hedef zaman aralığı
                  </label>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                    <select
                      value={goalTimeframe}
                      onChange={(e) =>
                        setGoalTimeframe(e.target.value as GoalTimeframe | "")
                      }
                      className="w-full bg-transparent text-sm text-slate-50 outline-none"
                    >
                      <option value="">Seçiniz</option>
                      <option value="ONE_MONTH">1 ay</option>
                      <option value="THREE_MONTHS">3 ay</option>
                      <option value="SIX_MONTHS">6 ay</option>
                      <option value="ONE_YEAR">1 yıl</option>
                    </select>
                  </div>
                </div>

                {/* Stres seviyesi */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200">
                    Stres seviyesi
                  </label>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                    <select
                      value={stressLevel}
                      onChange={(e) =>
                        setStressLevel(e.target.value as StressLevel | "")
                      }
                      className="w-full bg-transparent text-sm text-slate-50 outline-none"
                    >
                      <option value="">Seçiniz</option>
                      <option value="LOW">Düşük</option>
                      <option value="MEDIUM">Orta</option>
                      <option value="HIGH">Yüksek</option>
                    </select>
                  </div>
                </div>

                {/* Ana motivasyon */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200">
                    Ana motivasyon
                  </label>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                    <select
                      value={mainMotivation}
                      onChange={(e) =>
                        setMainMotivation(
                          e.target.value as MotivationType | ""
                        )
                      }
                      className="w-full bg-transparent text-sm text-slate-50 outline-none"
                    >
                      <option value="">Seçiniz</option>
                      <option value="MONEY">Para</option>
                      <option value="STATUS_APPROVAL">
                        Statü & beğeni
                      </option>
                      <option value="SECURITY_COMFORT">
                        Güvenlik & rahatlık
                      </option>
                      <option value="LOVE_ACCEPTANCE">
                        Sevgi & kabul görme
                      </option>
                      <option value="FREEDOM">Özgürlük</option>
                      <option value="SUCCESS_POWER">
                        Başarı & güç
                      </option>
                    </select>
                  </div>
                </div>

                {/* En büyük zorluk */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-medium text-slate-200">
                    Şu anda en büyük zorluk
                  </label>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
                    <select
                      value={biggestStruggle}
                      onChange={(e) =>
                        setBiggestStruggle(
                          e.target.value as BiggestStruggle | ""
                        )
                      }
                      className="w-full bg-transparent text-sm text-slate-50 outline-none"
                    >
                      <option value="">Seçiniz</option>
                      <option value="FOCUS">Odaklanma</option>
                      <option value="RELATIONSHIPS">İlişkiler</option>
                      <option value="MONEY_MANAGEMENT">
                        Para yönetimi
                      </option>
                      <option value="SELF_CONFIDENCE">
                        Kendine güven
                      </option>
                      <option value="HEALTH_DISCIPLINE">
                        Sağlık & disiplin
                      </option>
                      <option value="WORK_LIFE">İş hayatı</option>
                      <option value="MOTIVATION">Motivasyon</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* İlgi alanları & içerik tipi çoklu seçim (UI only) */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* İlgi alanları */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200">
                    İlgi alanları
                  </label>
                  <div className="flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-3 text-[11px]">
                    {(
                      [
                        [
                          "PERSONAL_DEVELOPMENT",
                          "Kişisel gelişim",
                        ],
                        [
                          "RELATIONSHIPS_PSYCHOLOGY",
                          "İlişki & psikoloji",
                        ],
                        [
                          "BUSINESS_ENTREPRENEURSHIP",
                          "İş / girişimcilik",
                        ],
                        ["FITNESS_HEALTH", "Fitness & sağlık"],
                        ["FOOD_LIFESTYLE", "Yemek & yaşam"],
                        [
                          "FINANCE_INVESTING",
                          "Finans & yatırım",
                        ],
                        ["FASHION_STYLE", "Moda & stil"],
                        ["TECHNOLOGY", "Teknoloji"],
                        ["MINIMALISM", "Minimalist yaşam"],
                        [
                          "MOTIVATION_HABITS",
                          "Motivasyon / alışkanlık",
                        ],
                      ] as [InterestCategory, string][]
                    ).map(([value, label]) => {
                      const active = interests.includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleInterest(value)}
                          className={`rounded-full px-3 py-1 border transition-colors ${
                            active
                              ? "border-[#4FFFB0] bg-[#4FFFB0]/15 text-[#4FFFB0]"
                              : "border-slate-700 bg-slate-900 text-slate-300"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tercih edilen içerik tipi */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200">
                    Tercih edilen içerik tipi
                  </label>
                  <div className="flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-3 text-[11px]">
                    {(
                      [
                        ["VIDEO", "Video"],
                        ["ARTICLE", "Yazı / makale"],
                        ["QUIZ", "Quiz"],
                        ["PODCAST", "Podcast"],
                        ["SHORT_NOTES", "Kısa notlar"],
                      ] as [ContentTypePreference, string][]
                    ).map(([value, label]) => {
                      const active = preferredContent.includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => togglePreferredContent(value)}
                          className={`rounded-full px-3 py-1 border transition-colors ${
                            active
                              ? "border-[#2979FF] bg-[#2979FF]/20 text-[#4FFFB0]"
                              : "border-slate-700 bg-slate-900 text-slate-300"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/60 rounded-md px-3 py-2 whitespace-pre-line">
                {error}
              </p>
            )}

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
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#2979FF] to-[#4FFFB0] px-4 py-2 text-xs font-semibold text-slate-950 shadow-[0_10px_30px_rgba(41,121,255,0.5)] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  "Kullanıcıyı oluştur"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
