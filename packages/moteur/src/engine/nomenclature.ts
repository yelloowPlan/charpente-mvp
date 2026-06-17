import type { Element, ParametresProjet } from "../domain/types.ts";
import {
  calculerGeometrie,
  calculerGeometrieComposee,
  type GeometrieToit,
  type GeometrieComposee,
} from "./geometrie.ts";
import { chargeElsKNm2, porteeAdmissibleFlecheM } from "./structure.ts";

export interface ResultatNomenclature {
  elements: Element[];
  /** portée admissible d'un chevron (flèche ELS), en m — info structurelle indicative */
  porteeAdmissibleChevronM: number;
  /** nombre de pannes intermédiaires (ventrières) déduit, par pan */
  nbPannesIntermediairesParPan: number;
  /** quantités estimées (vrai pour la croupe : chevrons/liteaux area-based) */
  estimation: boolean;
}

/**
 * Génère la nomenclature complète d'une charpente traditionnelle à pannes.
 *
 * Deux pans / appentis : comptages exacts. Croupe : arêtiers, faîtage raccourci
 * et sablières exacts ; chevrons et liteaux ESTIMÉS (surface ÷ entraxe / pureau).
 */
export function genererNomenclature(
  p: ParametresProjet,
  geo?: GeometrieToit,
): ResultatNomenclature {
  const g = geo ?? calculerGeometrie(p);
  const c = p.charpente;
  const elements: Element[] = [];

  // Portée admissible chevron (flèche ELS) → nombre de pannes intermédiaires.
  const charge = chargeElsKNm2(p);
  const porteeAdmissibleChevronM = porteeAdmissibleFlecheM(
    c.sections.chevron,
    c.entraxeChevronM,
    charge,
    p.essence.moduleEMpa,
  );
  const nbPannesIntermediairesParPan = Math.max(
    0,
    Math.ceil(g.rampantSansDebordM / porteeAdmissibleChevronM) - 1,
  );

  if (p.toiture.typologie === "croupe") {
    genererCroupe(p, g, elements, nbPannesIntermediairesParPan);
    return { elements, porteeAdmissibleChevronM, nbPannesIntermediairesParPan, estimation: false };
  }

  const np = g.nbPans; // 1 (appentis) ou 2 (deux pans)

  // --- Chevrons ---
  const nbChevronsParPan = Math.floor(g.longueurPanM / c.entraxeChevronM) + 1;
  const nbChevrons = np * nbChevronsParPan;
  elements.push({
    role: "chevron",
    nom: "Chevron",
    longueurM: g.rampantM,
    section: c.sections.chevron,
    quantite: nbChevrons,
    modeDebit: "barre",
    formule: `${np} pan(s) × (⌊${g.longueurPanM.toFixed(2)} / ${c.entraxeChevronM}⌋ + 1) = ${nbChevrons}`,
  });

  // --- Liteaux (rangs) ---
  const nbRangsParPan = Math.floor(g.rampantM / p.toiture.couverture.pureauM) + 1;
  const nbRangsLiteaux = np * nbRangsParPan;
  elements.push({
    role: "liteau",
    nom: "Liteau",
    longueurM: g.longueurPanM,
    section: c.sections.liteau,
    quantite: nbRangsLiteaux,
    modeDebit: "lineaire",
    formule: `${np} pan(s) × (⌊${g.rampantM.toFixed(2)} / ${p.toiture.couverture.pureauM}⌋ + 1) rangs = ${nbRangsLiteaux}`,
  });

  // --- Contre-liteaux (1 par chevron) — si écran ---
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

  // --- Pannes hautes / basses ---
  if (np === 2) {
    elements.push({ role: "panne_faitiere", nom: "Panne faîtière", longueurM: g.longueurPanM, section: c.sections.panne, quantite: 1, modeDebit: "barre", formule: "1 faîtière sur la longueur du pan" });
    elements.push({ role: "panne_sabliere", nom: "Panne sablière", longueurM: g.longueurPanM, section: c.sections.panne, quantite: 2, modeDebit: "barre", formule: "2 sablières (une par mur de rive)" });
  } else {
    elements.push({ role: "panne_faitiere", nom: "Panne haute", longueurM: g.longueurPanM, section: c.sections.panne, quantite: 1, modeDebit: "barre", formule: "1 panne haute (mur haut)" });
    elements.push({ role: "panne_sabliere", nom: "Sablière basse", longueurM: g.longueurPanM, section: c.sections.panne, quantite: 1, modeDebit: "barre", formule: "1 sablière basse (mur bas)" });
  }

  if (nbPannesIntermediairesParPan > 0) {
    elements.push({
      role: "panne_intermediaire",
      nom: "Panne intermédiaire (ventrière)",
      longueurM: g.longueurPanM,
      section: c.sections.panne,
      quantite: np * nbPannesIntermediairesParPan,
      modeDebit: "barre",
      formule: `${np} pan(s) × ${nbPannesIntermediairesParPan} (portée chevron ≈ ${porteeAdmissibleChevronM.toFixed(2)} m pour respecter la flèche L/300)`,
    });
  }

  // --- Fermes (deux pans uniquement) ---
  if (np === 2) {
    const nbFermes = Math.floor(p.batiment.longueurM / c.entraxeFermeM) + 1;
    elements.push({ role: "ferme_entrait", nom: "Entrait", longueurM: p.batiment.largeurM, section: c.sections.entrait, quantite: nbFermes, modeDebit: "barre", formule: `1 entrait × ${nbFermes} fermes (⌊${p.batiment.longueurM} / ${c.entraxeFermeM}⌋ + 1)` });
    elements.push({ role: "ferme_arbaletrier", nom: "Arbalétrier", longueurM: g.rampantSansDebordM, section: c.sections.arbaletrier, quantite: 2 * nbFermes, modeDebit: "barre", formule: `2 arbalétriers × ${nbFermes} fermes` });
    elements.push({ role: "ferme_poincon", nom: "Poinçon", longueurM: g.hauteurFaitageM, section: c.sections.poincon, quantite: nbFermes, modeDebit: "barre", formule: `1 poinçon × ${nbFermes} fermes` });
  }

  return { elements, porteeAdmissibleChevronM, nbPannesIntermediairesParPan, estimation: false };
}

