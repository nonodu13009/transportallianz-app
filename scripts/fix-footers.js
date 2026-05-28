const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "src", "data", "fiches");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json") && f !== "_index.json");

for (const f of files) {
  const fp = path.join(dir, f);
  const d = JSON.parse(fs.readFileSync(fp, "utf-8"));

  let dg = d.footer.dateGeneration || "";
  // Remove agence name if duplicated
  dg = dg.replace(/Agence Allianz[^.]*?(Boetti|H\d+\))\s*/g, "").trim();
  dg = dg.replace(/Document gen[eé]r[eé] le\s*/i, "").trim();
  dg = dg.replace(/\s*[—–-]\s*Donn[eé]es.*$/i, "").trim();
  if (!dg) dg = "28/05/2026";
  d.footer.dateGeneration = dg;
  d.footer.agence = "Agence Allianz Marseille : Nogaro & Boetti";

  fs.writeFileSync(fp, JSON.stringify(d, null, 2), "utf-8");
  console.log(f + ": " + dg);
}
