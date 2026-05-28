"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Shield } from "lucide-react";
import Link from "next/link";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, admin, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--muted)] text-sm">Chargement...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative">
      {/* Floating top-right bar */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {admin && (
          <Link
            href="/admin/logs"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/90 backdrop-blur border border-[var(--line)] text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] transition-colors shadow-sm"
          >
            <Shield size={13} />
            Admin
          </Link>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/90 backdrop-blur border border-[var(--line)] text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] transition-colors shadow-sm"
        >
          <span className="w-5 h-5 rounded-full bg-[var(--ink)] text-white grid place-items-center text-[10px] font-bold">
            {user.email?.[0]?.toUpperCase() || "?"}
          </span>
          {user.email?.split("@")[0]}
        </button>
        {open && (
          <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl border border-[var(--line)] shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--line)]">
              <div className="text-xs font-medium truncate">{user.email}</div>
              <div className="text-[11px] text-[var(--muted)]">
                {admin ? "Administrateur" : "Utilisateur"}
              </div>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[var(--bad-fg)] hover:bg-red-50 transition-colors"
            >
              <LogOut size={14} />
              Deconnexion
            </button>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
