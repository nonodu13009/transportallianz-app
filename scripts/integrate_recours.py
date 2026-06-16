#!/usr/bin/env python3
"""Intègre les recours encaissés (sinistres >= 3000 EUR) dans les fiches clients.

- Source : captures Lagon "Garanties sinistrées" (docs/Recours), saisies ici.
- Clé de base : n° de sinistre (n° société de la capture + n° agence composé).
- Rattachement : année de déclaration (= préfixe n° agence).
- S/P bis = max(0 ; sinistres payés - recours) / prime nette, plancher annuel.
"""
import json
import re
from collections import defaultdict
from pathlib import Path

FICHES = Path(__file__).resolve().parent.parent / "src" / "data" / "fiches"
DATA = Path(__file__).resolve().parent.parent / "src" / "data"

# slug, numSociete, numAgence, police, survenance, recours, regleAllianz, situation
RECORDS = [
    ("al-delivry", "20251697768", "202501420", "AF421121825", "02/10/2025", 7072.12, 7193.34, "Réglé"),
    ("al-delivry", "20251746055", "202501850", "AF413424414", "09/12/2025", 6610.53, 6734.65, "Réglé"),
    ("aso-transports", "20191600015", "201900916", "60641033", "02/11/2019", 1482.00, 5234.60, "Réglé"),
    ("aso-transports", "20221535543", "202200239", "60641033", "02/12/2021", 4503.06, 10661.12, "Ouvert"),
    ("aso-transports", "20231678818", "202300918", "AF413103256", "11/09/2023", 9871.26, 9984.68, "Réglé"),
    ("groupement-marseillais-de-transporteurs", "20251608458", "202500746", "AF413655131", "27/05/2025", 4361.70, 8844.63, "Réglé"),
    ("groupement-marseillais-de-transporteurs", "20251622978", "202500880", "AF413623332", "05/06/2025", 5500.00, 5718.37, "Réglé"),
    ("kfb-transports", "20231664503", "202300838", "AF406179844", "11/08/2023", 3552.00, 5332.32, "Réglé"),
    ("kfb-transports", "20231684635", "202300962", "AF413027007", "28/08/2023", 1776.00, 3460.86, "Réglé"),
    ("kfb-transports", "20241558749", "202400391", "AF413267685", "18/03/2024", 6700.00, 6903.12, "Réglé"),
    ("kfb-transports", "20241586971", "202400577", "AF406737369", "02/05/2024", 1950.00, 5190.32, "Réglé"),
    ("kfb-transports", "20241677391", "202401126", "AF413395356", "27/08/2024", 975.00, 5318.08, "Réglé"),
    ("kfb-transports", "20241690013", "202401196", "AF407775507", "17/09/2024", 9900.00, 10103.12, "Réglé"),
    ("kfb-transports", "20241713016", "202401345", "AF413395410", "18/10/2024", 1950.00, 5537.64, "Réglé"),
    ("kfb-transports", "20241759725", "202401663", "AF413027007", "19/12/2024", 1950.00, 5838.78, "Réglé"),
    ("kfb-transports", "20251648787", "202501055", "AF406179800", "24/07/2025", 2030.00, 6464.50, "Réglé"),
    ("kst-13", "20221712087", "202201170", "AF405812264", "04/11/2022", 9107.23, 7612.65, "Sans suite"),
    ("kst-13", "20241688405", "202401172", "AF413423151", "16/09/2024", 1950.00, 3072.35, "Réglé"),
    ("logestra-hexagone", "20261532181", "202600259", "AF421239483", "05/02/2026", 2030.00, 4413.92, "Réglé"),
    ("tln-express", "20251702920", "202501455", "AF413858073", "08/10/2025", 4060.00, 5849.28, "Réglé"),
    ("trans-faire", "20221551586", "202200334", "AF406123498", "23/03/2022", 8801.68, 6879.90, "Réglé"),
    ("trans-faire", "20231656198", "202300799", "AF407655677", "11/08/2023", 1776.00, 5228.31, "Réglé"),
    ("trans-faire", "20251550979", "202500355", "AF413393222", "18/03/2025", 2030.00, 2585.19, "Réglé"),
    ("trans-faire", "20251745100", "202501840", "AF413818656", "07/12/2025", 4950.00, 10113.12, "Ouvert"),
    ("trans-faire", "20251757420", "202501972", "62101583", "17/10/2025", 2030.00, 2030.00, "Réglé"),
    ("trust-transport-services", "20231542169", "202300218", "AF406738170", "03/03/2023", 10037.60, 9492.02, "Réglé"),
    ("trust-transport-services", "20231588879", "202300449", "AF407777661", "14/05/2023", 5328.00, 5913.92, "Réglé"),
    ("trust-transport-services", "20231678809", "202300917", "AF406761217", "11/09/2023", 1776.00, 6344.87, "Réglé"),
    ("trust-transport-services", "20241543636", "202400301", "AF405810826", "03/02/2024", 1950.00, 3740.35, "Réglé"),
    ("trust-transport-services", "20241543843", "202400303", "AF406721329", "01/03/2024", 1950.00, 3740.36, "Réglé"),
    ("trust-transport-services", "20251574521", "202500513", "AF405817255", "16/04/2025", 2030.00, 3835.87, "Réglé"),
    ("trust-transport-services", "20251652328", "202501081", "AF413130001", "29/07/2025", 7371.24, 7442.26, "Réglé"),
    ("trust-transport-services", "20251716714", "202501576", "AF405810832", "28/10/2025", 2030.00, 3987.00, "Réglé"),
]


