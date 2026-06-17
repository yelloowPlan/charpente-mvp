import type { Alerte, ParametresProjet } from "../domain/types.ts";
import { calculerGeometrie, calculerGeometrieComposee, type GeometrieToit } from "./geometrie.ts";
import {
  genererNomenclature,
  genererNomenclatureComposee,
  type ResultatNomenclature,
} from "./nomenclature.ts";
import { planifierDebit, type PlanDebit } from "./debit.ts";
import { chiffrerDevis, type Devis } from "./devis.ts";
import { contrainteFlexionMPa, fmdMPa } from "./structure.ts";

/** Erreur levée lorsqu'au moins une règle de validation bloquante échoue. */
export class ErreurValidation extends Error {
  readonly alertes: Alerte[];
  constructor(alertes: Alerte[]) {
    super("Projet invalide :\n" + alertes.map((a) => `  - ${a.message}`).join("\n"));
    this.name = "ErreurValidation";
    this.alertes = alertes;
  }
}

/** Note de calcul INDICATIVE du chevron (flèche ELS + flexion ELU simplifiées). */
export interface VerifStructure {
  porteeAdmissibleM: number; // portée entre appuis retenue (flèche L/300)
  ratioFleche: number; // L / ratio (ex. 300)
  chargeEluKNm2: number; // 1,35·G + 1,5·S
  contrainteFlexionMPa: number; // σ
  fmdMPa: number; // résistance de calcul
  tauxFlexionPct: number; // σ / f_m,d ×100
  classe: string;
}

export interface Etude {
  projet: ParametresProjet;
  geometrie: GeometrieToit;
  nomenclature: ResultatNomenclature;
  debit: PlanDebit;
  devis: Devis;
  alertes: Alerte[];
  verifStructure: VerifStructure;
}

/**
 * Valide les paramètres d'un projet. Retourne la liste des alertes (info,
 * attention, bloquant). Les bloquants empêchent le calcul.
 */
