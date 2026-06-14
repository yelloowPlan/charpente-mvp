import type { Element, ParametresProjet } from "../domain/types.ts";
import { calculerGeometrie, type GeometrieToit } from "./geometrie.ts";
import { chargeElsKNm2, porteeAdmissibleFlecheM } from "./structure.ts";

export interface ResultatNomenclature {
  elements: Element[];
  /** portée admissible d'un chevron (flèche ELS), en m — info structurelle indicative */
  porteeAdmissibleChevronM: number;
  /** nombre de pannes intermédiaires (ventrières) déduit, par pan */
  nbPannesIntermediairesParPan: number;
}

/**
 * Génère la nomenclature complète d'une charpente traditionnelle à pannes
 * sur une toiture deux pans.
 *
 * Chaque élément porte sa `formule` (traçabilité). Les pannes intermédiaires
 * sont déduites de la portée admissible du chevron (cf. structure.ts).
 */
export function genererNomenclature(
  p: ParametresProjet,
  geo?: GeometrieToit,
): ResultatNomenclature {
  const g = geo ?? calculerGeometrie(p);
  const c = p.charpente;
  const elements: Element[] = [];

  // --- Chevrons (2 pans) ---
  const nbChevronsParPan = Math.floor(g.longueurPanM / c.entraxeChevronM) + 1;
  const nbChevrons = 2 * nbChevronsParPan;
  elements.push({
    role: "chevron",
    nom: "Chevron",
    longueurM: g.rampantM,
    section: c.sections.chevron,
    quantite: nbChevrons,
    modeDebit: "barre",
    formule: `2 pans × (⌊${g.longueurPanM.toFixed(2)} / ${c.entraxeChevronM}⌋ + 1) = ${nbChevrons}`,
  });

  // --- Liteaux (rangs, sur 2 pans) ---
  const nbRangsParPan = Math.floor(g.rampantM / p.toiture.couverture.pureauM) + 1;
  const nbRangsLiteaux = 2 * nbRangsParPan;
  elements.push({
    role: "liteau",
    nom: "Liteau",
    longueurM: g.longueurPanM,
    section: c.sections.liteau,
    quantite: nbRangsLiteaux,
    modeDebit: "lineaire",
    formule: `2 pans × (⌊${g.rampantM.toFixed(2)} / ${p.toiture.couverture.pureauM}⌋ + 1) rangs = ${nbRangsLiteaux}`,
  });

  // --- Contre-liteaux (1 par chevron, dans le sens du rampant) — si écran ---
  if (c.ecranSousToiture) {
    elements.push({
      role: "contre_liteau",
      nom: "Contre-liteau",
      longueurM: g.rampantM,
      section: c.sections.contreLiteau,
      quantite: nbChevrons,
      modeDebit: "lineaire",
      formule: `1 par chevron = ${nbChevrons} (écran sous-toiture activé)`,
    });
  }

  // --- Portée admissible chevron → nombre de pannes intermédiaires ---
  const charge = chargeElsKNm2(p);
  const porteeAdmissibleChevronM = porteeAdmissibleFlecheM(
    c.sections.chevron,
    c.entraxeChevronM,
    charge,
    p.essence.moduleEMpa,
  );
  // Nombre d'appuis intermédiaires nécessaires sur le rampant (hors débord).
  const nbPannesIntermediairesParPan = Math.max(
    0,
    Math.ceil(g.rampantSansDebordM / porteeAdmissibleChevronM) - 1,
  );

  // --- Pannes ---
  elements.push({
    role: "panne_faitiere",
    nom: "Panne faîtière",
    longueurM: g.longueurPanM,
    section: c.sections.panne,
    quantite: 1,
    modeDebit: "barre",
    formule: "1 faîtière sur la longueur du pan",
  });
  elements.push({
    role: "panne_sabliere",
    nom: "Panne sablière",
    longueurM: g.longueurPanM,
    section: c.sections.panne,
    quantite: 2,
    modeDebit: "barre",
    formule: "2 sablières (une par mur de rive)",
  });
  if (nbPannesIntermediairesParPan > 0) {
    elements.push({
      role: "panne_intermediaire",
      nom: "Panne intermédiaire (ventrière)",
      longueurM: g.longueurPanM,
      section: c.sections.panne,
      quantite: 2 * nbPannesIntermediairesParPan,
      modeDebit: "barre",
      formule: `2 pans × ${nbPannesIntermediairesParPan} (portée chevron ≈ ${porteeAdmissibleChevronM.toFixed(2)} m pour respecter la flèche L/300)`,
    });
  }

  // --- Fermes ---
  const nbFermes = Math.floor(p.batiment.longueurM / c.entraxeFermeM) + 1;
  elements.push({
    role: "ferme_entrait",
    nom: "Entrait",
    longueurM: p.batiment.largeurM,
    section: c.sections.entrait,
    quantite: nbFermes,
    modeDebit: "barre",
    formule: `1 entrait × ${nbFermes} fermes (⌊${p.batiment.longueurM} / ${c.entraxeFermeM}⌋ + 1)`,
  });
  elements.push({
    role: "ferme_arbaletrier",
    nom: "Arbalétrier",
    longueurM: g.rampantSansDebordM,
    section: c.sections.arbaletrier,
    quantite: 2 * nbFermes,
    modeDebit: "barre",
    formule: `2 arbalétriers × ${nbFermes} fermes`,
  });
  elements.push({
    role: "ferme_poincon",
    nom: "Poinçon",
    longueurM: g.hauteurFaitageM,
    section: c.sections.poincon,
    quantite: nbFermes,
    modeDebit: "barre",
    formule: `1 poinçon × ${nbFermes} fermes`,
  });

  return { elements, porteeAdmissibleChevronM, nbPannesIntermediairesParPan };
}
