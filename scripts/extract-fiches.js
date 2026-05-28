#!/usr/bin/env node
/**
 * Extract structured data from HTML fiche files into JSON + PNG images.
 * Usage: node scripts/extract-fiches.js
 */

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const REPORTS_DIR = path.join(__dirname, "..", "public", "reports");
const OUTPUT_DIR = path.join(__dirname, "..", "src", "data", "fiches");
const IMAGES_DIR = path.join(__dirname, "..", "public", "charts");

// Ensure output dirs exist
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(IMAGES_DIR, { recursive: true });

const files = fs
  .readdirSync(REPORTS_DIR)
  .filter((f) => f.startsWith("fiche-") && f.endsWith(".html"));

console.log(`Found ${files.length} fiche files to process.`);

for (const file of files) {
  const slug = file.replace("fiche-", "").replace(".html", "");
  console.log(`\nProcessing: ${slug}`);

  const html = fs.readFileSync(path.join(REPORTS_DIR, file), "utf-8");
  const $ = cheerio.load(html);

  try {
    const fiche = extractFiche($, slug);
    const outPath = path.join(OUTPUT_DIR, `${slug}.json`);
    fs.writeFileSync(outPath, JSON.stringify(fiche, null, 2), "utf-8");
    const sizeKB = (Buffer.byteLength(JSON.stringify(fiche)) / 1024).toFixed(1);
    console.log(`  -> ${outPath} (${sizeKB} KB)`);
  } catch (err) {
    console.error(`  ERROR processing ${slug}:`, err.message);
  }
}

// Also generate an index file
const index = files.map((f) => {
  const slug = f.replace("fiche-", "").replace(".html", "");
  const data = JSON.parse(
    fs.readFileSync(path.join(OUTPUT_DIR, `${slug}.json`), "utf-8")
  );
  return {
    slug,
    nom: data.nom,
    subtitle: data.subtitle,
  };
});
fs.writeFileSync(
  path.join(OUTPUT_DIR, "_index.json"),
  JSON.stringify(index, null, 2),
  "utf-8"
);
console.log(`\nGenerated _index.json with ${index.length} entries.`);

// ─── Extraction logic ────────────────────────────────────────────────

function extractFiche($, slug) {
  const fiche = { slug };

  // ── Name & subtitle ──
  // Try new-style first (h1 in .hero or .page)
  const h1 = $("h1").first();
  fiche.nom = cleanText(h1.text()) || slug.toUpperCase();

  const subtitle =
    $(".subtitle").first().text() ||
    $(".hero p").first().text() ||
    $("header p").first().text() ||
    "";
  fiche.subtitle = cleanText(subtitle);

  // ── KPI Header ──
  fiche.kpiHeader = extractKpis($, ".kpi-grid .kpi, .kpis .kpi");

  // If kpiHeader is empty, try the hero-area KPIs
  if (fiche.kpiHeader.length === 0) {
    fiche.kpiHeader = extractKpis($, ".kpi");
  }

  // ── Section 01: Fiche client ──
  fiche.ficheClient = [];
  $(".fiche-grid .fiche-item, .fiche-grid > div").each(function () {
    const lbl = cleanText($(this).find(".lbl").text());
    const val = cleanText($(this).find(".val").text());
    if (lbl && val) {
      fiche.ficheClient.push({ label: lbl, value: val });
    }
  });

  // Commercial alert
  const alerteEl = $(".callout.warn, .callout.alert").first();
  if (alerteEl.length) {
    fiche.alerteCommerciale = cleanText(alerteEl.text());
  }

  // ── Section 02: Synthese annuelle ──
  fiche.syntheseAnnuelle = extractSyntheseAnnuelle($, slug);

  // ── Section 03: Sinistres ──
  fiche.sinistres = extractSinistres($, slug);

  // ── Section 04: Contrats ──
  fiche.contrats = extractContrats($, slug);

  // ── Section 05: Encaissements ──
  fiche.encaissements = extractEncaissements($, slug);

  // ── Section 06: Indicateurs cumul ──
  fiche.indicateursCumul = extractIndicateursCumul($);

  // ── Section 07: Methodologie ──
  fiche.methodologie = extractMethodologie($);

  // ── Footer ──
  fiche.footer = {
    agence: cleanText($(".agence").last().text()) || "Agence Allianz Marseille : Nogaro & Boetti",
    dateGeneration: cleanText($(".footer").last().text()).replace(/.*généré le\s*/, "").replace(/\s*–.*/, "") || "28/05/2026",
  };

  // ── Extract images ──
  extractImages($, slug);

  return fiche;
}

