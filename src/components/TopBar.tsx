"use client";

import { useEffect, useState } from "react";
import { Search, Bell, LogOut } from "lucide-react";

type DecodedToken = {
  email?: string;
  role?: string;
  fullName?: string;
};

function decodeToken(token: string | null): DecodedToken {
  if (!token) return {};
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function TopBar() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("dailyspark_admin_token");
    const decoded = decodeToken(token);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserEmail(decoded.email ?? null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setUserName((decoded as any).fullName ?? null);
    setRole(decoded.role ?? null);
  }, []);

  const initials =
    (userName
      ?.split(" ")
      .map((p) => p[0])
      .join("") ||
      userEmail?.[0] ||
      "D"
    ).toUpperCase();

  return (
    <header className="fixed top-0 right-0 z-40 left-[262px] h-16 border-b border-slate-900/80 bg-slate-950/90 backdrop-blur-xl flex items-center justify-between px-6">
      {/* Sol: breadcrumb / başlık */}
      <div className="flex flex-col">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          DAILYSPARK • ADMIN
        </div>
        <div className="mt-0.5 text-xs text-slate-400">
          Bildirim aktivitelerini, kullanıcı etkileşimini ve kampanya
          performansını takip et.
        </div>
      </div>

      {/* Sağ: arama + bildirim + profil */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-[11px] text-slate-300 min-w-[220px]">
          <Search className="h-3.5 w-3.5 text-slate-500" />
          <input
            className="bg-transparent flex-1 outline-none placeholder:text-slate-500 text-xs"
            placeholder="Bildirimler, kampanyalar, kitleler..."
          />
        </div>

        <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-600">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#4FFFB0] shadow-[0_0_12px_rgba(79,255,176,0.9)]" />
        </button>

        <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2979FF]/30 text-[11px] font-semibold text-slate-50">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col mr-1">
            <span className="text-[11px] text-slate-100 truncate max-w-[140px]">
              {userName || "DailySpark Admin"}
            </span>
            <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
              {userEmail || "admin@dailyspark.app"}
            </span>
          </div>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-800 bg-slate-950/90 text-slate-400 hover:text-slate-100 hover:border-slate-600"
            onClick={() => {
              localStorage.removeItem("dailyspark_admin_token");
              window.location.href = "/login";
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
