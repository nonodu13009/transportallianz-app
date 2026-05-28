"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { ArrowRight, ShieldCheck, BarChart3, Users } from "lucide-react";

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-[1440px] mx-auto px-8 pb-24 max-sm:px-4">
      {/* Topbar */}
      <header className="flex items-center justify-between py-5 border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          <span className="w-[34px] h-[34px] rounded-lg bg-[var(--ink)] text-white grid place-items-center font-bold text-lg tracking-tight">
            /A
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-[15px] tracking-tight">
              Agence Allianz Nogaro &amp; Boetti
            </span>
            <span className="text-xs text-[var(--muted)] tracking-wide">
              Kennedy/Rouviere
            </span>
          </div>
        </div>
        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--ink)] text-white text-sm font-medium hover:bg-[#2a2828] transition-colors"
            >
              Portefeuille
              <ArrowRight size={14} />
            </Link>
            <button
              onClick={logout}
              className="px-4 py-2.5 rounded-full border border-[var(--line)] bg-white text-sm font-medium hover:bg-[var(--surface-2)] transition-colors"
            >
              Deconnexion
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--ink)] text-white text-sm font-medium hover:bg-[#2a2828] transition-colors"
          >
            Se connecter
            <ArrowRight size={14} />
          </Link>
        )}
      </header>

      {/* Hero */}
      <section className="relative bg-[var(--sage)] rounded-[22px] px-14 py-14 mt-6 overflow-hidden max-sm:px-6 max-sm:py-10 max-sm:rounded-[14px]">
        <div className="absolute -right-10 -bottom-10 w-[360px] h-[360px] rounded-full bg-[var(--sage-soft)] opacity-55 max-sm:hidden" />
        <div className="absolute right-20 bottom-20 w-[180px] h-[180px] rounded-full bg-[var(--sage-deep)] opacity-25 max-sm:hidden" />
        <div className="relative z-10">
          <p className="text-xs font-semibold tracking-[0.10em] uppercase text-[var(--ink-2)] mb-5">
            <span className="text-[var(--sage-deep)] mr-1">/</span>
            Portefeuille transport / 2026
          </p>
          <h1 className="text-[clamp(40px,5.4vw,72px)] font-semibold leading-[1.02] tracking-[-0.028em] max-w-[18ch]">
            Le pilotage de vos dossiers transporteurs.
          </h1>
          <p className="mt-6 max-w-[46ch] text-[16.5px] text-[var(--ink)] opacity-85">
            Vue consolidee du portefeuille et fiches detaillees par client.
            Primes, sinistralite et S/P brut hors taxes / hors recours — sans
            interpretation, juste les chiffres.
          </p>
          <div className="flex gap-3 mt-8 flex-wrap">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--ink)] text-white text-sm font-medium border border-[var(--ink)] hover:bg-[#2a2828] transition-colors"
            >
              Acceder au portefeuille
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mt-10">
        <p className="text-xs font-semibold tracking-[0.10em] uppercase text-[var(--ink-2)] mb-4">
          <span className="text-[var(--sage-deep)] mr-1">/</span>
          Un outil au service de l agence
        </p>
        <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
          <div className="bg-white border border-[var(--line)] rounded-[14px] p-6">
            <div className="w-10 h-10 rounded-lg bg-[var(--sage)] grid place-items-center mb-4">
              <BarChart3 size={20} className="text-[var(--ink)]" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">
              Synthese portefeuille
            </h3>
            <p className="text-sm text-[var(--muted)] mt-2">
              KPI consolides, tableau comparatif des 18 clients, graphiques S/P
              et repartition de la prime annuelle.
            </p>
          </div>
          <div className="bg-white border border-[var(--line)] rounded-[14px] p-6">
            <div className="w-10 h-10 rounded-lg bg-[var(--sage)] grid place-items-center mb-4">
              <Users size={20} className="text-[var(--ink)]" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">
              18 fiches client
            </h3>
            <p className="text-sm text-[var(--muted)] mt-2">
              Reporting detaille par entreprise : sinistres, contrats,
              encaissements, indicateurs cles et cadre methodologique.
            </p>
          </div>
          <div className="bg-white border border-[var(--line)] rounded-[14px] p-6">
            <div className="w-10 h-10 rounded-lg bg-[var(--sage)] grid place-items-center mb-4">
              <ShieldCheck size={20} className="text-[var(--ink)]" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">
              Acces securise
            </h3>
            <p className="text-sm text-[var(--muted)] mt-2">
              Authentification par email ou compte Google. Donnees
              confidentielles, aucun appel externe, zero tracking tiers.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-10 pt-5 border-t border-[var(--line)] text-xs text-[var(--muted)] flex justify-between flex-wrap gap-2">
        <span>
          S/P brut = sinistralite / primes encaissees,{" "}
          <b>hors taxes / hors recours</b>. Mise a jour 28 mai 2026.
        </span>
        <span>Agence Allianz Nogaro &amp; Boetti / Kennedy-Rouviere</span>
      </footer>
    </div>
  );
}
