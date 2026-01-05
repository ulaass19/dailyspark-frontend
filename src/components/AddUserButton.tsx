"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function AddUserButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/users/create")}
      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2979FF] to-[#4FFFB0] px-3 py-2 text-[11px] font-medium text-slate-950 shadow-[0_10px_30px_rgba(41,121,255,0.5)]"
    >
      <Plus className="h-3.5 w-3.5" />
      Yeni kullanıcı ekle
    </button>
  );
}
