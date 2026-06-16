import type { ParametresProjet } from "../domain/types.ts";
import { calculerGeometrie, type GeometrieToit } from "./geometrie.ts";
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
  | "entrait"
  | "arbaletrier"
  | "poincon";

export interface Poutre3D {
  role: RolePoutre;
  a: Point3;
  b: Point3;
  largeurMm: number;
  hauteurMm: number;
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
