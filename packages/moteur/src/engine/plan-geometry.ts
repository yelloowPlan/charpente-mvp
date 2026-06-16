import type { ParametresProjet } from "../domain/types.ts";
import { calculerGeometrie, type GeometrieToit } from "./geometrie.ts";

/**
 * Géométrie 2D du plan de charpente (vue de dessus), en mètres.
 * Repère plan : x ∈ [0, Lp] (longueur), y ∈ [0, W] (largeur).
 * Partagée par l'export SVG et l'export DXF (une seule source de vérité).
 */

export type TypeSegment = "contour" | "faitage" | "chevron" | "ferme" | "aretier" | "mur_haut";

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

  return s;
}
