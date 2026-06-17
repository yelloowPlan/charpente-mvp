import type { ParametresProjet } from "../domain/types.ts";
import {
  calculerGeometrie,
  calculerGeometrieComposee,
  type GeometrieToit,
  type GeometrieComposee,
} from "./geometrie.ts";
import { genererNomenclature } from "./nomenclature.ts";

/**
 * Génère l'ossature 3D (positions des poutres en mètres) pour la visualisation.
 *
 * Données pures (aucune dépendance graphique), réutilisables pour la 3D comme
 * pour de futurs plans 2D. Repère : X = longueur du bâtiment, Y = vertical,
 * Z = largeur (portée). Origine au centre, au niveau des sablières.
 *
 * Le débord d'avant-toit est ignoré (vue structurelle lisible) ; les chevrons
 * vont de la sablière au faîtage / mur haut.
 */

export type Point3 = [number, number, number];

export type RolePoutre =
  | "chevron"
  | "sabliere"
  | "faitiere"
  | "panne"
  | "aretier"
  | "noue"
  | "entrait"
  | "arbaletrier"
  | "poincon"
  | "liteau";

export interface Poutre3D {
  role: RolePoutre;
  a: Point3;
  b: Point3;
  largeurMm: number;
  hauteurMm: number;
}

/** Pan de couverture (polygone 3D, 3 ou 4 sommets dans l'ordre). */
export interface Pan3D {
  points: Point3[];
}

/** Positions réparties et centrées sur une longueur totale (n points). */
function repartir(n: number, longueur: number): number[] {
  if (n <= 1) return [0];
  const pas = longueur / (n - 1);
  return Array.from({ length: n }, (_, i) => -longueur / 2 + i * pas);
}

