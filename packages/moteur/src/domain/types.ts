/**
 * Modèle de données du moteur paramétrique de charpente (MVP).
 *
 * Conventions d'unités — IMPÉRATIVES et cohérentes dans tout le moteur :
 *  - longueurs        : mètres (m)
 *  - sections de bois : millimètres (mm)
 *  - surfaces         : mètres carrés (m²)
 *  - volumes          : mètres cubes (m³)
 *  - charges          : kN/m²
 *  - argent / prix    : centimes d'euro (entiers) — JAMAIS de flottant sur l'argent
 *  - pente / angles   : degrés
 *
 * Convention de section : `hauteurMm` est la dimension VERTICALE de la pièce
 * (celle qui travaille en flexion) ; `largeurMm` est la dimension horizontale.
 */

export interface Section {
  /** b — dimension horizontale (mm) */
  largeurMm: number;
  /** h — dimension verticale, reprise de flexion (mm) */
  hauteurMm: number;
}

/** Typologies de toiture supportées. */
export type TypeToiture = "deux_pans" | "appentis" | "croupe";

/** Type de raccord d'un volume secondaire (RFC 0001). L → 1 noue, T → 2 noues. */
export type TypeRaccord = "L" | "T";

/**
 * Volume secondaire greffé perpendiculairement au volume principal (RFC 0001, Lot A).
 * Lot A : même largeur (portée) et même pente que le principal → faîtages à même
 * hauteur, noues régulières à 45°.
 */
export interface VolumeSecondaire {
  /** largeur (portée) du volume greffé — Lot A : doit égaler la largeur principale */
  largeurM: number;
  /** saillie : longueur du volume hors du corps principal (m) */
  longueurM: number;
  /** position du faîtage secondaire le long du faîtage principal, depuis le pignon gauche (m) */
  positionM: number;
}

/** Composition multi-volumes déclarée (RFC 0001). Absent ⇒ toiture mono-volume. */
export interface Composition {
  raccord: TypeRaccord;
  secondaire: VolumeSecondaire;
}

/** Types de charpente. MVP : `trad_pannes` uniquement. */
export type TypeCharpente = "trad_pannes" | "fermette";

/**
 * Mode de débit d'un élément :
 *  - "barre"    : pièce rigide, pas d'aboutage (chevron, arbalétrier, entrait, panne…)
 *  - "lineaire" : compté au mètre linéaire, aboutage admis (liteau, contre-liteau)
 */
export type ModeDebit = "barre" | "lineaire";

export interface Couverture {
  /** ex: "tuile_mecanique", "ardoise" */
  type: string;
  /** pas de liteaunage (distance entre liteaux), en m */
  pureauM: number;
  /** poids surfacique de la couverture, en kg/m² */
  poidsKgM2: number;
}

export interface ParametresBatiment {
  /** L — longueur au niveau des sablières (m) */
  longueurM: number;
  /** W — portée entre sablières (m) */
  largeurM: number;
  /** d — avant-toit (débord), mesuré en projection horizontale (m) */
  debordRampantM: number;
  /** dp — débord en about de pignon (m) */
  debordPignonM: number;
}

export interface SectionsBois {
  chevron: Section;
  panne: Section;
  arbaletrier: Section;
  entrait: Section;
  poincon: Section;
  liteau: Section;
  contreLiteau: Section;
}

export interface ParametresCharpente {
  type: TypeCharpente;
  /** e_ch — entraxe des chevrons (m) */
  entraxeChevronM: number;
  /** e_f — entraxe des fermes (m) */
  entraxeFermeM: number;
  /** true → écran sous-toiture ventilé → contre-lattage (contre-liteaux) */
  ecranSousToiture: boolean;
  sections: SectionsBois;
}

export interface Charges {
  /** charge de neige caractéristique S (kN/m²) — dépend zone/altitude (EN 1991-1-3) */
  neigeKNm2: number;
  /** zone de neige (EN 1991-1-3 / NA) — optionnel, pour l'assistant de calcul */
  zoneNeige?: string;
  /** altitude du chantier (m) — optionnel, pour l'assistant de calcul */
  altitudeM?: number;
}

export interface Essence {
  /** ex "Sapin/Épicéa" */
  nom: string;
  /** classe de résistance, ex "C24" */
  classe: string;
  /** E0,mean — module d'élasticité moyen (MPa = N/mm²) */
  moduleEMpa: number;
  /** prix du bois de structure (centimes /m³) */
  prixM3Cents: number;
}

export interface PrixUnitaires {
  liteauMlCents: number;
  contreLiteauMlCents: number;
  couvertureM2Cents: number;
  quincaillerieM2Cents: number;
  mainOeuvreHeureCents: number;
  /** ratio main-d'œuvre, en heures par m² de toiture */
  heuresParM2: number;
  /** taux de TVA applicable (%) — ex 10 (rénovation) ou 20 (neuf) */
  tauxTvaPct: number;
}

export interface OptionsDebit {
  /** longueurs commerciales de barres disponibles (m) */
  barresCommercialesM: number[];
  /** trait de scie (perte par coupe), en mm */
  kerfMm: number;
}

export interface ParametresProjet {
  batiment: ParametresBatiment;
  toiture: {
    typologie: TypeToiture;
    penteDeg: number;
    couverture: Couverture;
    /** composition multi-volumes (RFC 0001) — absent ⇒ toiture mono-volume */
    composition?: Composition;
  };
  charpente: ParametresCharpente;
  charges: Charges;
  essence: Essence;
  prix: PrixUnitaires;
  debit: OptionsDebit;
}

export type RoleElement =
  | "chevron"
  | "liteau"
  | "contre_liteau"
  | "panne_faitiere"
  | "panne_sabliere"
  | "panne_intermediaire"
  | "aretier"
  | "noue"
  | "ferme_entrait"
  | "ferme_arbaletrier"
  | "ferme_poincon";

export interface Element {
  role: RoleElement;
  nom: string;
  /** longueur unitaire d'une pièce (m) */
  longueurM: number;
  section: Section;
  /** nombre de pièces identiques */
  quantite: number;
  modeDebit: ModeDebit;
  /** traçabilité : explication de la quantité / longueur (affichée à l'utilisateur) */
  formule: string;
}

/** Niveau de gravité d'une alerte remontée à l'utilisateur. */
export type NiveauAlerte = "info" | "attention" | "bloquant";

export interface Alerte {
  niveau: NiveauAlerte;
  message: string;
}

/** Identité de l'entreprise, pour l'en-tête des devis (tous champs optionnels). */
export interface Entreprise {
  raisonSociale: string;
  adresse: string;
  codePostal: string;
  ville: string;
  siret: string;
  telephone: string;
  email: string;
}

/** Client destinataire du devis (tous champs optionnels). */
export interface Client {
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
}