function extractKpis($, selector) {
  const kpis = [];
  $(selector).each(function () {
    const el = $(this);
    const label = cleanText(el.find(".kpi-label").text());
    const value = cleanText(el.find(".kpi-value").text());
    const sub = cleanText(el.find(".kpi-sub").text());

    let accent = undefined;
    const cls = el.attr("class") || "";
    if (cls.includes("accent-vert")) accent = "vert";
    else if (cls.includes("accent-rouge")) accent = "rouge";
    else if (cls.includes("accent-orange")) accent = "orange";
    else if (cls.includes("accent-bleu")) accent = "bleu";

    if (label || value) {
      kpis.push({ label, value, sub: sub || undefined, accent });
    }
  });
  return kpis;
}

function extractSyntheseAnnuelle($, slug) {
  const result = {
    intro: "",
    rows: [],
    projection: undefined,
    calloutProjection: undefined,
    chartImage: undefined,
  };

  // Find section 02 intro
  const sections = $("section");
  sections.each(function () {
    const heading = $(this).find("h2").first().text();
    if (/synth[eè]se annuelle/i.test(heading) || /02/.test(heading)) {
      result.intro = cleanText($(this).find(".section-lead, p").first().text());

      // Parse table
      const table = $(this).find("table").first();
      if (table.length) {
        table.find("tbody tr").each(function () {
          const cells = [];
          $(this)
            .find("td")
            .each(function () {
              cells.push(cleanText($(this).text()));
            });

          if (cells.length >= 7) {
            const row = {
              annee: cells[0],
              primesEncaissees: cells[1],
              commissions: cells[2],
              primeNette: cells[3],
              nbSinistres: cells[4],
              sinistralite: cells[5],
              spBrut: cells[6],
              spNet: cells[7] || "",
              isProjection: $(this).hasClass("projection"),
            };
            if (row.isProjection) {
              result.projection = row;
            } else {
              result.rows.push(row);
            }
          }
        });
      }

      // Callout
      const callout = $(this).find(".callout").first();
      if (callout.length) {
        result.calloutProjection = cleanText(callout.text());
      }

      return false; // break each
    }
  });

  return result;
}

function extractSinistres($, slug) {
  const result = { intro: "", rows: [] };

  const sections = $("section");
  sections.each(function () {
    const heading = $(this).find("h2").first().text();
    if (/sinistre/i.test(heading) || /03/.test(heading)) {
      result.intro = cleanText($(this).find(".section-lead, p").first().text());

      const table = $(this).find("table").first();
      if (table.length) {
        table.find("tbody tr").each(function () {
          const cells = [];
          $(this)
            .find("td")
            .each(function () {
              cells.push(cleanText($(this).text()));
            });

          if (cells.length >= 4) {
            result.rows.push({
              dateSurvenance: cells[0],
              contrat: cells[1],
              numSinistre: cells[2] || "",
              situation: cells[3] || "",
              montantRegle: cells[4] || cells[cells.length - 1] || "",
            });
          }
        });
      }

      return false;
    }
  });

  return result;
}

function extractContrats($, slug) {
  const result = { intro: "", actifs: [], resilies: [], suspendus: [] };

  const sections = $("section");
  sections.each(function () {
    const heading = $(this).find("h2").first().text();
    if (/contrat/i.test(heading) || /04/.test(heading)) {
      result.intro = cleanText($(this).find(".section-lead, p").first().text());

      // May have multiple tables (actifs, résiliés)
      const tables = $(this).find("table");
      tables.each(function (tableIdx) {
        const category = detectContratCategory($, this, tableIdx);
        $(this)
          .find("tbody tr")
          .each(function () {
            const cells = [];
            $(this)
              .find("td")
              .each(function () {
                cells.push(cleanText($(this).text()));
              });

            if (cells.length >= 3) {
              const row = {
                numContrat: cells[0],
                designation: cells[1],
                couverture: cells.length >= 6 ? cells[2] : undefined,
                situation: cells.length >= 6 ? cells[3] : cells[2] || "",
                echeance: cells.length >= 6 ? cells[4] : cells[3] || "",
                primeTtcAn: cells[cells.length - 1] || "",
              };
              if (category === "resilies") {
                result.resilies.push(row);
              } else if (category === "suspendus") {
                result.suspendus.push(row);
              } else {
                result.actifs.push(row);
              }
            }
          });
      });

      const callout = $(this).find(".callout").first();
      if (callout.length) {
        result.callout = cleanText(callout.text());
      }

      return false;
    }
  });

  return result;
}

function detectContratCategory($, tableEl, tableIdx) {
  // Look at preceding h3 or header text
  const prevH3 = $(tableEl).prevAll("h3").first().text().toLowerCase();
  if (/resili|remplac/i.test(prevH3)) return "resilies";
  if (/suspendu/i.test(prevH3)) return "suspendus";
  if (tableIdx > 0) return "resilies";
  return "actifs";
}