export function genererOssature3D(
  p: ParametresProjet,
  geo?: GeometrieToit,
  nbPannesIntermParPan?: number,
): Poutre3D[] {
  const g = geo ?? calculerGeometrie(p);
  const nbInter =
    nbPannesIntermParPan ?? genererNomenclature(p, g).nbPannesIntermediairesParPan;
  const c = p.charpente;
  const s = c.sections;
  const W = p.batiment.largeurM;
  const L = p.batiment.longueurM;
  const Lp = g.longueurPanM;
  const h = g.hauteurFaitageM;
  const demiLp = Lp / 2;
  const poutres: Poutre3D[] = [];

  const nbChevronsParPan = Math.floor(Lp / c.entraxeChevronM) + 1;
  const xsChevrons = repartir(nbChevronsParPan, Lp);

  if (p.toiture.typologie === "croupe") {
    const dz = W / 2;
    const halfL = L / 2;
    const ridgeHalf = g.longueurFaitageM / 2;
    const secPanne = { largeurMm: s.panne.largeurMm, hauteurMm: s.panne.hauteurMm };
    const secAret = { largeurMm: s.arbaletrier.largeurMm, hauteurMm: s.arbaletrier.hauteurMm };
    const secChev = { largeurMm: s.chevron.largeurMm, hauteurMm: s.chevron.hauteurMm };

    // Faîtière raccourcie
    if (g.longueurFaitageM > 0) {
      poutres.push({ role: "faitiere", a: [-ridgeHalf, h, 0], b: [ridgeHalf, h, 0], ...secPanne });
    }
    // 4 arêtiers (coins → extrémités du faîtage)
    poutres.push({ role: "aretier", a: [halfL, 0, dz], b: [ridgeHalf, h, 0], ...secAret });
    poutres.push({ role: "aretier", a: [halfL, 0, -dz], b: [ridgeHalf, h, 0], ...secAret });
    poutres.push({ role: "aretier", a: [-halfL, 0, dz], b: [-ridgeHalf, h, 0], ...secAret });
    poutres.push({ role: "aretier", a: [-halfL, 0, -dz], b: [-ridgeHalf, h, 0], ...secAret });
    // Sablières (périmètre)
    poutres.push({ role: "sabliere", a: [-halfL, 0, dz], b: [halfL, 0, dz], ...secPanne });
    poutres.push({ role: "sabliere", a: [-halfL, 0, -dz], b: [halfL, 0, -dz], ...secPanne });
    poutres.push({ role: "sabliere", a: [halfL, 0, -dz], b: [halfL, 0, dz], ...secPanne });
    poutres.push({ role: "sabliere", a: [-halfL, 0, -dz], b: [-halfL, 0, dz], ...secPanne });
    // Chevrons centraux (longs pans, sur la longueur du faîtage)
    if (ridgeHalf > 0) {
      const nCentral = Math.max(2, Math.floor((2 * ridgeHalf) / c.entraxeChevronM) + 1);
      for (let i = 0; i < nCentral; i++) {
        const x = -ridgeHalf + (i * (2 * ridgeHalf)) / (nCentral - 1);
        poutres.push({ role: "chevron", a: [x, 0, dz], b: [x, h, 0], ...secChev });
        poutres.push({ role: "chevron", a: [x, 0, -dz], b: [x, h, 0], ...secChev });
      }
    }
    // Empannon central sur chaque croupe (rend la lecture du pan d'extrémité)
    poutres.push({ role: "chevron", a: [halfL, 0, 0], b: [ridgeHalf, h, 0], ...secChev });
    poutres.push({ role: "chevron", a: [-halfL, 0, 0], b: [-ridgeHalf, h, 0], ...secChev });
    // Pannes intermédiaires (longs pans, centrales)
    for (let i = 1; i <= nbInter; i++) {
      const t = i / (nbInter + 1);
      const z = dz * (1 - t);
      const y = h * t;
      const ext = ridgeHalf > 0 ? ridgeHalf : halfL;
      poutres.push({ role: "panne", a: [-ext, y, z], b: [ext, y, z], ...secPanne });
      poutres.push({ role: "panne", a: [-ext, y, -z], b: [ext, y, -z], ...secPanne });
    }
    return poutres;
  }

  if (g.nbPans === 2) {
    const dz = W / 2;
    // Chevrons (2 pans)
    for (const x of xsChevrons) {
      poutres.push({ role: "chevron", a: [x, 0, dz], b: [x, h, 0], largeurMm: s.chevron.largeurMm, hauteurMm: s.chevron.hauteurMm });
      poutres.push({ role: "chevron", a: [x, 0, -dz], b: [x, h, 0], largeurMm: s.chevron.largeurMm, hauteurMm: s.chevron.hauteurMm });
    }
    // Sablières
    poutres.push({ role: "sabliere", a: [-demiLp, 0, dz], b: [demiLp, 0, dz], largeurMm: s.panne.largeurMm, hauteurMm: s.panne.hauteurMm });
    poutres.push({ role: "sabliere", a: [-demiLp, 0, -dz], b: [demiLp, 0, -dz], largeurMm: s.panne.largeurMm, hauteurMm: s.panne.hauteurMm });
    // Faîtière
    poutres.push({ role: "faitiere", a: [-demiLp, h, 0], b: [demiLp, h, 0], largeurMm: s.panne.largeurMm, hauteurMm: s.panne.hauteurMm });
    // Pannes intermédiaires (par pan)
    for (let i = 1; i <= nbInter; i++) {
      const t = i / (nbInter + 1);
      const z = dz * (1 - t);
      const y = h * t;
      poutres.push({ role: "panne", a: [-demiLp, y, z], b: [demiLp, y, z], largeurMm: s.panne.largeurMm, hauteurMm: s.panne.hauteurMm });
      poutres.push({ role: "panne", a: [-demiLp, y, -z], b: [demiLp, y, -z], largeurMm: s.panne.largeurMm, hauteurMm: s.panne.hauteurMm });
    }
    // Fermes
    const nbFermes = Math.floor(L / c.entraxeFermeM) + 1;
    for (const x of repartir(nbFermes, L)) {
      poutres.push({ role: "entrait", a: [x, 0, -dz], b: [x, 0, dz], largeurMm: s.entrait.largeurMm, hauteurMm: s.entrait.hauteurMm });
      poutres.push({ role: "arbaletrier", a: [x, 0, -dz], b: [x, h, 0], largeurMm: s.arbaletrier.largeurMm, hauteurMm: s.arbaletrier.hauteurMm });
      poutres.push({ role: "arbaletrier", a: [x, 0, dz], b: [x, h, 0], largeurMm: s.arbaletrier.largeurMm, hauteurMm: s.arbaletrier.hauteurMm });
      poutres.push({ role: "poincon", a: [x, 0, 0], b: [x, h, 0], largeurMm: s.poincon.largeurMm, hauteurMm: s.poincon.hauteurMm });
    }
  } else {
    // Appentis : pente unique du mur bas (z = -W/2, y = 0) au mur haut (z = +W/2, y = h)
    const zBas = -W / 2;
    const zHaut = W / 2;
    for (const x of xsChevrons) {
      poutres.push({ role: "chevron", a: [x, 0, zBas], b: [x, h, zHaut], largeurMm: s.chevron.largeurMm, hauteurMm: s.chevron.hauteurMm });
    }
    poutres.push({ role: "sabliere", a: [-demiLp, 0, zBas], b: [demiLp, 0, zBas], largeurMm: s.panne.largeurMm, hauteurMm: s.panne.hauteurMm });
    poutres.push({ role: "faitiere", a: [-demiLp, h, zHaut], b: [demiLp, h, zHaut], largeurMm: s.panne.largeurMm, hauteurMm: s.panne.hauteurMm });
    for (let i = 1; i <= nbInter; i++) {
      const t = i / (nbInter + 1);
      const z = zBas + t * W;
      const y = h * t;
      poutres.push({ role: "panne", a: [-demiLp, y, z], b: [demiLp, y, z], largeurMm: s.panne.largeurMm, hauteurMm: s.panne.hauteurMm });
    }
  }

  return poutres;
}

