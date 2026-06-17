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

  // Composition multi-volumes (RFC 0001). Lot B : largeur d'aile W2 ≤ W1, le faîtage
  // d'aile pénètre le pan principal à la profondeur W2/2. croix = 2 ailes opposées.
  const compo = p.toiture.composition;
  if (compo) {
    const W2 = Math.min(compo.secondaire.largeurM, W); // plafonné à la portée principale
    const xc = compo.secondaire.positionM;
    const S = compo.secondaire.longueurM;
    const half = W2 / 2;
    const deuxNoues = compo.raccord !== "L"; // L → 1 noue, T/croix → 2 par aile
    // Lot C : pénétration dépend de la pente d'aile α2 (= principal si absent).
    const tan1 = Math.tan((p.toiture.penteDeg * Math.PI) / 180);
    const tan2 = Math.tan(((compo.secondaire.penteDeg ?? p.toiture.penteDeg) * Math.PI) / 180);
    const dPen = Math.min((W2 / 2) * (tan2 / tan1), W / 2);

    // Dessine une aile sur un côté : cote = +1 (sort par y=W, arrière), −1 (par y=0, avant).
    const ajouterAile = (cote: 1 | -1) => {
      const yJ = cote === 1 ? W : 0; // arête de jonction (égout principal)
      const yEnd = yJ + cote * S; // pignon de l'aile
      const yPen = yJ - cote * dPen; // pénétration sur le pan principal
      s.push({ x1: xc - half, y1: yJ, x2: xc - half, y2: yEnd, type: "contour" });
      s.push({ x1: xc - half, y1: yEnd, x2: xc + half, y2: yEnd, type: "contour" });
      s.push({ x1: xc + half, y1: yEnd, x2: xc + half, y2: yJ, type: "contour" });
      s.push({ x1: xc, y1: yPen, x2: xc, y2: yEnd, type: "faitage" });
      const nb = Math.floor(S / entraxe) + 1;
      for (let i = 0; i < nb; i++) {
        const yk = yJ + cote * (nb > 1 ? (i * S) / (nb - 1) : S / 2);
        s.push({ x1: xc - half, y1: yk, x2: xc + half, y2: yk, type: "chevron" });
      }
      s.push({ x1: xc - half, y1: yJ, x2: xc, y2: yPen, type: "noue" });
      if (deuxNoues) s.push({ x1: xc + half, y1: yJ, x2: xc, y2: yPen, type: "noue" });
    };

    ajouterAile(1);
    if (compo.raccord === "croix") ajouterAile(-1);
  }

  // Lucarnes (RFC 0002) — glyphe sur le pan : face d'égout, faîtage et noues.
  for (const luc of p.toiture.lucarnes ?? []) {
    const xc = luc.positionXM;
    const demi = luc.largeurM / 2;
    const avant = luc.cote === "avant";
    const yEave = avant ? 0 : W;
    const yEnd = avant
      ? Math.min(luc.avanceeM, W / 2)
      : Math.max(W - luc.avanceeM, W / 2);

    s.push({ x1: xc - demi, y1: yEave, x2: xc + demi, y2: yEave, type: "contour" }); // face
    if (luc.type === "deux_pans") {
      s.push({ x1: xc, y1: yEave, x2: xc, y2: yEnd, type: "faitage" }); // faîtage
      s.push({ x1: xc - demi, y1: yEave, x2: xc, y2: yEnd, type: "noue" });
      s.push({ x1: xc + demi, y1: yEave, x2: xc, y2: yEnd, type: "noue" });
    } else {
      // chien-assis : rectangle, côtés = noues
      s.push({ x1: xc - demi, y1: yEnd, x2: xc + demi, y2: yEnd, type: "contour" });
      s.push({ x1: xc - demi, y1: yEave, x2: xc - demi, y2: yEnd, type: "noue" });
      s.push({ x1: xc + demi, y1: yEave, x2: xc + demi, y2: yEnd, type: "noue" });
    }
  }

  return s;
}