/**
 * Croupe (4 pans, pente égale). Exact : 4 arêtiers, faîtage raccourci (L−W),
 * sablières du périmètre. Estimé (surface ÷ entraxe / pureau) : chevrons & liteaux.
 */
function genererCroupe(
  p: ParametresProjet,
  g: GeometrieToit,
  elements: Element[],
  nbInter: number,
): void {
  const c = p.charpente;
  const surface = g.surfaceToitureM2;

  // Layout exact de croupe régulière (pente égale) : chevrons communs + empannons.
  const W = p.batiment.largeurM;
  const d = p.batiment.debordRampantM;
  const entraxe = c.entraxeChevronM;
  const cos = Math.cos((p.toiture.penteDeg * Math.PI) / 180);
  const demi = W / 2;
  const R = g.rampantM;

  // Chevrons communs : sur la longueur de faîtage (2 longs pans) + 2 centraux de croupe
  const nCommonMain = (Math.floor(g.longueurFaitageM / entraxe) + 1) * 2;
  const nCommon = nCommonMain + 2;
  elements.push({
    role: "chevron",
    nom: "Chevron commun",
    longueurM: R,
    section: c.sections.chevron,
    quantite: nCommon,
    modeDebit: "barre",
    formule: `${nCommonMain} (longs pans, sur le faîtage) + 2 (centraux des croupes)`,
  });

  // Empannons (jacks) décroissants : 8 par position (4 régions de croupe sur les
  // longs pans + 4 demi-croupes). Longueur à la position j = (W/2 − j·entraxe + d)/cos α.
  const m = Math.max(0, Math.floor((demi - 1e-9) / entraxe));
  let totalJackMl = 0;
  for (let j = 1; j <= m; j++) totalJackMl += (demi - j * entraxe + d) / cos;
  totalJackMl *= 8;
  const totalJacks = 8 * m;
  if (totalJacks > 0) {
    elements.push({
      role: "chevron",
      nom: "Empannon",
      longueurM: totalJackMl / totalJacks,
      section: c.sections.chevron,
      quantite: totalJacks,
      modeDebit: "barre",
      formule: `8 × ${m} empannons décroissants (croupe régulière à pente égale)`,
    });
  }
  const nbChevrons = nCommon + totalJacks;

  // Liteaux (exact : la liteaunage couvre la surface développée)
  const nbRangs = Math.max(1, Math.round(surface / p.toiture.couverture.pureauM / g.longueurPanM));
  elements.push({
    role: "liteau",
    nom: "Liteau",
    longueurM: g.longueurPanM,
    section: c.sections.liteau,
    quantite: nbRangs,
    modeDebit: "lineaire",
    formule: `surface ${surface.toFixed(0)} m² ÷ pureau ${p.toiture.couverture.pureauM} m`,
  });

  // Contre-liteaux (si écran) : 1 par chevron
  if (c.ecranSousToiture) {
    elements.push({
      role: "contre_liteau",
      nom: "Contre-liteau",
      longueurM: g.rampantM,
      section: c.sections.contreLiteau,
      quantite: nbChevrons,
      modeDebit: "lineaire",
      formule: `1 par chevron = ${nbChevrons}`,
    });
  }

  // Arêtiers (exact) : 4
  elements.push({
    role: "aretier",
    nom: "Arêtier",
    longueurM: g.longueurAretierM,
    section: c.sections.arbaletrier,
    quantite: 4,
    modeDebit: "barre",
    formule: `4 arêtiers de ${g.longueurAretierM.toFixed(2)} m ((W/2)·√(2+tan²α))`,
  });

  // Faîtière raccourcie (exact), si la croupe n'est pas une pyramide
  if (g.longueurFaitageM > 0) {
    elements.push({
      role: "panne_faitiere",
      nom: "Panne faîtière",
      longueurM: g.longueurFaitageM,
      section: c.sections.panne,
      quantite: 1,
      modeDebit: "barre",
      formule: `faîtage raccourci L − W = ${g.longueurFaitageM.toFixed(2)} m`,
    });
  }

  // Sablières du périmètre (exact) : 2 longs pans + 2 croupes
  const courtSabliere = p.batiment.largeurM + 2 * p.batiment.debordRampantM;
  elements.push({ role: "panne_sabliere", nom: "Sablière (longs pans)", longueurM: g.longueurPanM, section: c.sections.panne, quantite: 2, modeDebit: "barre", formule: "2 sablières sur les longs côtés" });
  elements.push({ role: "panne_sabliere", nom: "Sablière (croupes)", longueurM: courtSabliere, section: c.sections.panne, quantite: 2, modeDebit: "barre", formule: "2 sablières sur les pans de croupe" });

  // Pannes intermédiaires sur les longs pans
  if (nbInter > 0) {
    elements.push({
      role: "panne_intermediaire",
      nom: "Panne intermédiaire (longs pans)",
      longueurM: g.longueurFaitageM > 0 ? g.longueurFaitageM : g.longueurPanM,
      section: c.sections.panne,
      quantite: 2 * nbInter,
      modeDebit: "barre",
      formule: `2 longs pans × ${nbInter} (estimé)`,
    });
  }
}

