"use client";

import { useEffect, useState, useRef } from "react";
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
  FileText,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Smartphone,
  Laptop,
  Globe,
} from "lucide-react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────

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

interface GroupedSession {
  email: string;
  ip: string;
  device: string;
  browser: string;
  firstLogin: Date;
  lastActivity: Date;
  logoutAt: Date | null;
  totalDurationMs: number;
  sessions: Session[];
  isOnline: boolean;
}

// ── Helpers ────────────────────────────────────────────

function formatDate(ts: Timestamp | null): string {
  if (!ts) return "\u2014";
  return ts.toDate().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(ts: Timestamp | null): string {
  if (!ts) return "\u2014";
  return ts.toDate().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDurationMs(ms: number): string {
  if (ms < 0) return "\u2014";
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  if (hours > 0) return `${hours}h ${mins % 60}min`;
  if (mins > 0) return `${mins}min`;
  return `${Math.floor(ms / 1000)}s`;
}

function formatDuration(
  loginAt: Timestamp | null,
  endAt: Timestamp | null
): string {
  if (!loginAt || !endAt) return "\u2014";
  const ms = endAt.toDate().getTime() - loginAt.toDate().getTime();
  return formatDurationMs(ms);
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
  return Date.now() - lastSeen.toDate().getTime() < 120_000;
}

function deviceIcon(device: string) {
  if (device === "iOS" || device === "Android")
    return <Smartphone size={14} className="text-[var(--muted)]" />;
  return <Laptop size={14} className="text-[var(--muted)]" />;
}

// ── Grouping logic ─────────────────────────────────────
// Merge micro-sessions (< 2 min gap) from same user + same IP into one block

function groupSessions(sessions: Session[]): GroupedSession[] {
  const sorted = [...sessions].sort((a, b) => {
    const aT = a.loginAt?.toDate().getTime() ?? 0;
    const bT = b.loginAt?.toDate().getTime() ?? 0;
    return aT - bT;
  });

  const groups: GroupedSession[] = [];
  const GAP_THRESHOLD = 2 * 60 * 1000; // 2 minutes

  for (const s of sorted) {
    const loginTime = s.loginAt?.toDate() ?? new Date();
    const endTime = s.logoutAt?.toDate() ?? s.lastSeen?.toDate() ?? loginTime;
    const device = parseDevice(s.userAgent);
    const browser = parseBrowser(s.userAgent);
    const online = !s.logoutAt && isOnline(s.lastSeen);

    const lastGroup = groups.find(
      (g) =>
        g.email === s.email &&
        g.ip === s.ip &&
        !g.isOnline &&
        Math.abs(loginTime.getTime() - g.lastActivity.getTime()) <
          GAP_THRESHOLD
    );

    if (lastGroup) {
      lastGroup.sessions.push(s);
      if (loginTime < lastGroup.firstLogin) lastGroup.firstLogin = loginTime;
      if (endTime > lastGroup.lastActivity) lastGroup.lastActivity = endTime;
      lastGroup.totalDurationMs =
        lastGroup.lastActivity.getTime() - lastGroup.firstLogin.getTime();
      lastGroup.logoutAt = s.logoutAt?.toDate() ?? lastGroup.logoutAt;
      lastGroup.device = device;
      lastGroup.browser = browser;
      if (online) lastGroup.isOnline = true;
    } else {
      groups.push({
        email: s.email,
        ip: s.ip,
        device,
        browser,
        firstLogin: loginTime,
        lastActivity: endTime,
        logoutAt: s.logoutAt?.toDate() ?? null,
        totalDurationMs: endTime.getTime() - loginTime.getTime(),
        sessions: [s],
        isOnline: online,
      });
    }
  }

  return groups.sort(
    (a, b) => b.firstLogin.getTime() - a.firstLogin.getTime()
  );
}

// ── Main Component ─────────────────────────────────────

export default function AdminLogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tab, setTab] = useState<"resume" | "sessions" | "logs">("resume");
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && !isAdmin(user.email)) {
      router.push("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    const q = query(
      collection(db, "sessions"),
      orderBy("loginAt", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      setSessions(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Session)
      );
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "logs"),
      orderBy("timestamp", "desc"),
      limit(500)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLogs(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LogEntry)
      );
    });
    return () => unsub();
  }, []);

  if (!user || !isAdmin(user.email)) return null;

  // ── Computed data ──

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySessions = sessions.filter(
    (s) => s.loginAt && s.loginAt.toDate() >= today
  );
  const uniqueUsersToday = new Set(todaySessions.map((s) => s.email)).size;
  const onlineNow = sessions.filter(
    (s) => !s.logoutAt && isOnline(s.lastSeen)
  );

  const grouped = groupSessions(todaySessions);
  const allGrouped = groupSessions(sessions);

  // Per-user stats
  const userStats = new Map<
    string,
    { totalMs: number; sessions: number; online: boolean; devices: Set<string> }
  >();
  for (const g of grouped) {
    const prev = userStats.get(g.email) ?? {
      totalMs: 0,
      sessions: 0,
      online: false,
      devices: new Set<string>(),
    };
    prev.totalMs += g.totalDurationMs;
    prev.sessions += g.sessions.length;
    if (g.isOnline) prev.online = true;
    prev.devices.add(`${g.device} / ${g.browser}`);
    userStats.set(g.email, prev);
  }

  // Hourly activity (today)
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0,
  }));
  for (const s of todaySessions) {
    if (s.loginAt) {
      const h = s.loginAt.toDate().getHours();
      hourlyData[h].count++;
    }
  }
  const maxHourly = Math.max(...hourlyData.map((h) => h.count), 1);

  // Device breakdown
  const deviceBreakdown = new Map<string, number>();
  for (const s of todaySessions) {
    const key = `${parseDevice(s.userAgent)} / ${parseBrowser(s.userAgent)}`;
    deviceBreakdown.set(key, (deviceBreakdown.get(key) ?? 0) + 1);
  }
  const deviceEntries = [...deviceBreakdown.entries()].sort(
    (a, b) => b[1] - a[1]
  );

  // ── Export CSV ──

  const exportCSV = () => {
    const header = "Email,IP,Login,Logout,Duree,Device,Navigateur\n";
    const rows = sessions
      .map((s) => {
        const login = s.loginAt ? s.loginAt.toDate().toISOString() : "";
        const logout = s.logoutAt ? s.logoutAt.toDate().toISOString() : "";
        const dur = formatDuration(s.loginAt, s.logoutAt || s.lastSeen);
        const device = parseDevice(s.userAgent);
        const browser = parseBrowser(s.userAgent);
        return `${s.email},${s.ip || "\u2014"},${login},${logout},${dur},${device},${browser}`;
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

  // ── Export PDF ──

  const exportPDF = () => {
    const el = printRef.current;
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Rapport Connexions - ${new Date().toLocaleDateString("fr-FR")}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1917; padding: 40px; font-size: 12px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #888; font-size: 11px; margin-bottom: 24px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { border: 1px solid #e5e2d9; border-radius: 10px; padding: 14px; }
  .kpi-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .kpi-value { font-size: 26px; font-weight: 600; }
  .kpi-detail { font-size: 10px; color: #555; margin-top: 4px; }
  .section-title { font-size: 14px; font-weight: 600; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e2d9; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; padding: 6px 8px; border-bottom: 1px solid #e5e2d9; }
  td { padding: 6px 8px; border-bottom: 1px solid #f0ede6; font-size: 11px; }
  .online-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px; }
  .online-dot.on { background: #22863a; }
  .online-dot.off { background: #ccc; }
  .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .bar-label { width: 30px; text-align: right; font-size: 10px; color: #888; }
  .bar-track { flex: 1; height: 16px; background: #f5f3ee; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; background: #1a1917; border-radius: 4px; }
  .bar-value { width: 24px; font-size: 10px; color: #555; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e2d9; font-size: 9px; color: #aaa; display: flex; justify-content: space-between; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <h1>Journal des connexions</h1>
  <div class="subtitle">Rapport du ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} - Agence Allianz Nogaro & Boetti</div>

  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">En ligne</div>
      <div class="kpi-value">${onlineNow.length}</div>
      <div class="kpi-detail">${onlineNow.map((s) => s.email.split("@")[0]).join(", ") || "Aucun"}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Connexions aujourd'hui</div>
      <div class="kpi-value">${grouped.length}</div>
      <div class="kpi-detail">${uniqueUsersToday} utilisateur${uniqueUsersToday > 1 ? "s" : ""} unique${uniqueUsersToday > 1 ? "s" : ""} (${todaySessions.length} brutes)</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Sessions totales</div>
      <div class="kpi-value">${allGrouped.length}</div>
      <div class="kpi-detail">${sessions.length} sessions brutes / ${new Set(sessions.map((s) => s.email)).size} utilisateurs</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Evenements traces</div>
      <div class="kpi-value">${logs.length}</div>
      <div class="kpi-detail">login / logout / pages vues</div>
    </div>
  </div>

  <div class="section-title">Activite par utilisateur (aujourd'hui)</div>
  <table>
    <thead><tr><th>Utilisateur</th><th>Statut</th><th>Sessions</th><th>Temps total</th><th>Appareils</th></tr></thead>
    <tbody>
      ${[...userStats.entries()]
        .map(
          ([email, s]) =>
            `<tr>
              <td><strong>${email.split("@")[0]}</strong><br/><span style="color:#888;font-size:10px">${email}</span></td>
              <td><span class="online-dot ${s.online ? "on" : "off"}"></span>${s.online ? "En ligne" : "Hors ligne"}</td>
              <td>${s.sessions}</td>
              <td>${formatDurationMs(s.totalMs)}</td>
              <td>${[...s.devices].join(", ")}</td>
            </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div class="section-title">Activite horaire (aujourd'hui)</div>
  ${hourlyData
    .filter((h) => h.count > 0)
    .map(
      (h) =>
        `<div class="bar-row">
          <div class="bar-label">${String(h.hour).padStart(2, "0")}h</div>
          <div class="bar-track"><div class="bar-fill" style="width:${(h.count / maxHourly) * 100}%"></div></div>
          <div class="bar-value">${h.count}</div>
        </div>`
    )
    .join("")}

  <div class="section-title">Sessions consolidees (aujourd'hui)</div>
  <table>
    <thead><tr><th>Statut</th><th>Utilisateur</th><th>IP</th><th>Debut</th><th>Fin</th><th>Duree</th><th>Device</th><th>Brutes</th></tr></thead>
    <tbody>
      ${grouped
        .map(
          (g) =>
            `<tr>
              <td><span class="online-dot ${g.isOnline ? "on" : "off"}"></span>${g.isOnline ? "En ligne" : "Hors ligne"}</td>
              <td>${g.email.split("@")[0]}</td>
              <td style="font-family:monospace;font-size:10px">${g.ip || "\u2014"}</td>
              <td>${g.firstLogin.toLocaleTimeString("fr-FR")}</td>
              <td>${g.isOnline ? "\u2014" : g.lastActivity.toLocaleTimeString("fr-FR")}</td>
              <td><strong>${formatDurationMs(g.totalDurationMs)}</strong></td>
              <td>${g.device} ${g.browser}</td>
              <td>${g.sessions.length > 1 ? g.sessions.length + " regroupees" : "1"}</td>
            </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    <span>Genere le ${new Date().toLocaleString("fr-FR")} - Donnees Firestore temps reel</span>
    <span>Agence Allianz Marseille : Nogaro & Boetti</span>
  </div>
</body>
</html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  // ── Render helpers ──

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
      case "login":
        return "Connexion";
      case "logout":
        return "Deconnexion";
      case "pageview":
        return "Page consultee";
      default:
        return action;
    }
  };

  return (
    <div
      ref={printRef}
      className="max-w-[1440px] mx-auto px-8 pb-24 max-sm:px-4"
    >
      {/* Header */}
      <header className="flex items-center justify-between py-5 border-b border-[var(--line)] flex-wrap gap-3">
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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--line)] bg-white text-sm font-medium hover:bg-[var(--surface-2)] transition-colors"
          >
            <FileText size={14} />
            Export PDF
          </button>
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
            Connexions aujourd&apos;hui
          </div>
          <div className="text-[32px] font-semibold tracking-tight leading-none">
            {grouped.length}
          </div>
          <div className="text-xs text-[var(--ink-2)]">
            {uniqueUsersToday} utilisateur{uniqueUsersToday > 1 ? "s" : ""}{" "}
            unique{uniqueUsersToday > 1 ? "s" : ""}
            <span className="text-[var(--muted)] ml-1">
              ({todaySessions.length} brutes)
            </span>
          </div>
        </div>
        <div className="bg-white border border-[var(--line)] rounded-[14px] p-5 flex flex-col justify-between min-h-[130px]">
          <div className="text-xs text-[var(--muted)] tracking-wide flex items-center gap-2">
            <Users size={14} />
            Sessions totales
          </div>
          <div className="text-[32px] font-semibold tracking-tight leading-none">
            {allGrouped.length}
          </div>
          <div className="text-xs text-[var(--ink-2)]">
            {sessions.length} brutes /{" "}
            {new Set(sessions.map((s) => s.email)).size} utilisateurs
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
          onClick={() => setTab("resume")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-2 ${
            tab === "resume"
              ? "bg-[var(--ink)] text-white"
              : "bg-white border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
          }`}
        >
          <BarChart3 size={14} />
          Resume
        </button>
        <button
          onClick={() => setTab("sessions")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === "sessions"
              ? "bg-[var(--ink)] text-white"
              : "bg-white border border-[var(--line)] text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
          }`}
        >
          Sessions ({allGrouped.length})
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

      {/* ════════════════════════════════════════════════ */}
      {/* TAB: Resume (Dashboard)                         */}
      {/* ════════════════════════════════════════════════ */}
      {tab === "resume" && (
        <div className="space-y-6">
          {/* User activity */}
          <div className="bg-white border border-[var(--line)] rounded-[14px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--line)] flex items-center gap-2">
              <Users size={16} />
              <h2 className="font-semibold text-[15px]">
                Activite par utilisateur (aujourd&apos;hui)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Utilisateur
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Statut
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Sessions
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Temps total
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      Appareils
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...userStats.entries()].map(([email, s]) => (
                    <tr
                      key={email}
                      className="border-b border-[var(--line-2)] hover:bg-[#FAF8F2] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {email.split("@")[0]}
                        </div>
                        <div className="text-xs text-[var(--muted)]">
                          {email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            s.online
                              ? "bg-[var(--ok-bg)] text-[var(--ok-fg)]"
                              : "bg-[var(--surface-2)] text-[var(--muted)]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.online
                                ? "bg-[var(--ok-fg)]"
                                : "bg-[var(--muted)]"
                            }`}
                          />
                          {s.online ? "En ligne" : "Hors ligne"}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium">
                        {s.sessions}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold">
                        {formatDurationMs(s.totalMs)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--ink-2)]">
                        {[...s.devices].map((d) => (
                          <span
                            key={d}
                            className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded bg-[var(--surface-2)]"
                          >
                            <Globe size={10} />
                            {d}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                  {userStats.size === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-[var(--muted)]"
                      >
                        Aucune activite aujourd&apos;hui.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hourly chart */}
          <div className="bg-white border border-[var(--line)] rounded-[14px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--line)] flex items-center gap-2">
              <BarChart3 size={16} />
              <h2 className="font-semibold text-[15px]">
                Activite horaire (aujourd&apos;hui)
              </h2>
            </div>
            <div className="p-5">
              <div className="space-y-1.5">
                {hourlyData.map((h) => (
                  <div key={h.hour} className="flex items-center gap-3">
                    <span className="w-8 text-right text-xs text-[var(--muted)] tabular-nums">
                      {String(h.hour).padStart(2, "0")}h
                    </span>
                    <div className="flex-1 h-5 bg-[var(--surface-2)] rounded overflow-hidden">
                      {h.count > 0 && (
                        <div
                          className="h-full bg-[var(--ink)] rounded transition-all"
                          style={{
                            width: `${(h.count / maxHourly) * 100}%`,
                          }}
                        />
                      )}
                    </div>
                    <span className="w-6 text-xs text-[var(--ink-2)] tabular-nums">
                      {h.count || ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Device breakdown */}
          <div className="bg-white border border-[var(--line)] rounded-[14px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--line)] flex items-center gap-2">
              <Monitor size={16} />
              <h2 className="font-semibold text-[15px]">
                Repartition par appareil (aujourd&apos;hui)
              </h2>
            </div>
            <div className="p-5">
              {deviceEntries.length === 0 ? (
                <p className="text-[var(--muted)] text-sm text-center py-8">
                  Aucune donnee.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                  {deviceEntries.map(([key, count]) => (
                    <div
                      key={key}
                      className="flex items-center gap-3 px-4 py-3 bg-[var(--surface-2)] rounded-xl"
                    >
                      {deviceIcon(key.split(" / ")[0])}
                      <div className="flex-1">
                        <div className="text-sm font-medium">{key}</div>
                        <div className="text-xs text-[var(--muted)]">
                          {count} session{count > 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="text-lg font-semibold tabular-nums">
                        {count}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* TAB: Sessions (grouped)                         */}
      {/* ════════════════════════════════════════════════ */}
      {tab === "sessions" && (
        <div className="bg-white border border-[var(--line)] rounded-[14px] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between">
            <span className="text-xs text-[var(--muted)]">
              Les micro-sessions (&lt; 2 min d&apos;ecart, meme utilisateur + IP) sont
              regroupees automatiquement.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[950px]">
              <thead>
                <tr className="border-b border-[var(--line)]">
                  <th className="w-8 px-2" />
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
                    Debut
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Fin
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Duree
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Device
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    Brutes
                  </th>
                </tr>
              </thead>
              <tbody>
                {allGrouped.map((g, idx) => (
                  <>
                    <tr
                      key={`g-${idx}`}
                      className={`border-b border-[var(--line-2)] hover:bg-[#FAF8F2] transition-colors ${
                        g.sessions.length > 1 ? "cursor-pointer" : ""
                      }`}
                      onClick={() =>
                        g.sessions.length > 1 &&
                        setExpandedGroup(expandedGroup === idx ? null : idx)
                      }
                    >
                      <td className="px-2 text-center">
                        {g.sessions.length > 1 ? (
                          expandedGroup === idx ? (
                            <ChevronDown
                              size={14}
                              className="text-[var(--muted)]"
                            />
                          ) : (
                            <ChevronRight
                              size={14}
                              className="text-[var(--muted)]"
                            />
                          )
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            g.isOnline
                              ? "bg-[var(--ok-bg)] text-[var(--ok-fg)]"
                              : "bg-[var(--surface-2)] text-[var(--muted)]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              g.isOnline
                                ? "bg-[var(--ok-fg)]"
                                : "bg-[var(--muted)]"
                            }`}
                          />
                          {g.isOnline ? "En ligne" : "Hors ligne"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{g.email}</td>
                      <td className="px-4 py-3 text-xs font-mono text-[var(--ink-2)]">
                        {g.ip || "\u2014"}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <div>
                          {g.firstLogin.toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-[var(--muted)]">
                          {g.firstLogin.toLocaleTimeString("fr-FR")}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {g.isOnline ? (
                          <span className="text-[var(--muted)]">\u2014</span>
                        ) : (
                          <>
                            <div>
                              {g.lastActivity.toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </div>
                            <div className="text-xs text-[var(--muted)]">
                              {g.lastActivity.toLocaleTimeString("fr-FR")}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold">
                        {formatDurationMs(g.totalDurationMs)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Monitor
                            size={14}
                            className="text-[var(--muted)]"
                          />
                          <div>
                            <div className="text-xs">{g.device}</div>
                            <div className="text-xs text-[var(--muted)]">
                              {g.browser}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {g.sessions.length > 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-xs font-medium">
                            {g.sessions.length} regroupees
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">
                            1
                          </span>
                        )}
                      </td>
                    </tr>
                    {/* Expanded sub-sessions */}
                    {expandedGroup === idx &&
                      g.sessions.map((s) => (
                        <tr
                          key={s.id}
                          className="bg-[#FAF8F2] border-b border-[var(--line-2)]"
                        >
                          <td />
                          <td className="px-4 py-2">
                            <span className="text-xs text-[var(--muted)] pl-4">
                              \u2514 brute
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-[var(--muted)]">
                            {s.email.split("@")[0]}
                          </td>
                          <td className="px-4 py-2 text-xs font-mono text-[var(--muted)]">
                            {s.ip}
                          </td>
                          <td className="px-4 py-2 text-xs text-[var(--muted)] tabular-nums">
                            {formatTime(s.loginAt)}
                          </td>
                          <td className="px-4 py-2 text-xs text-[var(--muted)] tabular-nums">
                            {s.logoutAt ? formatTime(s.logoutAt) : "\u2014"}
                          </td>
                          <td className="px-4 py-2 text-xs text-[var(--muted)] tabular-nums">
                            {formatDuration(
                              s.loginAt,
                              s.logoutAt || s.lastSeen
                            )}
                          </td>
                          <td className="px-4 py-2 text-xs text-[var(--muted)]">
                            {parseDevice(s.userAgent)}{" "}
                            {parseBrowser(s.userAgent)}
                          </td>
                          <td />
                        </tr>
                      ))}
                  </>
                ))}
                {allGrouped.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
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

      {/* ════════════════════════════════════════════════ */}
      {/* TAB: Full logs                                  */}
      {/* ════════════════════════════════════════════════ */}
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
                      {l.ip || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {l.page || "\u2014"}
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