/**
 * Lattage 3D (liteaux horizontaux), pour l'étape « lattage » de la visualisation.
 * Liteaux espacés du pureau le long du rampant, courant sur la longueur du pan.
 */
export function genererLattage3D(p: ParametresProjet, geo?: GeometrieToit): Poutre3D[] {
  const g = geo ?? calculerGeometrie(p);
  const W = p.batiment.largeurM;
  const Lp = g.longueurPanM;
  const h = g.hauteurFaitageM;
  const demiLp = Lp / 2;
  const pureau = p.toiture.couverture.pureauM;
  const sec = p.charpente.sections.liteau;
  const liteaux: Poutre3D[] = [];
  const rampant = g.rampantSansDebordM;
  const nRangs = Math.max(1, Math.floor(rampant / pureau));

  const ajouterRang = (x0: number, x1: number, zHaut: number, signe: number) => {
    // pan d'un côté : de la sablière (t=0) au faîtage/haut (t=1)
    for (let i = 0; i <= nRangs; i++) {
      const t = Math.min(1, (i * pureau) / rampant);
      const z = signe * zHaut * (1 - t);
      const y = h * t;
      liteaux.push({ role: "liteau", a: [x0, y, z], b: [x1, y, z], largeurMm: sec.largeurMm, hauteurMm: sec.hauteurMm });
    }
  };

  if (g.nbPans === 2) {
    ajouterRang(-demiLp, demiLp, W / 2, 1);
    ajouterRang(-demiLp, demiLp, W / 2, -1);
  } else if (p.toiture.typologie === "croupe") {
    // longs pans, région centrale (sur le faîtage)
    const ridgeHalf = g.longueurFaitageM / 2;
    const a = ridgeHalf > 0 ? -ridgeHalf : -demiLp;
    const b = ridgeHalf > 0 ? ridgeHalf : demiLp;
    ajouterRang(a, b, W / 2, 1);
    ajouterRang(a, b, W / 2, -1);
  } else {
    // appentis : pan unique de z=-W/2 (bas) à z=+W/2 (haut)
    for (let i = 0; i <= nRangs; i++) {
      const t = Math.min(1, (i * pureau) / rampant);
      const z = -W / 2 + t * W;
      const y = h * t;
      liteaux.push({ role: "liteau", a: [-demiLp, y, z], b: [demiLp, y, z], largeurMm: sec.largeurMm, hauteurMm: sec.hauteurMm });
    }
  }
  return liteaux;
}