/**
 * Nomenclature d'une toiture composée multi-volumes (RFC 0001, Lot A — volumes de
 * même largeur et même pente). Stratégie ADDITIVE et CONSERVATRICE (jamais de
 * sous-commande) : nomenclature du volume principal **inchangée** + apport de l'aile
 * (deux_pans de longueur = saillie) + pièces de noue (chevron de noue + empannons).
 *
 * Au droit du raccord, les chevrons communs recoupés par la noue sont retirés de
 * façon PRUDENTE puis remplacés par les empannons : le métré reste ≥ principal
 * (jamais de sous-commande) tout en étant moins sur-évalué. Quantités discrètes
 * approchées ⇒ `estimation: true`.
 *
 * Sans `composition`, renvoie exactement la nomenclature mono-volume (rétro-compat).
 */
export function genererNomenclatureComposee(
  p: ParametresProjet,
  gc?: GeometrieComposee,
): ResultatNomenclature {
  const g = gc ?? calculerGeometrieComposee(p);
  const compo = p.toiture.composition;

  // Principal : chemin mono-volume strict (composition retirée → aucune récursion).
  const pPrincipal: ParametresProjet = {
    ...p,
    toiture: { ...p.toiture, composition: undefined },
  };
  const principal = genererNomenclature(pPrincipal, g.principal);
  if (!compo) return principal;

  const c = p.charpente;
  const W = p.batiment.largeurM;
  const S = compo.secondaire.longueurM;
  const entraxe = c.entraxeChevronM;
  const pureau = p.toiture.couverture.pureauM;
  const cos = Math.cos((p.toiture.penteDeg * Math.PI) / 180);
  const R = g.principal.rampantM;

  // Retrait des chevrons communs du pan principal recoupés par la/les noue(s) :
  // dans l'emprise de l'aile (largeur W), les chevrons du pan de jonction
  // deviennent des empannons. On en retire un nombre PRUDENT (⌊W/entraxe⌋−1, et
  // moitié pour un L à une seule noue), clampé ≥ 0. Les empannons (ajoutés plus
  // bas) les remplacent ⇒ le métré reste ≥ principal (garde anti-sous-métré
  // vérifiée par test), juste moins sur-évalué qu'avant.
  const colsEmprise = Math.max(0, Math.floor(W / entraxe) - 1);
  const retraitCommuns = compo.raccord === "T" ? colsEmprise : Math.floor(colsEmprise / 2);
  const elements = principal.elements.map((el) =>
    el.role === "chevron" && el.nom === "Chevron" && retraitCommuns > 0
      ? {
          ...el,
          quantite: Math.max(0, el.quantite - retraitCommuns),
          formule: `${el.formule} − ${retraitCommuns} recoupé(s) par la noue`,
        }
      : el,
  );

  // --- Aile : deux_pans de longueur de faîtage = saillie S ---
  const nbChevAile = 2 * (Math.floor(S / entraxe) + 1);
  elements.push({
    role: "chevron",
    nom: "Chevron (aile)",
    longueurM: R,
    section: c.sections.chevron,
    quantite: nbChevAile,
    modeDebit: "barre",
    formule: `2 pans × (⌊${S}/${entraxe}⌋ + 1) — volume secondaire (saillie ${S} m)`,
  });
  const nbRangsAile = 2 * (Math.floor(R / pureau) + 1);
  elements.push({
    role: "liteau",
    nom: "Liteau (aile)",
    longueurM: S,
    section: c.sections.liteau,
    quantite: nbRangsAile,
    modeDebit: "lineaire",
    formule: `2 pans × (⌊${R.toFixed(2)}/${pureau}⌋ + 1) rangs sur la saillie`,
  });
  if (c.ecranSousToiture) {
    elements.push({
      role: "contre_liteau",
      nom: "Contre-liteau (aile)",
      longueurM: R,
      section: c.sections.contreLiteau,
      quantite: nbChevAile,
      modeDebit: "lineaire",
      formule: `1 par chevron d'aile = ${nbChevAile}`,
    });
  }
  elements.push({
    role: "panne_faitiere",
    nom: "Panne faîtière (aile)",
    longueurM: S,
    section: c.sections.panne,
    quantite: 1,
    modeDebit: "barre",
    formule: `1 faîtière d'aile sur la saillie (${S} m)`,
  });
  elements.push({
    role: "panne_sabliere",
    nom: "Sablière (aile)",
    longueurM: S,
    section: c.sections.panne,
    quantite: 2,
    modeDebit: "barre",
    formule: `2 sablières d'aile (une par mur de rive de l'aile)`,
  });

  // --- Noue(s) : chevron de noue (reprend 2 pans → section renforcée = arbalétrier) ---
  elements.push({
    role: "noue",
    nom: "Chevron de noue",
    longueurM: g.longueurNoueM,
    section: c.sections.arbaletrier,
    quantite: g.nbNoues,
    modeDebit: "barre",
    formule: `${g.nbNoues} noue(s) de ${g.longueurNoueM.toFixed(2)} m ((W/2)·√(2+tan²α)) — section renforcée`,
  });

  // --- Empannons de noue (jacks) : 2 versants par noue, longueurs (W/2 − j·entraxe)/cos ---
  const demi = W / 2;
  const m = Math.max(0, Math.floor((demi - 1e-9) / entraxe));
  let mlParVersant = 0;
  for (let j = 1; j <= m; j++) mlParVersant += (demi - j * entraxe) / cos;
  const totalJacks = g.nbNoues * 2 * m;
  if (totalJacks > 0) {
    const totalMl = g.nbNoues * 2 * mlParVersant;
    elements.push({
      role: "chevron",
      nom: "Empannon de noue",
      longueurM: totalMl / totalJacks,
      section: c.sections.chevron,
      quantite: totalJacks,
      modeDebit: "barre",
      formule: `${g.nbNoues} noue(s) × 2 versants × ${m} empannons croissants (estimé)`,
    });
  }

  return {
    elements,
    porteeAdmissibleChevronM: principal.porteeAdmissibleChevronM,
    nbPannesIntermediairesParPan: principal.nbPannesIntermediairesParPan,
    estimation: true,
  };
}
