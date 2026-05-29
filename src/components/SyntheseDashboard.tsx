"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import syntheseData from "@/data/synthese.json";
import indexData from "@/data/fiches/_index.json";

function getNom(slug: string): string {
  return indexData.find((c) => c.slug === slug)?.nom ?? slug;
}

function spClass(value: number): string {
  if (value < 60) return "bg-[var(--ok-bg)] text-[var(--ok-fg)]";
  if (value < 80) return "bg-[var(--warn-bg)] text-[var(--warn-fg)]";
  return "bg-[var(--bad-bg)] text-[var(--bad-fg)]";
}

function SpBadge({ value, bold }: { value: number; bold?: boolean }) {
  const formatted = value.toFixed(1).replace(".", ",") + " %";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[13px] font-semibold tabular-nums ${spClass(value)}`}
    >
      {bold ? <b>{formatted}</b> : formatted}
    </span>
  );
}

export default function SyntheseDashboard() {
  const { meta, kpis, clients, donut } = syntheseData;

  const barData = [...clients].sort((a, b) => a.spBrut - b.spBrut);

  return (
    <div className="max-w-[1320px] mx-auto px-6 pb-20 max-sm:px-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] text-[var(--muted)] pt-4 pb-2">
        <Link href="/dashboard" className="hover:text-[var(--ink)]">
          Accueil
        </Link>
        <span>/</span>
        <span className="text-[var(--ink)] font-medium">
          Synthese portefeuille
        </span>
      </div>

      {/* Page head */}
      <div className="flex flex-wrap items-start justify-between gap-6 mt-2 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.10em] uppercase text-[var(--muted)] mb-4">
            <span className="text-[var(--sage-deep)] mr-1">/</span>
            Vue consolidee
          </p>
          <h1 className="text-[clamp(32px,4.5vw,52px)] font-semibold leading-[1.05] tracking-[-0.025em]">
            Synthese portefeuille
            <br />
            transport
          </h1>
        </div>
        <div className="max-w-[520px]">
          <p className="text-[15px] text-[var(--ink-2)] leading-relaxed">
            Consolidation des 18 dossiers transport suivis par l&apos;agence.
            Les ratios S/P sont calcules{" "}
            <b>brut, hors recours et hors commissions</b>, sur l&apos;ensemble
            des contrats actifs et resilies.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-[13px] text-[var(--muted)]">
            <span>
              <b className="text-[var(--ink)]">Periode</b> / {meta.periode}
            </span>
            <span>
              <b className="text-[var(--ink)]">Devise</b> / {meta.devise}
            </span>
            <span>
              <b className="text-[var(--ink)]">Mise a jour</b> /{" "}
              {meta.miseAJour}
            </span>
          </div>
        </div>
      </div>

      {/* KPI section label */}
      <p className="text-xs font-semibold tracking-[0.10em] uppercase text-[var(--muted)] mb-3">
        <span className="text-[var(--sage-deep)] mr-1">/</span>
        Indicateurs consolides
      </p>

      {/* KPI row 1 */}
      <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <KpiCard label="Clients transport" value={String(kpis.nbClients)} sub="SAS / SARL / EI" />
        <KpiCard
          label="Prime portefeuille TTC / an"
          value={`${kpis.primePortefeuille} \u20AC`}
          sub="en cours, base annuelle"
          tnum
        />
        <KpiCard
          label="Primes encaissees / cumul"
          value={`${kpis.primesEncaissees} \u20AC`}
          sub="toutes annees confondues"
          tnum
        />
        <KpiCard
          label="Sinistralite brute cumulee"
          value={`${kpis.sinistraliteBrute} \u20AC`}
          sub="hors recours / hors commissions"
          tnum
        />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-3 mt-3 max-sm:grid-cols-1">
        {/* S/P brut consolide */}
        <div className="bg-[var(--sage)]/20 border border-[var(--line)] rounded-[14px] p-5 flex flex-col justify-between min-h-[130px]">
          <div className="text-xs text-[var(--muted)] tracking-wide uppercase font-medium mb-3">
            S/P brut consolide
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <span
              className={`inline-flex items-center px-4 py-2 rounded-full text-xl font-bold tabular-nums ${spClass(parseFloat(kpis.spBrutConsolide.replace(",", ".")))}`}
            >
              {kpis.spBrutConsolide} %
            </span>
            <span className="text-[13px] text-[var(--ink-2)] max-w-[28ch]">
              Ratio sinistres / primes encaissees, brut hors recours hors
              commissions, cumule portefeuille.
            </span>
          </div>
        </div>

        {/* Volume */}
        <div className="bg-white border border-[var(--line)] rounded-[14px] p-5 flex flex-col justify-between min-h-[130px]">
          <div className="text-xs text-[var(--muted)] tracking-wide uppercase font-medium mb-3">
            Volume
          </div>
          <div className="flex gap-8">
            <div>
              <div className="text-[32px] font-semibold tabular-nums leading-none">
                {kpis.contratsActifs}
              </div>
              <div className="text-[13px] text-[var(--muted)] mt-1">
                Contrats actifs
              </div>
            </div>
            <div>
              <div className="text-[32px] font-semibold tabular-nums leading-none">
                {kpis.sinistresReels}
              </div>
              <div className="text-[13px] text-[var(--muted)] mt-1">
                Sinistres reels
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CLIENT TABLE ── */}
      <section className="mt-10">
        <p className="text-xs font-semibold tracking-[0.10em] uppercase text-[var(--muted)] mb-3">
          <span className="text-[var(--sage-deep)] mr-1">/</span>
          Detail par client
        </p>

        <div className="bg-white border border-[var(--line)] rounded-[14px] p-2 pb-3">
          <div className="flex items-start justify-between px-4 pt-3 pb-2">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Tableau recapitulatif clients
              </h2>
              <p className="text-[13px] text-[var(--muted)] mt-1">
                Cliquez sur une ligne pour ouvrir la fiche detaillee
              </p>
            </div>
            <span className="text-[13px] text-[var(--muted)]">
              {kpis.nbClients} clients / {meta.periode}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm min-w-[800px]">
              <thead>
                <tr>
                  <th className="text-left font-medium text-[11.5px] tracking-[0.08em] uppercase text-[var(--muted)] px-4 py-3 border-b border-[var(--line)]">
                    Client
                  </th>
                  <th className="text-left font-medium text-[11.5px] tracking-[0.08em] uppercase text-[var(--muted)] px-4 py-3 border-b border-[var(--line)]">
                    Ville
                  </th>
                  <th className="text-right font-medium text-[11.5px] tracking-[0.08em] uppercase text-[var(--muted)] px-4 py-3 border-b border-[var(--line)]">
                    Contrats actifs
                  </th>
                  <th className="text-right font-medium text-[11.5px] tracking-[0.08em] uppercase text-[var(--muted)] px-4 py-3 border-b border-[var(--line)]">
                    Prime TTC/an
                  </th>
                  <th className="text-right font-medium text-[11.5px] tracking-[0.08em] uppercase text-[var(--muted)] px-4 py-3 border-b border-[var(--line)]">
                    Primes encaissees
                  </th>
                  <th className="text-right font-medium text-[11.5px] tracking-[0.08em] uppercase text-[var(--muted)] px-4 py-3 border-b border-[var(--line)]">
                    Sinistralite
                  </th>
                  <th className="text-right font-medium text-[11.5px] tracking-[0.08em] uppercase text-[var(--muted)] px-4 py-3 border-b border-[var(--line)]">
                    S/P brut
                  </th>
                  <th className="w-12 border-b border-[var(--line)]" />
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.slug}
                    className="border-b border-[var(--line-2)] last:border-0 hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/client/${c.slug}`}
                        className="block"
                      >
                        <div className="font-semibold text-[var(--ink)]">
                          {getNom(c.slug)}
                        </div>
                        <div className="text-[12px] text-[var(--muted)]">
                          {c.forme} / {c.ville}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{c.ville}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      {c.contratsActifs}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      {c.primeTtcAn} &euro;
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      {c.primesEncaissees} &euro;
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">
                      {c.sinistralite} &euro;
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SpBadge value={c.spBrut} />
                    </td>
                    <td className="px-4 py-3 text-center text-[var(--muted)]">
                      <Link href={`/client/${c.slug}`}>
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="bg-[var(--surface-2)]">
                  <td className="px-4 py-3">
                    <div className="font-semibold">Total portefeuille</div>
                    <div className="text-[12px] text-[var(--muted)]">
                      consolide / {kpis.nbClients} clients
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">&mdash;</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                    {kpis.contratsActifs}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                    {kpis.primePortefeuille} &euro;
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                    {kpis.primesEncaissees} &euro;
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                    {kpis.sinistraliteBrute} &euro;
                  </td>
                  <td className="px-4 py-3 text-right">
                    <SpBadge
                      value={parseFloat(
                        kpis.spBrutConsolide.replace(",", ".")
                      )}
                      bold
                    />
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── CHARTS ── */}
      <section className="mt-10 grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        {/* Bar chart S/P */}
        <div className="bg-white border border-[var(--line)] rounded-[14px] p-5">
          <p className="text-xs font-semibold tracking-[0.10em] uppercase text-[var(--muted)] mb-1">
            <span className="text-[var(--sage-deep)] mr-1">/</span>
            Comparatif
          </p>
          <h2 className="text-lg font-semibold tracking-tight mb-5">
            S/P brut par client
          </h2>

          <div className="space-y-2">
            {barData.map((c) => (
              <div key={c.slug} className="flex items-center gap-3">
                <div className="w-[200px] shrink-0 text-right">
                  <div className="text-[12px] font-medium text-[var(--ink)] leading-tight truncate">
                    {getNom(c.slug)}
                  </div>
                  <div className="text-[11px] text-[var(--muted)]">
                    {c.ville}
                  </div>
                </div>
                <div className="flex-1 h-5 bg-[var(--line-2)] rounded-sm relative">
                  <div
                    className={`h-full rounded-sm ${c.spBrut < 60 ? "bg-[var(--ok-fg)]/60" : c.spBrut < 80 ? "bg-[var(--warn-fg)]/60" : "bg-[var(--bad-fg)]/60"}`}
                    style={{ width: `${Math.min(c.spBrut, 100)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-px bg-[var(--ink)]/30"
                    style={{ left: "100%" }}
                  />
                </div>
                <div className="w-14 text-right text-[13px] tabular-nums font-medium">
                  {c.spBrut.toFixed(1).replace(".", ",")} %
                </div>
              </div>
            ))}
            {/* Consolide line */}
            <div className="flex items-center gap-3 pt-3 mt-2 border-t border-dashed border-[var(--line)]">
              <div className="w-[200px] shrink-0 text-right">
                <div className="text-[12px] font-bold text-[var(--ink)]">
                  Consolide
                </div>
                <div className="text-[11px] text-[var(--muted)]">
                  portefeuille transport
                </div>
              </div>
              <div className="flex-1 h-5 bg-[var(--line-2)] rounded-sm relative">
                <div
                  className="h-full rounded-sm bg-[var(--ok-fg)]/60"
                  style={{
                    width: `${parseFloat(kpis.spBrutConsolide.replace(",", "."))}%`,
                  }}
                />
              </div>
              <div className="w-14 text-right text-[13px] tabular-nums font-bold">
                {kpis.spBrutConsolide} %
              </div>
            </div>
          </div>

          {/* Scale */}
          <div className="flex justify-between mt-3 text-[11px] text-[var(--muted)] pl-[212px] pr-14">
            <span>0 %</span>
            <span>25 %</span>
            <span>50 %</span>
            <span>75 %</span>
            <span>100 %</span>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-[var(--line-2)] flex-wrap">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-[var(--ok-bg)] text-[var(--ok-fg)]">
              &le; 60 % sain
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-[var(--warn-bg)] text-[var(--warn-fg)]">
              60-80 % a surveiller
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-[var(--bad-bg)] text-[var(--bad-fg)]">
              &gt; 80 % eleve
            </span>
          </div>
        </div>

        {/* Donut chart */}
        <div className="bg-white border border-[var(--line)] rounded-[14px] p-5">
          <p className="text-xs font-semibold tracking-[0.10em] uppercase text-[var(--muted)] mb-1">
            <span className="text-[var(--sage-deep)] mr-1">/</span>
            Repartition
          </p>
          <h2 className="text-lg font-semibold tracking-tight mb-4">
            Prime portefeuille
          </h2>

          <div className="flex flex-col items-center gap-6">
            <svg
              width="220"
              height="220"
              viewBox="0 0 200 200"
              role="img"
              aria-label="Repartition prime portefeuille"
            >
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#EFEBE0"
                strokeWidth="28"
              />
              {donut.segments.map((seg, i) => (
                <circle
                  key={i}
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="28"
                  strokeDasharray={seg.dasharray}
                  strokeDashoffset={seg.dashoffset}
                  transform="rotate(-90 100 100)"
                  strokeLinecap="butt"
                />
              ))}
              <text
                x="100"
                y="92"
                textAnchor="middle"
                fontWeight="600"
                fontSize="22"
                fill="#1C1B1B"
                letterSpacing="-0.5"
              >
                {donut.total}
              </text>
              <text
                x="100"
                y="114"
                textAnchor="middle"
                fontWeight="500"
                fontSize="11"
                fill="#767372"
                letterSpacing="1"
              >
                EUR TTC / AN
              </text>
            </svg>

            {/* Legend */}
            <div className="w-full space-y-2">
              {donut.segments.map((seg, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-[13px]"
                >
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ background: seg.color }}
                  />
                  <span className="flex-1 text-[var(--ink-2)] truncate">
                    {seg.slug ? getNom(seg.slug) : (seg as { label?: string }).label}
                  </span>
                  <span className="tabular-nums text-[var(--ink)] font-medium">
                    {seg.value} &euro;
                  </span>
                  <span className="tabular-nums text-[var(--muted)] w-14 text-right">
                    {seg.pct} %
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-3 text-[13px] pt-2 border-t border-[var(--line-2)]">
                <span className="w-3" />
                <span className="flex-1 font-bold">Total portefeuille</span>
                <span className="tabular-nums font-bold">
                  {donut.total} &euro;
                </span>
                <span className="w-14" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footnote */}
      <footer className="mt-10 pt-5 border-t border-[var(--line)] text-xs text-[var(--muted)] flex justify-between flex-wrap gap-2">
        <span>
          S/P brut = sinistralite / primes encaissees,{" "}
          <b>hors recours / hors commissions</b>. Donnees portefeuille, mise a
          jour {meta.miseAJour}.
        </span>
        <span>Agence Allianz Marseille : Nogaro &amp; Boetti</span>
      </footer>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tnum,
}: {
  label: string;
  value: string;
  sub: string;
  tnum?: boolean;
}) {
  return (
    <div className="bg-white border border-[var(--line)] rounded-[14px] p-5 flex flex-col justify-between min-h-[130px]">
      <div className="text-xs text-[var(--muted)] tracking-wide uppercase font-medium mb-3">
        {label}
      </div>
      <div>
        <div
          className={`text-[clamp(22px,2.5vw,32px)] font-semibold tracking-tight leading-none ${tnum ? "tabular-nums" : ""}`}
        >
          {value}
        </div>
        <div className="text-[13px] text-[var(--ink-2)] mt-2">{sub}</div>
      </div>
    </div>
  );
}