/**
 * Pans de couverture 3D (polygones), pour l'étape « couverture » de la visualisation.
 */
export function genererCouverture3D(p: ParametresProjet, geo?: GeometrieToit): Pan3D[] {
  const g = geo ?? calculerGeometrie(p);
  const W = p.batiment.largeurM;
  const L = p.batiment.longueurM;
  const h = g.hauteurFaitageM;
  const Lp = g.longueurPanM;
  const demiLp = Lp / 2;
  const dz = W / 2;

  if (p.toiture.typologie === "croupe") {
    const halfL = L / 2;
    const r = g.longueurFaitageM / 2;
    return [
      { points: [[-halfL, 0, dz], [halfL, 0, dz], [r, h, 0], [-r, h, 0]] },
      { points: [[-halfL, 0, -dz], [halfL, 0, -dz], [r, h, 0], [-r, h, 0]] },
      { points: [[halfL, 0, dz], [halfL, 0, -dz], [r, h, 0]] },
      { points: [[-halfL, 0, dz], [-halfL, 0, -dz], [-r, h, 0]] },
    ];
  }
  if (g.nbPans === 1) {
    return [{ points: [[-demiLp, 0, -dz], [demiLp, 0, -dz], [demiLp, h, dz], [-demiLp, h, dz]] }];
  }
  return [
    { points: [[-demiLp, 0, dz], [demiLp, 0, dz], [demiLp, h, 0], [-demiLp, h, 0]] },
    { points: [[-demiLp, 0, -dz], [demiLp, 0, -dz], [demiLp, h, 0], [-demiLp, h, 0]] },
  ];
}

// ─── Composition multi-volumes (RFC 0001, Lot A4) ────────────────────────────
// Repère 3D : X = longueur, Y = vertical, Z = portée. L'aile perpendiculaire sort
// du long pan Z = −W/2 vers Z = −(W/2 + saillie) ; son faîtage court le long de Z
// à X = Xc, hauteur h. Les noues relient les coins rentrants au croisement des
// faîtages [Xc, h, 0]. Chaque générateur = principal inchangé + apports d'aile.

/** Projet réduit au volume principal (composition retirée) — évite toute récursion. */
function projetPrincipal(p: ParametresProjet): ParametresProjet {
  return { ...p, toiture: { ...p.toiture, composition: undefined } };
}

export function genererOssatureComposee3D(
  p: ParametresProjet,
  gc?: GeometrieComposee,
  nbPannesIntermParPan?: number,
): Poutre3D[] {
  const g = gc ?? calculerGeometrieComposee(p);
  const poutres = genererOssature3D(projetPrincipal(p), g.principal, nbPannesIntermParPan);
  const compo = p.toiture.composition;
  if (!compo) return poutres;

  const s = p.charpente.sections;
  const W = p.batiment.largeurM; // W1 (principal)
  const W2 = g.largeurAileM; // largeur d'aile (Lot B)
  const Lp = g.principal.longueurPanM;
  const h2 = g.hauteurAileM; // faîtage d'aile (= h1 si W2 = W1)
  const S = compo.secondaire.longueurM;
  const Xc = compo.secondaire.positionM - Lp / 2;
  const half = W2 / 2;
  const deuxNoues = compo.raccord !== "L";
  const secChev = { largeurMm: s.chevron.largeurMm, hauteurMm: s.chevron.hauteurMm };
  const secPanne = { largeurMm: s.panne.largeurMm, hauteurMm: s.panne.hauteurMm };
  const secAret = { largeurMm: s.arbaletrier.largeurMm, hauteurMm: s.arbaletrier.hauteurMm };

  const penetration = g.penetrationM; // profondeur de pénétration (Lot C : dépend de α2)
  // cote = +1 (aile arrière, z < 0) ou −1 (aile avant, z > 0 — pour la croix).
  const ajouterAile = (cote: 1 | -1) => {
    const zJ = -cote * (W / 2); // égout principal (coins rentrants)
    const zEnd = -cote * (W / 2 + S); // pignon de l'aile
    const zPen = -cote * (W / 2 - penetration); // pénétration du faîtage sur le pan principal
    poutres.push({ role: "faitiere", a: [Xc, h2, zPen], b: [Xc, h2, zEnd], ...secPanne });
    poutres.push({ role: "sabliere", a: [Xc - half, 0, zJ], b: [Xc - half, 0, zEnd], ...secPanne });
    poutres.push({ role: "sabliere", a: [Xc + half, 0, zJ], b: [Xc + half, 0, zEnd], ...secPanne });
    const nb = Math.floor(S / p.charpente.entraxeChevronM) + 1;
    for (let i = 0; i < nb; i++) {
      const z = zJ - cote * (nb > 1 ? (i * S) / (nb - 1) : S / 2);
      poutres.push({ role: "chevron", a: [Xc - half, 0, z], b: [Xc, h2, z], ...secChev });
      poutres.push({ role: "chevron", a: [Xc + half, 0, z], b: [Xc, h2, z], ...secChev });
    }
    poutres.push({ role: "noue", a: [Xc - half, 0, zJ], b: [Xc, h2, zPen], ...secAret });
    if (deuxNoues) poutres.push({ role: "noue", a: [Xc + half, 0, zJ], b: [Xc, h2, zPen], ...secAret });
  };

  ajouterAile(1);
  if (compo.raccord === "croix") ajouterAile(-1);
  return poutres;
}