def num(s):
    if s is None:
        return None
    s = str(s).replace("EUR", "").replace("€", "").strip()
    if s in ("–", "—", "-", "", "(non renseignée)"):
        return None
    s = s.replace(" ", "").replace("\xa0", "").replace(" ", "").replace(",", ".")
    s = re.sub(r"[^0-9.\-]", "", s)
    try:
        return float(s)
    except ValueError:
        return None


def fmt_eur(x, sample):
    suffix = "EUR" if "EUR" in sample else "€"
    base = f"{x:,.2f}"  # 13,682.65
    base = base.replace(",", " ").replace(".", ",")
    return f"{base} {suffix}"


def fmt_pct(ratio, sample):
    comma = ("," in sample) or ("." not in sample)
    v = f"{ratio * 100:.1f}"
    if comma:
        v = v.replace(".", ",")
    return f"{v} %"


def year_of(annee):
    m = re.match(r"(\d{4})", str(annee).strip())
    return int(m.group(1)) if m else None


def is_cumul(annee):
    a = str(annee).lower()
    return ("total" in a) or ("cumul" in a)


# ---- agrégats ----
per_year = defaultdict(lambda: defaultdict(float))   # slug -> year -> recours
per_client_total = defaultdict(float)
per_client_count = defaultdict(int)
for slug, soc, ag, pol, surv, rec, reg, sit in RECORDS:
    y = int(ag[:4])
    per_year[slug][y] += rec
    per_client_total[slug] += rec
    per_client_count[slug] += 1


def enrich_row(row, recmap, total_recours):
    """Ajoute les champs avec-recours à une ligne de synthèse (mutation)."""
    sin = num(row.get("sinistralite"))
    if sin is None:
        return
    pn = num(row.get("primeNette"))
    pb = num(row.get("primesEncaissees"))
    cumul = is_cumul(row["annee"])
    y = year_of(row["annee"])
    rec = total_recours if cumul else recmap.get(y, 0.0)
    net = max(0.0, sin - rec)
    row["recours"] = fmt_eur(rec, row.get("primeNette", "€")) if rec > 0 else "—"
    row["sinistraliteNetteRecours"] = fmt_eur(net, row.get("primeNette", "€"))
    if pb:
        row["spBrutRecours"] = fmt_pct(net / pb, row.get("spBrut", ","))
    if pn:
        row["spNetRecours"] = fmt_pct(net / pn, row.get("spNet", ","))