function extractEncaissements($, slug) {
  const result = { intro: "", annees: [], rows: [] };

  const sections = $("section");
  sections.each(function () {
    const heading = $(this).find("h2").first().text();
    if (/encaissement|quittance/i.test(heading) || /05/.test(heading)) {
      result.intro = cleanText($(this).find(".section-lead, p").first().text());

      const table = $(this).find("table").first();
      if (table.length) {
        // Extract year columns from thead
        const headers = [];
        table.find("thead th").each(function () {
          headers.push(cleanText($(this).text()));
        });
        // Year columns are typically between the first 2 (police, designation) and last (total)
        result.annees = headers.slice(2, -1);

        table.find("tbody tr").each(function () {
          const cells = [];
          $(this)
            .find("td")
            .each(function () {
              cells.push(cleanText($(this).text()));
            });

          if (cells.length >= 3) {
            const montants = {};
            for (let i = 0; i < result.annees.length; i++) {
              montants[result.annees[i]] = cells[2 + i] || "";
            }
            result.rows.push({
              numPolice: cells[0],
              designation: cells[1],
              montantsParAnnee: montants,
              total: cells[cells.length - 1] || "",
            });
          }
        });
      }

      return false;
    }
  });

  return result;
}

function extractIndicateursCumul($) {
  // Section 06 KPIs - look for the second kpi-grid or section with "indicateur" / "06"
  const kpis = [];
  let found = false;

  $("section").each(function () {
    const heading = $(this).find("h2").first().text();
    if (/indicateur|06|cumul/i.test(heading)) {
      found = true;
      $(this)
        .find(".kpi, .kpi-grid .kpi")
        .each(function () {
          const el = $(this);
          const label = cleanText(el.find(".kpi-label").text());
          const value = cleanText(el.find(".kpi-value").text());
          const sub = cleanText(el.find(".kpi-sub").text());

          let accent = undefined;
          const cls = el.attr("class") || "";
          if (cls.includes("accent-vert") || cls.includes("vert"))
            accent = "vert";
          else if (cls.includes("accent-rouge") || cls.includes("rouge"))
            accent = "rouge";
          else if (cls.includes("accent-orange") || cls.includes("orange"))
            accent = "orange";

          if (label || value) {
            kpis.push({ label, value, sub: sub || undefined, accent });
          }
        });
      return false;
    }
  });

  return kpis;
}

function extractMethodologie($) {
  const result = {
    schemaEconomique: undefined,
    regles: [],
    controles: [],
    sources: [],
  };

  // Schema economique
  const schema = $(".economic-schema, .schema-eco, pre.schema").first();
  if (schema.length) {
    result.schemaEconomique = schema.text().trim();
  }

  // Rules
  $("section").each(function () {
    const heading = $(this).find("h2").first().text();
    if (/m[eé]thodolog|cadre|07/i.test(heading)) {
      // Regles de traitement
      $(this)
        .find("ul.clean li, .regroupement li, ul li")
        .each(function () {
          const txt = cleanText($(this).text());
          if (txt && txt.length > 10) {
            result.regles.push(txt);
          }
        });

      // Controles
      $(this)
        .find(".callout")
        .each(function () {
          const cls = $(this).attr("class") || "";
          const type = cls.includes("check") ? "check" : "warn";
          result.controles.push({
            type,
            texte: cleanText($(this).text()),
          });
        });

      // Sources
      const sourcesSection = $(this).find("h3").filter(function () {
        return /source/i.test($(this).text());
      });
      if (sourcesSection.length) {
        sourcesSection
          .next("ul")
          .find("li")
          .each(function () {
            result.sources.push(cleanText($(this).text()));
          });
      }

      return false;
    }
  });

  return result;
}

function extractImages($, slug) {
  let imgIdx = 0;
  $("img").each(function () {
    const src = $(this).attr("src") || "";
    if (src.startsWith("data:image/png;base64,")) {
      const base64 = src.replace("data:image/png;base64,", "");
      const buf = Buffer.from(base64, "base64");
      const imgPath = path.join(IMAGES_DIR, `${slug}-chart-${imgIdx}.png`);
      fs.writeFileSync(imgPath, buf);
      imgIdx++;
    }
  });
  if (imgIdx > 0) {
    console.log(`  -> Extracted ${imgIdx} chart image(s)`);
  }
}

function cleanText(str) {
  if (!str) return "";
  return str
    .replace(/\s+/g, " ")
    .replace(/\n/g, " ")
    .trim();
}