export function genererLattageComposee3D(p: ParametresProjet, gc?: GeometrieComposee): Poutre3D[] {
  const g = gc ?? calculerGeometrieComposee(p);
  const liteaux = genererLattage3D(projetPrincipal(p), g.principal);
  const compo = p.toiture.composition;
  if (!compo) return liteaux;

  const sec = p.charpente.sections.liteau;
  const W = p.batiment.largeurM;
  const W2 = g.largeurAileM;
  const Lp = g.principal.longueurPanM;
  const h2 = g.hauteurAileM;
  const S = compo.secondaire.longueurM;
  const Xc = compo.secondaire.positionM - Lp / 2;
  const half = W2 / 2;
  const pureau = p.toiture.couverture.pureauM;
  const penteAile = compo.secondaire.penteDeg ?? p.toiture.penteDeg;
  const rampant = W2 / 2 / Math.cos((penteAile * Math.PI) / 180); // rampant d'aile (sans débord, α2)
  const nRangs = Math.max(1, Math.floor(rampant / pureau));
  const penetration = g.penetrationM;

  const ajouterAile = (cote: 1 | -1) => {
    const zEnd = -cote * (W / 2 + S);
    const zPen = -cote * (W / 2 - penetration);
    for (let i = 0; i <= nRangs; i++) {
      const t = Math.min(1, (i * pureau) / rampant);
      const y = h2 * t;
      const xG = Xc - half * (1 - t);
      const xD = Xc + half * (1 - t);
      liteaux.push({ role: "liteau", a: [xG, y, zPen], b: [xG, y, zEnd], largeurMm: sec.largeurMm, hauteurMm: sec.hauteurMm });
      liteaux.push({ role: "liteau", a: [xD, y, zPen], b: [xD, y, zEnd], largeurMm: sec.largeurMm, hauteurMm: sec.hauteurMm });
    }
  };
  ajouterAile(1);
  if (compo.raccord === "croix") ajouterAile(-1);
  return liteaux;
}

