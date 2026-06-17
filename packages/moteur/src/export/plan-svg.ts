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
  noue: { couleur: "#2f6f8f", largeur: 1.8, dash: "5 3" },
  chevron: { couleur: "#cda571", largeur: 1 },
};

export function planMasseSvg(p: ParametresProjet, geo?: GeometrieToit): string {
  const g = geo ?? calculerGeometrie(p);
  const L = p.batiment.longueurM;
  const W = p.batiment.largeurM;
  const Lp = g.longueurPanM;

  const segs = segmentsPlan(p, g);

  // Boîte englobante calculée depuis les segments (robuste aux volumes composés
  // qui débordent de [0,Lp]×[0,W]). En mono-volume, bornes identiques à avant.
  const xs = segs.flatMap((s) => [s.x1, s.x2]);
  const ys = segs.flatMap((s) => [s.y1, s.y2]);
  const minX = Math.min(0, ...xs);
  const maxX = Math.max(Lp, ...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(W, ...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const echelle = Math.min((VW - 2 * MARGE) / spanX, (VH - 2 * MARGE) / spanY);
  const ox = (VW - spanX * echelle) / 2 - minX * echelle;
  const oy = (VH - spanY * echelle) / 2 - minY * echelle;
  const X = (x: number): number => ox + x * echelle;
  const Y = (y: number): number => oy + y * echelle;

  // Fond du contour principal — rectangle de remplissage
  const fond = `<rect x="${f(X(0))}" y="${f(Y(0))}" width="${f(Lp * echelle)}" height="${f(W * echelle)}" fill="#f8fafc"/>`;

  const lignes = segs
    .map((s) => {
      const st = STYLE[s.type];
      const dash = st.dash ? ` stroke-dasharray="${st.dash}"` : "";
      return `<line x1="${f(X(s.x1))}" y1="${f(Y(s.y1))}" x2="${f(X(s.x2))}" y2="${f(Y(s.y2))}" stroke="${st.couleur}" stroke-width="${st.largeur}"${dash}/>`;
    })
    .join("");

  // Repérage pour la pose : fermes F1.., arêtiers A1.., noues N1..
  let nF = 0;
  let nA = 0;
  let nN = 0;
  const reperes = segs
    .map((s) => {
      if (s.type === "ferme") {
        nF += 1;
        return `<text x="${f(X(s.x1))}" y="${f(Y(0) - 5)}" text-anchor="middle" font-size="10" font-weight="600" fill="#8a5a2b">F${nF}</text>`;
      }
      if (s.type === "aretier" || s.type === "noue") {
        const mx = (s.x1 + s.x2) / 2;
        const my = (s.y1 + s.y2) / 2;
        const label = s.type === "noue" ? `N${(nN += 1)}` : `A${(nA += 1)}`;
        const fill = s.type === "noue" ? "#2f6f8f" : "#8a5a2b";
        return `<text x="${f(X(mx))}" y="${f(Y(my))}" text-anchor="middle" font-size="10" font-weight="600" fill="${fill}">${label}</text>`;
      }
      return "";
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
    reperes,
    coteL,
    coteW,
    `</svg>`,
  ].join("");
}