def main():
    client_index = []
    for slug in sorted(per_client_total):
        path = FICHES / f"{slug}.json"
        d = json.loads(path.read_text(encoding="utf-8"))
        recmap = per_year[slug]
        total = per_client_total[slug]
        sample_eur = d["syntheseAnnuelle"]["rows"][0].get("primeNette", "€")
        # repère un échantillon de format % réel (non "–")
        sample_pct = ","
        for r in d["syntheseAnnuelle"]["rows"]:
            if r.get("spNet") and any(c.isdigit() for c in r["spNet"]):
                sample_pct = r["spNet"]
                break

        # enrichit lignes + projection
        for r in d["syntheseAnnuelle"]["rows"]:
            enrich_row(r, recmap, total)
        if d["syntheseAnnuelle"].get("projection"):
            enrich_row(d["syntheseAnnuelle"]["projection"], recmap, total)

        # cumuls (lignes annuelles seulement)
        cum_pn = cum_sin = cum_net = 0.0
        for r in d["syntheseAnnuelle"]["rows"]:
            if is_cumul(r["annee"]):
                continue
            sin = num(r.get("sinistralite"))
            pn = num(r.get("primeNette"))
            if sin is None or pn is None:
                continue
            y = year_of(r["annee"])
            rec = recmap.get(y, 0.0)
            cum_pn += pn
            cum_sin += sin
            cum_net += max(0.0, sin - rec)
        sp_brut = cum_sin / cum_pn if cum_pn else 0.0
        sp_rec = cum_net / cum_pn if cum_pn else 0.0

        # Si la fiche a une ligne "Cumul/Total" préexistante, on aligne le KPI dessus
        # (les sommes par année peuvent diverger d'un cumul préexistant non recalculé).
        cumul_row = next((r for r in d["syntheseAnnuelle"]["rows"] if is_cumul(r["annee"])), None)
        if cumul_row:
            c_sin = num(cumul_row.get("sinistralite"))
            c_pn = num(cumul_row.get("primeNette"))
            c_net = num(cumul_row.get("sinistraliteNetteRecours"))
            if c_sin is not None and c_pn:
                sp_brut = c_sin / c_pn
                sp_rec = (c_net / c_pn) if c_net is not None else sp_rec
                cum_net = c_net if c_net is not None else cum_net

        d["recoursInfo"] = {
            "totalRecours": fmt_eur(total, sample_eur),
            "nbSinistres": per_client_count[slug],
            "sinistraliteNetteCumul": fmt_eur(cum_net, sample_eur),
            "spNetCumulBrut": fmt_pct(sp_brut, sample_pct),
            "spNetCumulRecours": fmt_pct(sp_rec, sample_pct),
            "note": (
                f"{per_client_count[slug]} recours encaissés (sinistres ≥ 3 000 € payés "
                f"par Allianz) déduits par année de déclaration. S/P net cumulé : "
                f"{fmt_pct(sp_brut, sample_pct)} → {fmt_pct(sp_rec, sample_pct)} avec recours."
            ),
        }

        # KPI cumul additionnels
        accent = "vert" if sp_rec < 0.60 else ("orange" if sp_rec < 0.80 else "rouge")
        d["indicateursCumul"].append({
            "label": "Recours encaissés (cumul)",
            "value": fmt_eur(total, sample_eur),
            "sub": f"{per_client_count[slug]} sinistres ≥ 3 000 €",
            "accent": "vert",
        })
        d["indicateursCumul"].append({
            "label": "S/P net cumulé (avec recours)",
            "value": fmt_pct(sp_rec, sample_pct),
            "sub": f"vs {fmt_pct(sp_brut, sample_pct)} hors recours",
            "accent": accent,
        })

        # méthodologie
        d["methodologie"]["regles"].append(
            "Recours encaissés intégrés (sinistres ≥ 3 000 € payés par Allianz), rattachés à "
            "l'année de déclaration via le n° de sinistre. Sinistralité nette = max(0 ; sinistres "
            "payés − recours) par année (plancher annuel). S/P bis = sinistralité nette ÷ prime nette."
        )
        replaced = False
        for c in d["methodologie"]["controles"]:
            if "recours" in c.get("texte", "").lower():
                c["type"] = "check"
                c["texte"] = (
                    f"✓ Recours encaissés intégrés : {per_client_count[slug]} sinistres ≥ 3 000 € "
                    f"pour {fmt_eur(total, sample_eur)}. S/P net cumulé corrigé : "
                    f"{fmt_pct(sp_brut, sample_pct)} → {fmt_pct(sp_rec, sample_pct)}."
                )
                replaced = True
                break
        if not replaced:
            d["methodologie"]["controles"].append({
                "type": "check",
                "texte": (
                    f"✓ Recours encaissés intégrés : {per_client_count[slug]} sinistres ≥ 3 000 € "
                    f"pour {fmt_eur(total, sample_eur)}."
                ),
            })
        d["methodologie"]["sources"].append(
            "Captures Lagon « Garanties sinistrées » — dossier docs/Recours (33 sinistres, 9 clients)."
        )

        path.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        client_index.append((slug, d.get("nom", slug)))
        print(f"OK {slug}: total={fmt_eur(total, sample_eur)} nb={per_client_count[slug]} "
              f"S/P {fmt_pct(sp_brut, sample_pct)} -> {fmt_pct(sp_rec, sample_pct)}")

    # recours.json (source de vérité)
    by_client = {}
    for slug, soc, ag, pol, surv, rec, reg, sit in RECORDS:
        by_client.setdefault(slug, []).append({
            "numSinistre": soc,
            "numAgence": ag,
            "police": pol,
            "anneeDeclaration": int(ag[:4]),
            "survenance": surv,
            "recours": rec,
            "regleAllianz": reg,
            "situation": sit,
        })
    out = {
        "meta": {
            "description": "Recours encaissés Allianz sur sinistres ≥ 3 000 € payés, par client transport.",
            "cle": "n° de sinistre (numSinistre société + numAgence composé)",
            "rattachement": "année de déclaration (préfixe numAgence)",
            "regleSP": "S/P bis = max(0 ; sinistres payés − recours) / prime nette, plancher annuel",
            "source": "Captures Lagon écran Garanties sinistrées (docs/Recours)",
            "nbSinistres": len(RECORDS),
            "nbClients": len(by_client),
        },
        "parClient": {
            slug: {
                "totalRecours": round(per_client_total[slug], 2),
                "nbSinistres": per_client_count[slug],
                "parAnnee": {str(y): round(v, 2) for y, v in sorted(per_year[slug].items())},
                "sinistres": by_client[slug],
            }
            for slug in sorted(by_client)
        },
        "totaux": {
            "recours": round(sum(per_client_total.values()), 2),
            "regleAllianz": round(sum(r[6] for r in RECORDS), 2),
        },
    }
    (DATA / "recours.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nrecours.json écrit : {len(RECORDS)} sinistres, {len(by_client)} clients, "
          f"total recours {out['totaux']['recours']:,.2f}")


if __name__ == "__main__":
    main()
