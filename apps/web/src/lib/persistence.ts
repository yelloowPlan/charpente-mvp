import type { ParametresProjet, Entreprise, Client } from "@charpente/moteur";

/**
 * Persistance locale des projets (localStorage).
 *
 * Conçue en fonctions pures sur une interface `Magasin` abstraite :
 *  - testable sans navigateur (faux magasin en mémoire) ;
 *  - SSR-safe : `magasinNavigateur()` retombe sur un magasin mémoire si
 *    `localStorage` est absent (Node, rendu serveur) ;
 *  - robuste : toute lecture corrompue retourne une valeur sûre (jamais d'exception).
 */

export interface ProjetEnregistre {
  id: string;
  nom: string;
  projet: ParametresProjet;
  dateMajIso: string;
}

/** Sous-ensemble de l'API Storage réellement utilisé. */
export interface Magasin {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
}

const CLE_PROJETS = "charpente.projets.v1";
const CLE_BROUILLON = "charpente.brouillon.v1";

/** Magasin réel (localStorage) ou repli mémoire si indisponible. */
export function magasinNavigateur(): Magasin {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* accès localStorage peut lever (mode privé strict) → repli */
  }
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => {
      m.set(k, v);
    },
  };
}

function ecrire(store: Magasin, cle: string, valeur: unknown): void {
  try {
    store.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* quota dépassé / indisponible → on ignore silencieusement */
  }
}

function estProjetValide(p: unknown): p is ParametresProjet {
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.batiment === "object" &&
    typeof o.toiture === "object" &&
    typeof o.charpente === "object" &&
    typeof o.essence === "object" &&
    typeof o.prix === "object" &&
    typeof o.debit === "object"
  );
}

function estEnregistrementValide(e: unknown): e is ProjetEnregistre {
  if (typeof e !== "object" || e === null) return false;
  const o = e as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.nom === "string" && estProjetValide(o.projet);
}

/** Liste des projets enregistrés (triés du plus récent au plus ancien). */
export function listerProjets(store: Magasin): ProjetEnregistre[] {
  try {
    const brut = store.getItem(CLE_PROJETS);
    if (!brut) return [];
    const data: unknown = JSON.parse(brut);
    if (!Array.isArray(data)) return [];
    return data
      .filter(estEnregistrementValide)
      .sort((a, b) => b.dateMajIso.localeCompare(a.dateMajIso));
  } catch {
    return [];
  }
}

/**
 * Enregistre (ou met à jour, par nom) un projet. Retourne la nouvelle liste.
 * `genId` est injectable pour des tests déterministes.
 */
export function enregistrerProjet(
  store: Magasin,
  nom: string,
  projet: ParametresProjet,
  dateMajIso: string,
  genId: () => string = () => crypto.randomUUID(),
): ProjetEnregistre[] {
  const liste = listerProjets(store);
  const existant = liste.find((p) => p.nom === nom);
  const nouvelle = existant
    ? liste.map((p) => (p.nom === nom ? { ...p, projet, dateMajIso } : p))
    : [...liste, { id: genId(), nom, projet, dateMajIso }];
  ecrire(store, CLE_PROJETS, nouvelle);
  return listerProjets(store);
}

/** Supprime un projet par id. Retourne la nouvelle liste. */
export function supprimerProjet(store: Magasin, id: string): ProjetEnregistre[] {
  const liste = listerProjets(store).filter((p) => p.id !== id);
  ecrire(store, CLE_PROJETS, liste);
  return liste;
}

/** Sauvegarde le projet de travail courant (auto-save, restauré au refresh). */
export function sauverBrouillon(store: Magasin, projet: ParametresProjet): void {
  ecrire(store, CLE_BROUILLON, projet);
}

/** Recharge le projet de travail courant, ou null si absent/corrompu. */
export function chargerBrouillon(store: Magasin): ParametresProjet | null {
  try {
    const brut = store.getItem(CLE_BROUILLON);
    if (!brut) return null;
    const p: unknown = JSON.parse(brut);
    return estProjetValide(p) ? p : null;
  } catch {
    return null;
  }
}

/* ---------- profil entreprise (en-tête de devis) ---------- */

const CLE_ENTREPRISE = "charpente.entreprise.v1";
const CHAMPS_ENTREPRISE = [
  "raisonSociale",
  "adresse",
  "codePostal",
  "ville",
  "siret",
  "telephone",
  "email",
] as const;

/** Entreprise « vide » (tous champs à la chaîne vide). */
export function entrepriseVide(): Entreprise {
  return { raisonSociale: "", adresse: "", codePostal: "", ville: "", siret: "", telephone: "", email: "" };
}

function estEntreprise(e: unknown): e is Entreprise {
  if (typeof e !== "object" || e === null) return false;
  const o = e as Record<string, unknown>;
  return CHAMPS_ENTREPRISE.every((k) => typeof o[k] === "string");
}

export function sauverEntreprise(store: Magasin, e: Entreprise): void {
  ecrire(store, CLE_ENTREPRISE, e);
}

export function chargerEntreprise(store: Magasin): Entreprise | null {
  try {
    const brut = store.getItem(CLE_ENTREPRISE);
    if (!brut) return null;
    const e: unknown = JSON.parse(brut);
    return estEntreprise(e) ? e : null;
  } catch {
    return null;
  }
}

/* ---------- document de devis (client + n° + validité) ---------- */

const CLE_DOCUMENT = "charpente.document.v1";

export interface DocumentDevis {
  client: Client;
  numeroDevis: string;
  validiteJours: number;
}

export function documentVide(): DocumentDevis {
  return {
    client: { nom: "", adresse: "", codePostal: "", ville: "" },
    numeroDevis: "",
    validiteJours: 30,
  };
}

function estClient(c: unknown): c is Client {
  if (typeof c !== "object" || c === null) return false;
  const o = c as Record<string, unknown>;
  return ["nom", "adresse", "codePostal", "ville"].every((k) => typeof o[k] === "string");
}

function estDocument(d: unknown): d is DocumentDevis {
  if (typeof d !== "object" || d === null) return false;
  const o = d as Record<string, unknown>;
  return estClient(o.client) && typeof o.numeroDevis === "string" && typeof o.validiteJours === "number";
}

export function sauverDocument(store: Magasin, doc: DocumentDevis): void {
  ecrire(store, CLE_DOCUMENT, doc);
}

export function chargerDocument(store: Magasin): DocumentDevis | null {
  try {
    const brut = store.getItem(CLE_DOCUMENT);
    if (!brut) return null;
    const d: unknown = JSON.parse(brut);
    return estDocument(d) ? d : null;
  } catch {
    return null;
  }
}
