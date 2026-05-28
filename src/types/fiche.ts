export interface FicheClient {
  slug: string;
  nom: string;
  subtitle: string; // "SAS · Transport routier · Marseille"

  kpiHeader: KpiItem[];

  ficheClient: FicheField[];
  alerteCommerciale?: string; // callout optionnel (impayés, préterme…)

  syntheseAnnuelle: {
    intro: string;
    rows: SyntheseRow[];
    projection?: SyntheseRow;
    calloutProjection?: string;
    chartImage?: string; // chemin vers PNG extrait
  };

  sinistres: {
    intro: string;
    rows: SinistreRow[];
    chartImage?: string;
  };

  contrats: {
    intro: string;
    actifs: ContratRow[];
    resilies?: ContratRow[];
    suspendus?: ContratRow[];
    callout?: string;
  };

  encaissements: {
    intro: string;
    annees: string[]; // colonnes dynamiques: ["2022","2023","2024","2025","2026"]
    rows: EncaissementRow[];
  };

  indicateursCumul: KpiItem[];

  methodologie: {
    schemaEconomique?: string; // texte monospace
    regles: string[]; // liste de règles de traitement
    controles: ControleItem[];
    sources: string[];
  };

  footer: {
    agence: string;
    dateGeneration: string;
  };
}

export interface KpiItem {
  label: string;
  value: string;
  sub?: string;
  accent?: "vert" | "rouge" | "orange" | "bleu";
}

export interface FicheField {
  label: string;
  value: string;
}

export interface SyntheseRow {
  annee: string;
  primesEncaissees: string;
  commissions: string;
  primeNette: string;
  nbSinistres: string;
  sinistralite: string;
  spBrut: string;
  spNet: string;
  isProjection?: boolean;
}

export interface SinistreRow {
  dateSurvenance: string;
  contrat: string;
  numSinistre: string;
  situation: string;
  montantRegle: string;
}

export interface ContratRow {
  numContrat: string;
  designation: string;
  couverture?: string;
  situation: string;
  echeance?: string;
  primeTtcAn: string;
}

export interface EncaissementRow {
  numPolice: string;
  designation: string;
  montantsParAnnee: Record<string, string>; // { "2022": "1 234 €", ... }
  total: string;
}

export interface ControleItem {
  type: "check" | "warn";
  texte: string;
}
