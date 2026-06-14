/**
 * Génération d'un schéma de coupe transversale (charpente, 2 pans) en SVG pur.
 *
 * Chaîne autonome, sans dépendance. Couleurs concrètes (livrable ouvert dans un
 * navigateur / imprimé), pas de variables de thème. Échelle calculée pour tenir
 * dans le viewBox quelles que soient les dimensions.
 */

export interface ParamsCoupe {
  /** portée W (m) */
  largeurM: number;
  /** hauteur de faîtage h (m) */
  hauteurFaitageM: number;
  /** pente (°) — pour l'étiquette */
  penteDeg: number;
  /** nombre de pannes intermédiaires par pan */
  nbPannesIntermParPan: number;
}

const VW = 440;
const VH = 320;
const MARGE_X = 60;
const MARGE_HAUT = 40;
const MARGE_BAS = 60;

const f = (n: number): string => n.toFixed(1);

/** Coupe transversale : entrait, arbalétriers, poinçon, repères de pannes. */
export function coupeTransversaleSvg(p: ParamsCoupe): string {
  const W = p.largeurM;
  const h = p.hauteurFaitageM;
  const n = Math.max(0, Math.floor(p.nbPannesIntermParPan));

  const uw = VW - 2 * MARGE_X;
  const uh = VH - MARGE_HAUT - MARGE_BAS;
  const echelle = Math.min(uw / W, uh / h); // px/m
  const originX = (VW - W * echelle) / 2;
  const baseY = VH - MARGE_BAS;
  const map = (xm: number, ym: number): [number, number] => [
    originX + xm * echelle,
    baseY - ym * echelle,
  ];

  const [lx, ly] = map(0, 0); // sablière gauche
  const [rx, ry] = map(W, 0); // sablière droite
  const [ax, ay] = map(W / 2, h); // faîtage (apex)
  const [px, py] = map(W / 2, 0); // pied du poinçon

  // Repères de pannes (points dans la coupe)
  const pannes: [number, number][] = [
    [ax, ay], // faîtière
    [lx, ly], // sablière gauche
    [rx, ry], // sablière droite
  ];
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    pannes.push(map(t * (W / 2), t * h)); // rampant gauche
    pannes.push(map(W - t * (W / 2), t * h)); // rampant droit
  }

  const cercles = pannes
    .map(([cx, cy]) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="4" fill="#b45309"/>`)
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" font-family="system-ui, sans-serif">`,
    `<rect x="0" y="0" width="${VW}" height="${VH}" fill="#ffffff"/>`,
    `<text x="${VW / 2}" y="24" text-anchor="middle" font-size="14" fill="#1f2937" font-weight="600">Coupe transversale</text>`,
    // triangle (2 arbalétriers + entrait)
    `<polygon points="${f(lx)},${f(ly)} ${f(ax)},${f(ay)} ${f(rx)},${f(ry)}" fill="#f8fafc" stroke="#1f2937" stroke-width="2" stroke-linejoin="round"/>`,
    // poinçon
    `<line x1="${f(px)}" y1="${f(py)}" x2="${f(ax)}" y2="${f(ay)}" stroke="#1f2937" stroke-width="1.5" stroke-dasharray="4 3"/>`,
    cercles,
    // cote largeur
    `<text x="${f((lx + rx) / 2)}" y="${f(baseY + 28)}" text-anchor="middle" font-size="12" fill="#475569">W = ${W.toFixed(2)} m</text>`,
    // cote hauteur
    `<text x="${f(ax + 8)}" y="${f((ay + py) / 2)}" font-size="12" fill="#475569">h = ${h.toFixed(2)} m</text>`,
    // pente
    `<text x="${f(lx + 18)}" y="${f(ly - 10)}" font-size="12" fill="#475569">${p.penteDeg}°</text>`,
    // légende pannes
    `<circle cx="60" cy="${VH - 16}" r="4" fill="#b45309"/>`,
    `<text x="72" y="${VH - 12}" font-size="11" fill="#475569">pannes (${3 + 2 * n} en coupe)</text>`,
    `</svg>`,
  ].join("");
}
