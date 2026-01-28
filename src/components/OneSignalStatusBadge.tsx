// src/components/OneSignalStatusBadge.tsx
"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bell } from "lucide-react";

const API_BASE = "https://notification-backend-d1ol.onrender.com";

type OneSignalStatus =
  | "OK"
  | "DISABLED"
  | "DRY_RUN"
  | "CONFIG_MISSING"
  | string;

type StatusResponse = {
  enabled: boolean;
  dryRun: boolean;
  hasConfig: boolean;
  env: string;
  status: OneSignalStatus;
};

export function OneSignalStatusBadge() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          setError("Oturum bulunamadı");
          setLoading(false);
          return;
        }

        const res = await fetch(
          `${API_BASE}/admin/notifications/meta/onesignal-status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("OneSignal status error:", res.status, text);
          setError("Durum alınamadı");
          setLoading(false);
          return;
        }

        const json: StatusResponse = await res.json();
        setData(json);
      } catch (err) {
        console.error("OneSignal status fetch error:", err);
        setError("Durum alınamadı");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-400">
        <Bell className="h-3.5 w-3.5" />
        OneSignal durumu yükleniyor...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-red-900/70 bg-red-950/40 px-3 py-1 text-[11px] text-red-100">
        <AlertTriangle className="h-3.5 w-3.5" />
        OneSignal durumu alınamadı
      </div>
    );
  }

  let label = "";
  let cls =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ";

  switch (data.status) {
    case "OK":
      label = "OneSignal: Aktif";
      cls +=
        "border border-emerald-500/70 bg-emerald-500/10 text-emerald-200";
      break;
    case "DRY_RUN":
      label = "OneSignal: Dry-Run (Test)";
      cls +=
        "border border-amber-500/70 bg-amber-500/10 text-amber-200";
      break;
    case "DISABLED":
      label = "OneSignal: Kapalı";
      cls +=
        "border border-slate-700 bg-slate-900/70 text-slate-300";
      break;
    case "CONFIG_MISSING":
      label = "OneSignal: Config Eksik";
      cls += "border border-red-500/70 bg-red-500/10 text-red-100";
      break;
    default:
      label = `OneSignal: ${data.status}`;
      cls += "border border-slate-700 bg-slate-900/70 text-slate-300";
  }

  return (
    <div className={cls}>
      <Bell className="h-3.5 w-3.5" />
      <span>{label}</span>
      <span className="ml-1 text-[10px] text-slate-400">
        ({data.env})
      </span>
    </div>
  );
}
