"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import {
  ArrowLeft,
  Users,
  Clock,
  Activity,
  Download,
  Monitor,
  LogIn,
  LogOut,
  Eye,
} from "lucide-react";
import Link from "next/link";

interface Session {
  id: string;
  uid: string;
  email: string;
  ip: string;
  loginAt: Timestamp | null;
  logoutAt: Timestamp | null;
  lastSeen: Timestamp | null;
  userAgent: string;
  screenWidth: number;
}

interface LogEntry {
  id: string;
  uid: string;
  email: string;
  ip?: string;
  action: string;
  page?: string;
  timestamp: Timestamp | null;
  userAgent?: string;
}

function formatDate(ts: Timestamp | null): string {
  if (!ts) return "—";
  const d = ts.toDate();
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(ts: Timestamp | null): string {
  if (!ts) return "—";
  const d = ts.toDate();
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(loginAt: Timestamp | null, endAt: Timestamp | null): string {
  if (!loginAt || !endAt) return "—";
  const ms = endAt.toDate().getTime() - loginAt.toDate().getTime();
  if (ms < 0) return "—";
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  if (hours > 0) return `${hours}h ${mins % 60}min`;
  if (mins > 0) return `${mins}min`;
  return `${Math.floor(ms / 1000)}s`;
}

function parseDevice(ua: string): string {
  if (!ua) return "Inconnu";
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Autre";
}

function parseBrowser(ua: string): string {
  if (!ua) return "";
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) return "Chrome";
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return "Safari";
  if (/Firefox/.test(ua)) return "Firefox";
  if (/Edg/.test(ua)) return "Edge";
  return "";
}

function isOnline(lastSeen: Timestamp | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - lastSeen.toDate().getTime() < 120_000; // 2 min
}

export default function AdminLogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tab, setTab] = useState<"sessions" | "logs">("sessions");

  // Guard: admin only
  useEffect(() => {
    if (user && !isAdmin(user.email)) {
      router.push("/dashboard");
    }
  }, [user, router]);

  // Real-time sessions
  useEffect(() => {
    const q = query(
      collection(db, "sessions"),
      orderBy("loginAt", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      setSessions(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Session))
      );
    });
    return () => unsub();
  }, []);

  // Real-time logs
  useEffect(() => {
    const q = query(
      collection(db, "logs"),
      orderBy("timestamp", "desc"),
      limit(500)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLogs(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as LogEntry))
      );
    });
    return () => unsub();
  }, []);

  if (!user || !isAdmin(user.email)) return null;

  // KPIs
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySessions = sessions.filter(
    (s) => s.loginAt && s.loginAt.toDate() >= today
  );
  const uniqueUsersToday = new Set(todaySessions.map((s) => s.email)).size;
  const onlineNow = sessions.filter(
    (s) => !s.logoutAt && isOnline(s.lastSeen)
  );

  // Export CSV
  const exportCSV = () => {
    const header = "Email,IP,Login,Logout,Duree,Device,Navigateur\n";
    const rows = sessions
      .map((s) => {
        const login = s.loginAt ? s.loginAt.toDate().toISOString() : "";
        const logout = s.logoutAt ? s.logoutAt.toDate().toISOString() : "";
        const dur = formatDuration(s.loginAt, s.logoutAt || s.lastSeen);
        const device = parseDevice(s.userAgent);
        const browser = parseBrowser(s.userAgent);
        return `${s.email},${s.ip || "—"},${login},${logout},${dur},${device},${browser}`;
      })
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-transport-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const actionIcon = (action: string) => {
    switch (action) {
      case "login":
        return <LogIn size={14} className="text-[var(--ok-fg)]" />;
      case "logout":
        return <LogOut size={14} className="text-[var(--bad-fg)]" />;
      case "pageview":
        return <Eye size={14} className="text-[var(--ink-2)]" />;
      default:
        return <Activity size={14} className="text-[var(--muted)]" />;
    }
  };

  const actionLabel = (action: string) => {
    switch (action) {
      case "login": return "Connexion";
      case "logout": return "Deconnexion";
      case "pageview": return "Page consultee";
      default: return action;
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-8 pb-24 max-sm:px-4">
      {/* Header */}
      <header className="flex items-center justify-between py-5 border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          <span className="w-[34px] h-[34px] rounded-lg bg-[var(--ink)] text-white grid place-items-center font-bold text-lg tracking-tight">
            /A
          </span>
          <div className="leading-tight">
            <span className="font-semibold text-[15px]">Administration</span>
            <span className="block text-xs text-[var(--muted)]">
              Journal des connexions
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--line)] bg-white text-sm font-medium hover:bg-[var(--surface-2)] transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--ink)] text-white text-sm font-medium hover:bg-[#2a2828] transition-colors"
          >
            <ArrowLeft size={14} />
            Portefeuille
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 pt-5 pb-2 text-[13px] text-[var(--muted)]">
        <Link href="/dashboard" className="hover:text-[var(--ink)]">
          Portefeuille
        </Link>
        <span className="opacity-60">/</span>
        <span className="text-[var(--ink-2)]">Admin / Logs</span>
      </div>

      {/* Title */}
      <div className="pt-4 pb-8">
        <p className="text-xs font-semibold tracking-[0.10em] uppercase text-[var(--ink-2)] mb-4">
          <span className="text-[var(--sage-deep)] mr-1">/</span>
          Administration
        </p>
        <h1 className="text-[clamp(32px,4vw,48px)] font-semibold leading-[1.05] tracking-[-0.025em]">
          Journal des connexions
        </h1>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <div className="bg-white border border-[var(--line)] rounded-[14px] p-5 flex flex-col justify-between min-h-[130px]">
          <div className="text-xs text-[var(--muted)] tracking-wide flex items-center gap-2">
            <Activity size={14} />
            En ligne maintenant
          </div>
          <div className="text-[32px] font-semibold tracking-tight leading-none">
            {onlineNow.length}
          </div>
          <div className="text-xs text-[var(--ink-2)]">
            {onlineNow.map((s) => s.email.split("@")[0]).join(", ") || "Aucun"}
          </div>
        </div>
        <div className="bg-white border border-[var(--line)] rounded-[14px] p-5 flex flex-col justify-between min-h-[130px]">
          <div className="text-xs text-[var(--muted)] tracking-wide flex items-center gap-2">
            <LogIn size={14} />
            Connexions aujourd hui
          </div>
          <div className="text-[32px] font-semibold tracking-tight leading-none">
            {todaySessions.length}
          </div>
          <div className="text-xs text-[var(--ink-2)]">
            {uniqueUsersToday} utilisateur{uniqueUsersToday > 1 ? "s" : ""}{" "}
            unique{uniqueUsersToday > 1 ? "s" : ""}
          </div>
        </div>
        <div className="bg-white border border-[var(--line)] rounded-[14px] p-5 flex flex-col justify-between min-h-[130px]">
          <div className="text-xs text-[var(--muted)] tracking-wide flex items-center gap-2">
            <Users size={14} />
            Sessions totales
          </div>
          <div className="text-[32px] font-semibold tracking-tight leading-none">
            {sessions.length}
          </div>
          <div className="text-xs text-[var(--ink-2)]">
            {new Set(sessions.map((s) => s.email)).size} utilisateurs uniques
          </div>
        </div>
        <div className="bg-white border border-[var(--line)] rounded-[14px] p-5 flex flex-col justify-between min-h-[130px]">
          <div className="text-xs text-[var(--muted)] tracking-wide flex items-center gap-2">
            <Clock size={14} />
            Evenements traces
          </div>
          <div className="text-[32px] font-semibold tracking-tight leading-none">
            {logs.length}
          </div>
          <div className="text-xs text-[var(--ink-2)]">
            login / logout / pages vues
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("sessions")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === "sessions"
              ? "bg-[var(--ink)] text-white"
              : "bg-white border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
          }`}
        >
          Sessions ({sessions.length})
        </button>
        <button
          onClick={() => setTab("logs")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === "logs"
              ? "bg-[var(--ink)] text-white"
              : "bg-white border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
          }`}
        >
          Journal complet ({logs.length})
        </button>
      </div>

      {/* Sessions table */}
      {tab === "sessions" && (
        <div className="bg-white border border-[var(--line)] rounded-[14px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[950px]">
              <thead>
                <tr className="border-b border-[var(--line)]">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Statut
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Utilisateur
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Adresse IP
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Connexion
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Deconnexion
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Duree
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Device
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const online = !s.logoutAt && isOnline(s.lastSeen);
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-[var(--line-2)] hover:bg-[#FAF8F2] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            online
                              ? "bg-[var(--ok-bg)] text-[var(--ok-fg)]"
                              : "bg-[var(--surface-2)] text-[var(--muted)]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              online ? "bg-[var(--ok-fg)]" : "bg-[var(--muted)]"
                            }`}
                          />
                          {online ? "En ligne" : "Hors ligne"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{s.email}</td>
                      <td className="px-4 py-3 text-xs font-mono text-[var(--ink-2)]">
                        {s.ip || "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <div>{formatDate(s.loginAt)}</div>
                        <div className="text-xs text-[var(--muted)]">
                          {formatTime(s.loginAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {s.logoutAt ? (
                          <>
                            <div>{formatDate(s.logoutAt)}</div>
                            <div className="text-xs text-[var(--muted)]">
                              {formatTime(s.logoutAt)}
                            </div>
                          </>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium">
                        {formatDuration(s.loginAt, s.logoutAt || s.lastSeen)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Monitor size={14} className="text-[var(--muted)]" />
                          <div>
                            <div className="text-xs">
                              {parseDevice(s.userAgent)}
                            </div>
                            <div className="text-xs text-[var(--muted)]">
                              {parseBrowser(s.userAgent)}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sessions.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-[var(--muted)]"
                    >
                      Aucune session enregistree.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full logs table */}
      {tab === "logs" && (
        <div className="bg-white border border-[var(--line)] rounded-[14px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead>
                <tr className="border-b border-[var(--line)]">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Utilisateur
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Adresse IP
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Detail
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Date / Heure
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-[var(--line-2)] hover:bg-[#FAF8F2] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        {actionIcon(l.action)}
                        <span className="font-medium">
                          {actionLabel(l.action)}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">{l.email}</td>
                    <td className="px-4 py-3 text-xs font-mono text-[var(--ink-2)]">
                      {l.ip || "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {l.page || "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <div>{formatDate(l.timestamp)}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {formatTime(l.timestamp)}
                      </div>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-[var(--muted)]"
                    >
                      Aucun evenement enregistre.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <footer className="mt-8 pt-5 border-t border-[var(--line)] text-xs text-[var(--muted)] flex justify-between flex-wrap gap-2">
        <span>Donnees temps reel / Firestore</span>
        <span>Agence Allianz Marseille : Nogaro &amp; Boetti</span>
      </footer>
    </div>
  );
}
