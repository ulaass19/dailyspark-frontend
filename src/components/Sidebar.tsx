"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Bell,
  Target,
  Users,
  Settings,
  LogOut,
  UserCog,
  ClipboardList,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "User Management", href: "/users", icon: UserCog },
  { label: "Bildirimler", href: "/notifications", icon: Bell },

  // 🆕 Anketler
  { label: "Anketler", href: "/surveys", icon: ClipboardList },

  { label: "Gelen Feedbackler", href: "/feedbacks", icon: Target },
  { label: "Kitleler", href: "/audiences", icon: Users },
  { label: "Ayarlar", href: "/settings", icon: Settings },
];

type StoredUser = {
  email?: string;
  fullName?: string;
  role?: string;
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("dailyspark_admin_user");
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as StoredUser;
          setUser(parsed);
        } catch {
          setUser(null);
        }
      }
    }
  }, []);

  function isActive(href: string) {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("dailyspark_admin_token");
      localStorage.removeItem("dailyspark_admin_user");
    }
    router.push("/login");
  }

  const initial =
    (user?.fullName?.trim()?.charAt(0) ||
      user?.email?.trim()?.charAt(0) ||
      "D"
    ).toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-800/70 bg-slate-950/95 px-4 py-5 text-slate-100 shadow-[0_0_40px_rgba(15,23,42,0.9)] backdrop-blur lg:flex lg:flex-col">
      {/* Logo / Brand */}
      <div className="flex items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#2979FF] to-[#4FFFB0] shadow-[0_0_20px_rgba(41,121,255,0.65)]">
            <span className="text-xs font-bold tracking-tight text-slate-950">
              DS
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">
              Daily<span className="text-[#4FFFB0]">Spark</span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
              admin panel
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

      {/* Navigation */}
      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto pr-1 text-sm">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors",
                active
                  ? "bg-slate-900/80 text-slate-50 border border-slate-700 shadow-[0_0_0_1px_rgba(79,255,176,0.3)]"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-md border text-[13px]",
                  active
                    ? "border-[#4FFFB0]/70 bg-slate-950/70 text-[#4FFFB0]"
                    : "border-slate-700/80 bg-slate-950/40 text-slate-400 group-hover:border-[#2979FF]/60 group-hover:text-[#4FFFB0]",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom user / logout */}
      <div className="mt-3 space-y-3 border-t border-slate-800/80 pt-3">
        {mounted && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-900/70 px-2.5 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-100">
              {initial}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-medium leading-tight">
                {user?.fullName || "Admin Kullanıcı"}
              </span>
              <span className="truncate text-[11px] text-slate-400">
                {user?.email || "admin@dailyspark.app"}
              </span>
              <span className="text-[10px] text-[#4FFFB0]">DailySpark Admin</span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-2 text-[11px] text-slate-400 transition hover:border-red-500/70 hover:bg-red-950/40 hover:text-red-200"
        >
          <span className="inline-flex items-center gap-1.5">
            <LogOut className="h-3.5 w-3.5" />
            <span>Çıkış yap</span>
          </span>
          <span className="text-[9px] uppercase tracking-[0.16em]">logout</span>
        </button>
      </div>
    </aside>
  );
}
