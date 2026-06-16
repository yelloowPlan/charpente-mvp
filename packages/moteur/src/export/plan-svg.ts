import type { ParametresProjet } from "../domain/types.ts";
import { calculerGeometrie, type GeometrieToit } from "../engine/geometrie.ts";
import { segmentsPlan, type TypeSegment } from "../engine/plan-geometry.ts";

/**
 * Plan de charpente 2D (vue de dessus) en SVG pur, depuis la géométrie de plan
 * partagée (`segmentsPlan`). Contour, faîtière, chevrons, fermes, arêtiers + cotes.
 */

const VW = 480;
const VH = 360;
const MARGE = 52;
const f = (n: number): string => n.toFixed(1);

const STYLE: Record<TypeSegment, { couleur: string; largeur: number; dash?: string }> = {
  contour: { couleur: "#1c1917", largeur: 2 },
  faitage: { couleur: "#9a6533", largeur: 3 },
  mur_haut: { couleur: "#9a6533", largeur: 3 },
  ferme: { couleur: "#8a5a2b", largeur: 2.5 },
  aretier: { couleur: "#8a5a2b", largeur: 1.5, dash: "5 3" },
  chevron: { couleur: "#cda571", largeur: 1 },
};

export function planMasseSvg(p: ParametresProjet, geo?: GeometrieToit): string {
  const g = geo ?? calculerGeometrie(p);
  const L = p.batiment.longueurM;
  const W = p.batiment.largeurM;
  const Lp = g.longueurPanM;

  const echelle = Math.min((VW - 2 * MARGE) / Lp, (VH - 2 * MARGE) / W);
  const ox = (VW - Lp * echelle) / 2;
  const oy = (VH - W * echelle) / 2;
  const X = (x: number): number => ox + x * echelle;
  const Y = (y: number): number => oy + y * echelle;

  // Fond du contour (premier segment = côté bas) — rectangle de remplissage
  const fond = `<rect x="${f(X(0))}" y="${f(Y(0))}" width="${f(Lp * echelle)}" height="${f(W * echelle)}" fill="#f8fafc"/>`;

  const lignes = segmentsPlan(p, g)
    .map((s) => {
      const st = STYLE[s.type];
      const dash = st.dash ? ` stroke-dasharray="${st.dash}"` : "";
      return `<line x1="${f(X(s.x1))}" y1="${f(Y(s.y1))}" x2="${f(X(s.x2))}" y2="${f(Y(s.y2))}" stroke="${st.couleur}" stroke-width="${st.largeur}"${dash}/>`;
    })
    .join("");

  const coteL = `<text x="${f(VW / 2)}" y="${f(Y(W) + 28)}" text-anchor="middle" font-size="12" fill="#57534e">L = ${L.toFixed(2)} m</text>`;
  const cx = X(0) - 14;
  const cy = (Y(0) + Y(W)) / 2;
  const coteW = `<text x="${f(cx)}" y="${f(cy)}" text-anchor="middle" font-size="12" fill="#57534e" transform="rotate(-90 ${f(cx)} ${f(cy)})">W = ${W.toFixed(2)} m</text>`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" role="img" font-family="system-ui, sans-serif">`,
    `<title>Plan de charpente (vue de dessus) — ${L.toFixed(2)} × ${W.toFixed(2)} m</title>`,
    `<rect x="0" y="0" width="${VW}" height="${VH}" fill="#ffffff"/>`,
    `<text x="${VW / 2}" y="24" text-anchor="middle" font-size="14" fill="#1c1917" font-weight="600">Plan de charpente</text>`,
    fond,
    lignes,
    coteL,
    coteW,
    `</svg>`,
  ].join("");
}
