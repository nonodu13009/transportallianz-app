"use client";

import type {
  FicheClient as FicheData,
  KpiItem,
  SyntheseRow,
  ControleItem,
} from "@/types/fiche";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle, AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";

function spAccent(value: string): "vert" | "orange" | "rouge" | undefined {
  const num = parseFloat(value.replace(/[^0-9.,]/g, "").replace(",", "."));
  if (isNaN(num)) return undefined;
  if (num < 60) return "vert";
  if (num < 80) return "orange";
  return "rouge";
}

function KpiCard({ kpi }: { kpi: KpiItem }) {
  const accent = kpi.accent;
  const borderColor =
    accent === "vert"
      ? "border-t-emerald-500"
      : accent === "rouge"
        ? "border-t-red-500"
        : accent === "orange"
          ? "border-t-amber-500"
          : accent === "bleu"
            ? "border-t-blue-500"
            : "border-t-transparent";

  return (
    <div
      className={`bg-white border border-[var(--line)] rounded-[14px] p-5 flex flex-col justify-between min-h-[130px] border-t-[3px] ${borderColor}`}
    >
      <div className="text-xs text-[var(--muted)] tracking-wide uppercase font-medium mb-3">
        {kpi.label}
      </div>
      <div>
        <div className="text-[clamp(22px,2.5vw,32px)] font-semibold tracking-tight leading-none">
          {kpi.value}
        </div>
        {kpi.sub && (
          <div className="text-[13px] text-[var(--ink-2)] mt-2">{kpi.sub}</div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  num,
  title,
  lead,
}: {
  num: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="mt-10 mb-5">
      <h2 className="text-[22px] font-semibold tracking-tight flex items-center gap-3">
        <span className="text-xs font-semibold tracking-[0.10em] uppercase text-[var(--sage-deep)]">
          {num}
        </span>
        {title}
      </h2>
      {lead && (
        <p className="text-sm text-[var(--ink-2)] mt-1 max-w-[80ch]">{lead}</p>
      )}
    </div>
  );
}

function SpBadge({ value }: { value: string }) {
  const accent = spAccent(value);
  const bg =
    accent === "vert"
      ? "bg-[var(--ok-bg)] text-[var(--ok-fg)]"
      : accent === "orange"
        ? "bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : accent === "rouge"
          ? "bg-[var(--bad-bg)] text-[var(--bad-fg)]"
          : "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-semibold tabular-nums ${bg}`}
    >
      {value}
    </span>
  );
}

function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-[14px] border border-[var(--line)] bg-white">
      <table className="w-full border-collapse text-sm min-w-[720px]">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className={`text-left font-medium text-[11.5px] tracking-[0.08em] uppercase text-[var(--muted)] px-4 py-3 border-b border-[var(--line)] ${i > 0 ? "text-right" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default function FicheClientView({ data }: { data: FicheData }) {
  const hasRecours = Boolean(data.recoursInfo);
  const [avecRecours, setAvecRecours] = useState(false);
  const recoursOn = hasRecours && avecRecours;

  const syntheseHeaders = [
    "Annee",
    "Primes",
    "Commissions",
    "Prime nette",
    "Nb sin.",
    recoursOn ? "Sinistralite nette" : "Sinistralite",
    ...(recoursOn ? ["Recours"] : []),
    "S/P brut",
    recoursOn ? "S/P net (recours)" : "S/P net",
  ];

  return (
    <div className="max-w-[1100px] mx-auto px-6 pb-20">
      {/* ── Back button ── */}
      <div className="pt-5 pb-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
        >
          <ArrowLeft size={14} />
          Retour au portefeuille
        </Link>
      </div>

      {/* ── Hero ── */}
      <header className="bg-[var(--sage)] rounded-[22px] px-10 py-10 mt-4 overflow-hidden max-sm:px-5 max-sm:py-6 max-sm:rounded-[14px]">
        <p className="text-xs font-semibold tracking-[0.10em] uppercase text-[var(--ink-2)] mb-3">
          <span className="text-[var(--sage-deep)] mr-1">/</span>
          Reporting client transport
        </p>
        <h1 className="text-[clamp(32px,4.5vw,56px)] font-semibold leading-[1.05] tracking-[-0.025em]">
          {data.nom}
        </h1>
        {data.subtitle && (
          <p className="text-[15px] text-[var(--ink)] opacity-80 mt-3 max-w-[60ch]">
            {data.subtitle}
          </p>
        )}
      </header>

      {/* ── KPI Header ── */}
      {data.kpiHeader.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mt-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {data.kpiHeader.slice(0, 4).map((kpi, i) => (
            <KpiCard key={i} kpi={kpi} />
          ))}
        </div>
      )}

      {/* ── Alerte commerciale ── */}
      {data.alerteCommerciale && (
        <div className="mt-4 px-5 py-4 rounded-[14px] bg-[var(--warn-bg)] text-[var(--warn-fg)] text-sm font-medium border border-amber-200">
          <AlertTriangle size={16} className="inline mr-2 -mt-0.5" />
          {data.alerteCommerciale}
        </div>
      )}

      {/* ── Section 01: Fiche client ── */}
      <SectionHeader num="01" title="Fiche client" lead="Identite societe et coordonnees Lagon." />
      <div className="grid grid-cols-2 gap-px bg-[var(--line)] rounded-[14px] overflow-hidden border border-[var(--line)] max-sm:grid-cols-1">
        {data.ficheClient.map((f, i) => (
          <div key={i} className="bg-white px-5 py-4">
            <div className="text-[11.5px] text-[var(--muted)] uppercase tracking-[0.06em] font-medium mb-1">
              {f.label}
            </div>
            <div className="text-sm font-medium text-[var(--ink)]">
              {f.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Section 02: Synthese annuelle ── */}
      <SectionHeader
        num="02"
        title="Synthese annuelle"
        lead={data.syntheseAnnuelle.intro}
      />

      {/* Toggle recours (uniquement si la fiche a des recours integres) */}
      {hasRecours && data.recoursInfo && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-[14px] border border-[var(--line)] bg-white">
          <div className="flex items-center gap-2 text-[13px] text-[var(--ink-2)]">
            <RotateCcw size={15} className="text-[var(--sage-deep)]" />
            <span>
              Sinistralite : <strong>{recoursOn ? "nette de recours" : "brute"}</strong>
            </span>
          </div>
          <div className="inline-flex rounded-full border border-[var(--line)] p-0.5 bg-[var(--surface-2)]">
            <button
              type="button"
              onClick={() => setAvecRecours(false)}
              className={`px-3 py-1 text-[13px] font-medium rounded-full transition-colors ${
                !avecRecours ? "bg-white shadow-sm text-[var(--ink)]" : "text-[var(--muted)]"
              }`}
            >
              Sans recours
            </button>
            <button
              type="button"
              onClick={() => setAvecRecours(true)}
              className={`px-3 py-1 text-[13px] font-medium rounded-full transition-colors ${
                avecRecours ? "bg-white shadow-sm text-[var(--ink)]" : "text-[var(--muted)]"
              }`}
            >
              Avec recours
            </button>
          </div>
        </div>
      )}

      <DataTable headers={syntheseHeaders}>
        {data.syntheseAnnuelle.rows.map((r, i) => (
          <SyntheseTableRow key={i} row={r} recoursOn={recoursOn} />
        ))}
        {data.syntheseAnnuelle.projection && (
          <SyntheseTableRow
            row={data.syntheseAnnuelle.projection}
            isProjection
            recoursOn={recoursOn}
          />
        )}
      </DataTable>

      {/* Bandeau impact recours */}
      {recoursOn && data.recoursInfo && (
        <div className="mt-3 px-5 py-3 rounded-lg bg-[var(--ok-bg)] text-[var(--ok-fg)] text-[13px] border border-emerald-200 flex items-start gap-2">
          <CheckCircle size={16} className="mt-0.5 shrink-0" />
          <span>{data.recoursInfo.note}</span>
        </div>
      )}

      {data.syntheseAnnuelle.calloutProjection && (
        <div className="mt-3 px-5 py-3 rounded-lg bg-[var(--surface-2)] text-[13px] text-[var(--ink-2)] border border-[var(--line)]">
          {data.syntheseAnnuelle.calloutProjection}
        </div>
      )}

      {/* Chart image */}
      <ChartImage slug={data.slug} index={0} alt="Evolution S/P brut" />

      {/* ── Section 03: Sinistres ── */}
      <SectionHeader
        num="03"
        title="Detail sinistres"
        lead={data.sinistres.intro}
      />
      {data.sinistres.rows.length > 0 ? (
        <DataTable
          headers={[
            "Date",
            "Contrat",
            "N° sinistre",
            "Situation",
            "Montant",
          ]}
        >
          {data.sinistres.rows.map((r, i) => (
            <tr
              key={i}
              className="border-b border-[var(--line-2)] last:border-0"
            >
              <td className="px-4 py-3 text-sm">{r.dateSurvenance}</td>
              <td className="px-4 py-3 text-sm font-mono text-right">
                {r.contrat}
              </td>
              <td className="px-4 py-3 text-sm text-right">{r.numSinistre}</td>
              <td className="px-4 py-3 text-sm text-right">{r.situation}</td>
              <td className="px-4 py-3 text-sm text-right font-semibold tabular-nums">
                {r.montantRegle}
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <div className="px-5 py-4 rounded-[14px] bg-white border border-[var(--line)] text-sm text-[var(--muted)]">
          Aucun sinistre enregistre.
        </div>
      )}

      <ChartImage slug={data.slug} index={1} alt="Sinistres par annee" />

      {/* ── Section 04: Contrats ── */}
      <SectionHeader
        num="04"
        title="Detail contrats"
        lead={data.contrats.intro}
      />
      {data.contrats.actifs.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-[var(--ink-2)] mb-2 mt-4">
            Contrats actifs ({data.contrats.actifs.length})
          </h3>
          <DataTable
            headers={[
              "N° contrat",
              "Designation",
              "Situation",
              "Echeance",
              "Prime TTC/an",
            ]}
          >
            {data.contrats.actifs.map((r, i) => (
              <tr
                key={i}
                className="border-b border-[var(--line-2)] last:border-0"
              >
                <td className="px-4 py-3 text-sm font-mono">{r.numContrat}</td>
                <td className="px-4 py-3 text-sm text-right">
                  {r.designation}
                </td>
                <td className="px-4 py-3 text-sm text-right">{r.situation}</td>
                <td className="px-4 py-3 text-sm text-right">{r.echeance}</td>
                <td className="px-4 py-3 text-sm text-right font-semibold tabular-nums">
                  {r.primeTtcAn}
                </td>
              </tr>
            ))}
          </DataTable>
        </>
      )}

      {data.contrats.resilies && data.contrats.resilies.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-[var(--ink-2)] mb-2 mt-6">
            Contrats resilies ({data.contrats.resilies.length})
          </h3>
          <DataTable
            headers={[
              "N° contrat",
              "Designation",
              "Situation",
              "Echeance",
              "Prime TTC/an",
            ]}
          >
            {data.contrats.resilies.map((r, i) => (
              <tr
                key={i}
                className="border-b border-[var(--line-2)] last:border-0 opacity-60"
              >
                <td className="px-4 py-3 text-sm font-mono">{r.numContrat}</td>
                <td className="px-4 py-3 text-sm text-right">
                  {r.designation}
                </td>
                <td className="px-4 py-3 text-sm text-right">{r.situation}</td>
                <td className="px-4 py-3 text-sm text-right">{r.echeance}</td>
                <td className="px-4 py-3 text-sm text-right font-semibold tabular-nums">
                  {r.primeTtcAn}
                </td>
              </tr>
            ))}
          </DataTable>
        </>
      )}

      <ChartImage
        slug={data.slug}
        index={2}
        alt="Repartition prime par couverture"
      />

      {/* ── Section 05: Encaissements ── */}
      <SectionHeader
        num="05"
        title="Detail encaissements"
        lead={data.encaissements.intro}
      />
      {data.encaissements.rows.length > 0 ? (
        <DataTable
          headers={[
            "N° police",
            "Designation",
            ...data.encaissements.annees,
            "Total",
          ]}
        >
          {data.encaissements.rows.map((r, i) => (
            <tr
              key={i}
              className="border-b border-[var(--line-2)] last:border-0"
            >
              <td className="px-4 py-3 text-sm font-mono">{r.numPolice}</td>
              <td className="px-4 py-3 text-sm">{r.designation}</td>
              {data.encaissements.annees.map((a) => (
                <td
                  key={a}
                  className="px-4 py-3 text-sm text-right tabular-nums"
                >
                  {r.montantsParAnnee[a] || "—"}
                </td>
              ))}
              <td className="px-4 py-3 text-sm text-right font-semibold tabular-nums">
                {r.total}
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <div className="px-5 py-4 rounded-[14px] bg-white border border-[var(--line)] text-sm text-[var(--muted)]">
          Aucun encaissement disponible.
        </div>
      )}

      <ChartImage slug={data.slug} index={3} alt="Encaissements par annee" />

      {/* ── Section 06: Indicateurs cumul ── */}
      {data.indicateursCumul.length > 0 && (
        <>
          <SectionHeader
            num="06"
            title="Indicateurs cles (cumul)"
          />
          <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {data.indicateursCumul.map((kpi, i) => (
              <KpiCard key={i} kpi={kpi} />
            ))}
          </div>
        </>
      )}

      <ChartImage
        slug={data.slug}
        index={4}
        alt="Graphique indicateurs cumules"
      />

      {/* ── Section 07: Cadre methodologique ── */}
      <SectionHeader num="07" title="Cadre methodologique" />

      {data.methodologie.schemaEconomique && (
        <div className="bg-[var(--surface-2)] border border-[var(--line)] rounded-[14px] p-5 font-mono text-[13px] leading-relaxed text-[var(--ink-2)] whitespace-pre overflow-x-auto mb-4">
          {data.methodologie.schemaEconomique}
        </div>
      )}

      {data.methodologie.regles.length > 0 && (
        <div className="bg-white border border-[var(--line)] rounded-[14px] p-5 mb-4">
          <h3 className="text-sm font-semibold mb-3">
            Regles de traitement appliquees
          </h3>
          <ul className="space-y-2">
            {data.methodologie.regles.map((r, i) => (
              <li key={i} className="text-[13px] text-[var(--ink-2)] pl-4 relative before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[var(--sage)]">
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.methodologie.controles.length > 0 && (
        <div className="space-y-2 mb-4">
          {data.methodologie.controles.map((c, i) => (
            <ControleCallout key={i} item={c} />
          ))}
        </div>
      )}

      {data.methodologie.sources.length > 0 && (
        <div className="bg-white border border-[var(--line)] rounded-[14px] p-5">
          <h3 className="text-sm font-semibold mb-3">
            Sources et date d extraction
          </h3>
          <ul className="space-y-1">
            {data.methodologie.sources.map((s, i) => (
              <li key={i} className="text-[13px] text-[var(--ink-2)]">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="mt-10 pt-5 border-t border-[var(--line)] text-xs text-[var(--muted)] flex justify-between flex-wrap gap-2">
        <span>{data.footer.agence}</span>
        <span>Reporting genere le {data.footer.dateGeneration}</span>
      </footer>
    </div>
  );
}

function SyntheseTableRow({
  row,
  isProjection,
  recoursOn,
}: {
  row: SyntheseRow;
  isProjection?: boolean;
  recoursOn?: boolean;
}) {
  const sinistralite =
    recoursOn && row.sinistraliteNetteRecours
      ? row.sinistraliteNetteRecours
      : row.sinistralite;
  const spBrut =
    recoursOn && row.spBrutRecours ? row.spBrutRecours : row.spBrut;
  const spNet = recoursOn && row.spNetRecours ? row.spNetRecours : row.spNet;

  return (
    <tr
      className={`border-b border-[var(--line-2)] last:border-0 ${isProjection ? "bg-amber-50/60 italic" : ""}`}
    >
      <td className="px-4 py-3 text-sm font-semibold">{row.annee}</td>
      <td className="px-4 py-3 text-sm text-right tabular-nums">
        {row.primesEncaissees}
      </td>
      <td className="px-4 py-3 text-sm text-right tabular-nums">
        {row.commissions}
      </td>
      <td className="px-4 py-3 text-sm text-right tabular-nums">
        {row.primeNette}
      </td>
      <td className="px-4 py-3 text-sm text-right">{row.nbSinistres}</td>
      <td className="px-4 py-3 text-sm text-right tabular-nums">
        {sinistralite}
      </td>
      {recoursOn && (
        <td className="px-4 py-3 text-sm text-right tabular-nums text-[var(--sage-deep)]">
          {row.recours ?? "—"}
        </td>
      )}
      <td className="px-4 py-3 text-sm text-right">
        <SpBadge value={spBrut} />
      </td>
      <td className="px-4 py-3 text-sm text-right">
        {recoursOn ? <SpBadge value={spNet} /> : <span className="tabular-nums">{spNet}</span>}
      </td>
    </tr>
  );
}

function ControleCallout({ item }: { item: ControleItem }) {
  const isCheck = item.type === "check";
  return (
    <div
      className={`px-5 py-3 rounded-lg text-[13px] border flex items-start gap-2 ${
        isCheck
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-amber-50 border-amber-200 text-amber-800"
      }`}
    >
      {isCheck ? (
        <CheckCircle size={16} className="mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      )}
      <span>{item.texte}</span>
    </div>
  );
}

function ChartImage({
  slug,
  index,
  alt,
}: {
  slug: string;
  index: number;
  alt: string;
}) {
  const src = `/charts/${slug}-chart-${index}.png`;
  return (
    <div className="mt-6 mb-2 rounded-[14px] overflow-hidden border border-[var(--line)] bg-white">
      <Image
        src={src}
        alt={alt}
        width={1040}
        height={400}
        className="w-full h-auto"
        loading="lazy"
        unoptimized
      />
    </div>
  );
}