export function validerProjet(p: ParametresProjet): Alerte[] {
  const a: Alerte[] = [];
  const bloquant = (message: string) => a.push({ niveau: "bloquant", message });

  // Périmètre : typologies supportées
  const typologiesOk = ["deux_pans", "appentis", "croupe"];
  if (!typologiesOk.includes(p.toiture.typologie)) {
    bloquant("Typologies supportées : deux pans, appentis (mono-pan) ou croupe (4 pans).");
  }
  if (p.charpente.type !== "trad_pannes") {
    bloquant("MVP : seule la charpente traditionnelle à pannes est supportée (type ≠ trad_pannes).");
  }

  // Bornes géométriques
  if (!(p.toiture.penteDeg > 5 && p.toiture.penteDeg < 85)) {
    bloquant(`Pente hors bornes réalistes (${p.toiture.penteDeg}°). Attendu : 5° < pente < 85°.`);
  }
  if (!(p.batiment.largeurM > 0)) bloquant("Largeur (portée) doit être > 0.");
  if (!(p.batiment.longueurM > 0)) bloquant("Longueur du bâtiment doit être > 0.");
  if (!(p.batiment.debordRampantM >= 0)) bloquant("Débord de rampant doit être ≥ 0.");
  if (!(p.batiment.debordPignonM >= 0)) bloquant("Débord de pignon doit être ≥ 0.");

  // Entraxes & couverture
  if (!(p.charpente.entraxeChevronM > 0)) bloquant("Entraxe des chevrons doit être > 0.");
  if (!(p.charpente.entraxeFermeM > 0)) bloquant("Entraxe des fermes doit être > 0.");
  if (!(p.toiture.couverture.pureauM > 0)) bloquant("Pureau (pas de liteaunage) doit être > 0.");

  // Débit
  if (p.debit.barresCommercialesM.length === 0) {
    bloquant("Au moins une longueur commerciale de barre doit être définie.");
  }
  if (p.debit.barresCommercialesM.some((b) => !(b > 0))) {
    bloquant("Toutes les longueurs commerciales de barres doivent être > 0.");
  }
  if (!(p.debit.kerfMm >= 0)) bloquant("Le trait de scie (kerf) doit être ≥ 0.");

  // Module élastique plausible
  if (!(p.essence.moduleEMpa > 0)) bloquant("Module d'élasticité (E) doit être > 0.");
  if (!(p.charges.neigeKNm2 >= 0)) bloquant("La charge de neige doit être ≥ 0.");

  // Prix : aucun montant négatif (un prix nul est toléré)
  const prixNegatif =
    p.essence.prixM3Cents < 0 ||
    p.prix.liteauMlCents < 0 ||
    p.prix.contreLiteauMlCents < 0 ||
    p.prix.couvertureM2Cents < 0 ||
    p.prix.quincaillerieM2Cents < 0 ||
    p.prix.mainOeuvreHeureCents < 0 ||
    p.prix.heuresParM2 < 0 ||
    p.prix.tauxTvaPct < 0;
  if (prixNegatif) bloquant("Les prix et taux ne peuvent pas être négatifs.");

  // Composition multi-volumes (RFC 0001) — garde-fous d'entrée
  const compo = p.toiture.composition;
  if (compo) {
    const sec = compo.secondaire;
    const Lp = p.batiment.longueurM + 2 * p.batiment.debordPignonM;
    if (p.toiture.typologie !== "deux_pans") {
      a.push({
        niveau: "attention",
        message:
          "Toiture composée : aile ignorée — seul un volume principal « deux pans » est supporté " +
          "(Lot A). Repasser en deux pans pour l'activer.",
      });
    } else if (!(sec.longueurM > 0)) {
      bloquant("Toiture composée : la saillie de l'aile doit être > 0.");
    }
    if (!(sec.largeurM > 0)) {
      bloquant("Toiture composée : la largeur de l'aile doit être > 0.");
    } else if (sec.largeurM > p.batiment.largeurM + 1e-6) {
      a.push({
        niveau: "attention",
        message:
          `Toiture composée : aile (${sec.largeurM} m) plus large que la portée principale ` +
          `(${p.batiment.largeurM} m) — non supporté (le principal pénétrerait l'aile). ` +
          "Résultat dégradé : prévoir une aile de largeur ≤ portée principale.",
      });
    }
    if (sec.positionM < 0 || sec.positionM > Lp) {
      a.push({
        niveau: "attention",
        message: `Toiture composée : position de l'aile (${sec.positionM} m) hors du bâtiment [0 ; ${Lp.toFixed(2)} m].`,
      });
    }
  }

  // Avertissements non bloquants
  if (p.charpente.entraxeFermeM > p.batiment.longueurM) {
    a.push({
      niveau: "attention",
      message:
        "L'entraxe des fermes dépasse la longueur du bâtiment : une seule ferme de rive sera posée.",
    });
  }

  return a;
}

/**
 * Pipeline complet : validation → géométrie → nomenclature → débit → devis.
 * Lève `ErreurValidation` si au moins une règle bloquante échoue.
 */