export function genererCouvertureComposee3D(p: ParametresProjet, gc?: GeometrieComposee): Pan3D[] {
  const g = gc ?? calculerGeometrieComposee(p);
  const pans = genererCouverture3D(projetPrincipal(p), g.principal);
  const compo = p.toiture.composition;
  if (!compo) return pans;

  const W = p.batiment.largeurM;
  const W2 = g.largeurAileM;
  const Lp = g.principal.longueurPanM;
  const h2 = g.hauteurAileM;
  const S = compo.secondaire.longueurM;
  const Xc = compo.secondaire.positionM - Lp / 2;
  const half = W2 / 2;

  const penetration = g.penetrationM;
  // Deux versants de l'aile (quadrilatères, arête haute = noue jusqu'à la pénétration).
  const ajouterAile = (cote: 1 | -1) => {
    const zJ = -cote * (W / 2);
    const zEnd = -cote * (W / 2 + S);
    const zPen = -cote * (W / 2 - penetration);
    pans.push({ points: [[Xc - half, 0, zJ], [Xc - half, 0, zEnd], [Xc, h2, zEnd], [Xc, h2, zPen]] });
    pans.push({ points: [[Xc + half, 0, zJ], [Xc + half, 0, zEnd], [Xc, h2, zEnd], [Xc, h2, zPen]] });
  };
  ajouterAile(1);
  if (compo.raccord === "croix") ajouterAile(-1);
  return pans;
}

/**
 * Lucarnes 3D (RFC 0002) — représentation indicative (faîtière + pans + face).
 * À superposer à l'ossature/couverture quel que soit le type de toiture.
 */
export function genererLucarnes3D(p: ParametresProjet): { poutres: Poutre3D[]; pans: Pan3D[] } {
  const poutres: Poutre3D[] = [];
  const pans: Pan3D[] = [];
  const lucarnes = p.toiture.lucarnes ?? [];
  if (lucarnes.length === 0) return { poutres, pans };

  const g = calculerGeometrie(projetPrincipal(p));
  const Lp = g.longueurPanM;
  const W = p.batiment.largeurM;
  const s = p.charpente.sections;
  const secPanne = { largeurMm: s.panne.largeurMm, hauteurMm: s.panne.hauteurMm };
  const secChev = { largeurMm: s.chevron.largeurMm, hauteurMm: s.chevron.hauteurMm };

  for (const luc of lucarnes) {
    const Xc = luc.positionXM - Lp / 2;
    const demi = luc.largeurM / 2;
    const hF = luc.hauteurFaceM;
    const avant = luc.cote === "avant";
    const zEave = avant ? W / 2 : -W / 2;
    const dir = avant ? -1 : 1; // vers le faîtage (|z| décroît)
    const zBack = zEave + dir * luc.avanceeM;

    // Faîtière (deux_pans) ou linteau haut (chien-assis), à hauteur hF.
    poutres.push({ role: "faitiere", a: [Xc, hF, zEave], b: [Xc, hF, zBack], ...secPanne });

    if (luc.type === "deux_pans") {
      // Fronton (face triangulaire) + 2 versants.
      pans.push({ points: [[Xc - demi, 0, zEave], [Xc + demi, 0, zEave], [Xc, hF, zEave]] });
      pans.push({ points: [[Xc - demi, 0, zEave], [Xc, hF, zEave], [Xc, hF, zBack], [Xc - demi, 0, zBack]] });
      pans.push({ points: [[Xc + demi, 0, zEave], [Xc, hF, zEave], [Xc, hF, zBack], [Xc + demi, 0, zBack]] });
      poutres.push({ role: "noue", a: [Xc - demi, 0, zEave], b: [Xc, hF, zBack], ...secChev });
      poutres.push({ role: "noue", a: [Xc + demi, 0, zEave], b: [Xc, hF, zBack], ...secChev });
    } else {
      // Chien-assis : face verticale (rectangle) + 1 versant.
      pans.push({ points: [[Xc - demi, 0, zEave], [Xc + demi, 0, zEave], [Xc + demi, hF, zEave], [Xc - demi, hF, zEave]] });
      pans.push({ points: [[Xc - demi, hF, zEave], [Xc + demi, hF, zEave], [Xc + demi, 0, zBack], [Xc - demi, 0, zBack]] });
      poutres.push({ role: "noue", a: [Xc - demi, hF, zEave], b: [Xc - demi, 0, zBack], ...secChev });
      poutres.push({ role: "noue", a: [Xc + demi, hF, zEave], b: [Xc + demi, 0, zBack], ...secChev });
    }
  }
  return { poutres, pans };
}
