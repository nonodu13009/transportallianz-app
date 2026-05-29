"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Download, Users } from "lucide-react";
import indexData from "@/data/fiches/_index.json";

interface NavbarProps {
  activePage: "accueil" | "synthese" | "client";
  activeSlug?: string;
}

export default function Navbar({ activePage, activeSlug }: NavbarProps) {
  const [open, setOpen] = useState(false);

  const activeClient = activeSlug
    ? indexData.find((c) => c.slug === activeSlug)
    : null;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--line)] px-6 flex items-center gap-4 h-14 max-sm:px-3 max-sm:gap-2">
      {/* Brand */}
      <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
        <span className="w-9 h-9 rounded-lg bg-[var(--ink)] text-white grid place-items-center text-xs font-bold tracking-wider">
          /A
        </span>
        <span className="hidden sm:flex flex-col leading-tight">
          <span className="text-[13px] font-semibold text-[var(--ink)]">
            Agence Allianz Nogaro &amp; Boetti
          </span>
          <span className="text-[11px] text-[var(--muted)]">
            Corniche / Portefeuille Transport
          </span>
        </span>
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-1 ml-4 max-sm:ml-auto">
        <Link
          href="/dashboard"
          className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
            activePage === "synthese"
              ? "bg-[var(--ink)] text-white"
              : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-2)]"
          }`}
        >
          Synthese portefeuille
        </Link>

        {/* Client dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              activePage === "client"
                ? "bg-[var(--ink)] text-white"
                : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-2)]"
            }`}
          >
            {activeClient ? activeClient.nom : "Clients"}
            <ChevronDown size={12} />
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
              />
              <div className="absolute top-full left-0 mt-2 w-80 max-h-[70vh] overflow-y-auto bg-white rounded-xl border border-[var(--line)] shadow-xl z-50">
                {indexData.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/client/${c.slug}`}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-2.5 text-sm hover:bg-[var(--line-2)] transition-colors border-b border-[var(--line-2)] last:border-0 ${
                      c.slug === activeSlug
                        ? "bg-[var(--sage)]/10 font-semibold"
                        : ""
                    }`}
                  >
                    {c.nom}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line-2)] transition-colors"
        >
          <Download size={14} />
          Export
        </button>
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium bg-[var(--ink)] text-white">
          <Users size={14} />
          Kennedy/Rouviere
        </span>
      </div>
    </header>
  );
}
