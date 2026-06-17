import type { ParametresProjet } from "../domain/types.ts";
import { calculerGeometrie, type GeometrieToit } from "./geometrie.ts";

/**
 * Géométrie 2D du plan de charpente (vue de dessus), en mètres.
 * Repère plan : x ∈ [0, Lp] (longueur), y ∈ [0, W] (largeur).
 * Partagée par l'export SVG et l'export DXF (une seule source de vérité).
 */

export type TypeSegment =
  | "contour"
  | "faitage"
  | "chevron"
  | "ferme"
  | "aretier"
  | "noue"
  | "mur_haut";

export interface SegmentPlan {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: TypeSegment;
}

export function segmentsPlan(p: ParametresProjet, geo?: GeometrieToit): SegmentPlan[] {
  const g = geo ?? calculerGeometrie(p);
  const L = p.batiment.longueurM;
  const W = p.batiment.largeurM;
  const Lp = g.longueurPanM;
  const entraxe = p.charpente.entraxeChevronM;
  const typologie = p.toiture.typologie;
  const s: SegmentPlan[] = [];

  // Contour
  s.push({ x1: 0, y1: 0, x2: Lp, y2: 0, type: "contour" });
  s.push({ x1: Lp, y1: 0, x2: Lp, y2: W, type: "contour" });
  s.push({ x1: Lp, y1: W, x2: 0, y2: W, type: "contour" });
  s.push({ x1: 0, y1: W, x2: 0, y2: 0, type: "contour" });

  // Chevrons
  const nbChev = Math.floor(Lp / entraxe) + 1;
  for (let i = 0; i < nbChev; i++) {
    const x = (i * Lp) / (nbChev - 1 || 1);
    s.push({ x1: x, y1: 0, x2: x, y2: W, type: "chevron" });
  }

  if (typologie === "appentis") {
    s.push({ x1: 0, y1: 0, x2: Lp, y2: 0, type: "mur_haut" });
  } else if (typologie === "croupe") {
    const ridge = g.longueurFaitageM;
    const x0 = (Lp - ridge) / 2;
    const x1 = (Lp + ridge) / 2;
    s.push({ x1: x0, y1: W / 2, x2: x1, y2: W / 2, type: "faitage" });
    s.push({ x1: 0, y1: 0, x2: x0, y2: W / 2, type: "aretier" });
    s.push({ x1: 0, y1: W, x2: x0, y2: W / 2, type: "aretier" });
    s.push({ x1: Lp, y1: 0, x2: x1, y2: W / 2, type: "aretier" });
    s.push({ x1: Lp, y1: W, x2: x1, y2: W / 2, type: "aretier" });
  } else {
    s.push({ x1: 0, y1: W / 2, x2: Lp, y2: W / 2, type: "faitage" });
    const nbFermes = Math.floor(L / p.charpente.entraxeFermeM) + 1;
    const debut = (Lp - L) / 2;
    for (let j = 0; j < nbFermes; j++) {
      const x = debut + (nbFermes > 1 ? (j * L) / (nbFermes - 1) : L / 2);
      s.push({ x1: x, y1: 0, x2: x, y2: W, type: "ferme" });
    }
  }

  // Composition multi-volumes (RFC 0001) : aile perpendiculaire + noue(s).
  // L'aile sort du long pan y = W vers y = W + saillie ; son faîtage rejoint le
  // faîtage principal (y = W/2) au croisement ; noue(s) du coin rentrant au croisement.
  const compo = p.toiture.composition;
  if (compo) {
    // Lot B : largeur d'aile W2 ≤ W1. Le faîtage d'aile pénètre le pan principal à
    // la profondeur W2/2 (y = W1 − W2/2) au lieu d'atteindre le faîtage (y = W1/2).
    const W2 = compo.secondaire.largeurM;
    const xc = compo.secondaire.positionM; // x du faîtage de l'aile
    const half = W2 / 2;
    const yJ = W; // arête de jonction (long pan principal = W1)
    const yEnd = W + compo.secondaire.longueurM; // pignon de l'aile
    const yPen = W - W2 / 2; // point de pénétration sur le pan principal

    // Contour de l'aile (3 côtés ; le côté de jonction reste ouvert)
    s.push({ x1: xc - half, y1: yJ, x2: xc - half, y2: yEnd, type: "contour" });
    s.push({ x1: xc - half, y1: yEnd, x2: xc + half, y2: yEnd, type: "contour" });
    s.push({ x1: xc + half, y1: yEnd, x2: xc + half, y2: yJ, type: "contour" });

    // Faîtage de l'aile (du point de pénétration au pignon)
    s.push({ x1: xc, y1: yPen, x2: xc, y2: yEnd, type: "faitage" });

    // Chevrons de l'aile (sur la saillie franche, au-delà de la jonction)
    const S = compo.secondaire.longueurM;
    const nb = Math.floor(S / entraxe) + 1;
    for (let i = 0; i < nb; i++) {
      const yk = yJ + (nb > 1 ? (i * S) / (nb - 1) : S / 2);
      s.push({ x1: xc - half, y1: yk, x2: xc + half, y2: yk, type: "chevron" });
    }

    // Noue(s) : du coin rentrant au point de pénétration. T → 2, L → 1.
    s.push({ x1: xc - half, y1: yJ, x2: xc, y2: yPen, type: "noue" });
    if (compo.raccord === "T") {
      s.push({ x1: xc + half, y1: yJ, x2: xc, y2: yPen, type: "noue" });
    }
  }

  return s;
}