export function etudier(p: ParametresProjet): Etude {
  const alertesValidation = validerProjet(p);
  const bloquants = alertesValidation.filter((x) => x.niveau === "bloquant");
  if (bloquants.length > 0) throw new ErreurValidation(bloquants);

  // Composition multi-volumes (RFC 0001) : géométrie/nomenclature composées et
  // surface développée totale dans le devis. Sans composition : chemin mono-volume
  // strictement inchangé (golden préservé).
  const gc =
    p.toiture.composition && p.toiture.typologie === "deux_pans"
      ? calculerGeometrieComposee(p)
      : undefined;
  const geometrie = gc
    ? { ...gc.principal, surfaceToitureM2: gc.surfaceComposeeM2 }
    : calculerGeometrie(p);
  const nomenclature = gc
    ? genererNomenclatureComposee(p, gc)
    : genererNomenclature(p, geometrie);
  const debit = planifierDebit(
    nomenclature.elements,
    p.debit.barresCommercialesM,
    p.debit.kerfMm,
  );
  const devis = chiffrerDevis(p, geometrie, nomenclature.elements, debit);

  // Agrégation des alertes : validation (hors bloquants) + débit + disclaimer.
  const alertes: Alerte[] = [
    ...alertesValidation.filter((x) => x.niveau !== "bloquant"),
    ...debit.alertes,
    {
      niveau: "info",
      message:
        `Portée admissible chevron ≈ ${nomenclature.porteeAdmissibleChevronM.toFixed(2)} m ` +
        `(flèche ELS L/300) → ${nomenclature.nbPannesIntermediairesParPan} panne(s) intermédiaire(s) par pan.`,
    },
  ];

  // Vérification de flexion ELU (indicative) au droit de la portée admissible.
  const gKNm2 = (p.toiture.couverture.poidsKgM2 * 9.81) / 1000;
  const qElu = 1.35 * gKNm2 + 1.5 * p.charges.neigeKNm2;
  const sigma = contrainteFlexionMPa(
    p.charpente.sections.chevron,
    p.charpente.entraxeChevronM,
    nomenclature.porteeAdmissibleChevronM,
    qElu,
  );
  const fmd = fmdMPa(p.essence.classe);
  const utilPct = fmd > 0 ? Math.round((sigma / fmd) * 100) : 999;
  const verifStructure: VerifStructure = {
    porteeAdmissibleM: nomenclature.porteeAdmissibleChevronM,
    ratioFleche: 300,
    chargeEluKNm2: Math.round(qElu * 1000) / 1000,
    contrainteFlexionMPa: Math.round(sigma * 100) / 100,
    fmdMPa: Math.round(fmd * 100) / 100,
    tauxFlexionPct: utilPct,
    classe: p.essence.classe,
  };
  alertes.push({
    niveau: utilPct > 100 ? "attention" : "info",
    message:
      `Flexion chevron ELU ≈ ${utilPct} % de f_m,d (${p.essence.classe}, k_mod 0,8) ` +
      `${utilPct > 100 ? "— DÉPASSEMENT : section/portée à revoir." : "— marge OK"}.`,
  });

  alertes.push({
    niveau: "info",
    message:
      "Vérifications structurelles INDICATIVES (flèche ELS + flexion ELU simplifiées). " +
      "Ne remplacent pas une note de calcul Eurocode 5 (cisaillement, déversement, " +
      "assemblages, combinaisons) — faire valider par un bureau d'études.",
  });

  if (gc) {
    const r = p.toiture.composition!.raccord;
    const nbNouesTxt = r === "croix" ? "4 noues" : r === "T" ? "2 noues" : "1 noue";
    alertes.push({
      niveau: "attention",
      message:
        `Toiture composée (raccord ${r}, ${nbNouesTxt}) : ` +
        "aile et noue(s) calculées (volumes de même largeur et même pente). Métré de la " +
        "zone de raccord ESTIMÉ et conservateur (léger sur-métré bois, jamais de sous-commande). " +
        "Le chevron de noue reprend 2 pans — section à valider par un bureau d'études.",
    });
  }

  if (geometrie.nbPans === 1) {
    alertes.push({
      niveau: "attention",
      message:
        "Appentis : les pannes reposent sur les murs de rive ; les supports intermédiaires " +
        "(poteaux/portiques) pour les grandes longueurs ne sont pas calculés en MVP.",
    });
  }

  if (p.toiture.typologie === "croupe") {
    alertes.push({
      niveau: "info",
      message:
        "Croupe régulière à pente égale : chevrons communs, empannons décroissants, " +
        "arêtiers, faîtage et sablières calculés. Les coupes composées (dévers d'arêtier) " +
        "restent à tracer par le charpentier.",
    });
    if (p.batiment.longueurM < p.batiment.largeurM) {
      alertes.push({
        niveau: "attention",
        message: "Croupe : longueur < largeur — géométrie proche d'une pyramide, faîtage nul ; estimation dégradée.",
      });
    }
  }

  return { projet: p, geometrie, nomenclature, debit, devis, alertes, verifStructure };
}
