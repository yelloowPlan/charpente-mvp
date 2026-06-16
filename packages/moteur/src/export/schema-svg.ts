/**
 * Génération d'un schéma de coupe transversale (charpente) en SVG pur.
 *
 * Gère les deux pans (apex centré) et l'appentis mono-pan (apex en haut à droite).
 * Chaîne autonome, sans dépendance. Couleurs concrètes (livrable ouvert dans un
 * navigateur / imprimé), pas de variables de thème. Échelle calculée pour tenir
 * dans le viewBox quelles que soient les dimensions.
 */

export interface ParamsCoupe {
  /** portée W (m) */
  largeurM: number;
  /** hauteur de faîtage / mur haut h (m) */
  hauteurFaitageM: number;
  /** pente (°) — pour l'étiquette */
  penteDeg: number;
  /** nombre de pannes intermédiaires par pan */
  nbPannesIntermParPan: number;
  /** nombre de pans : 2 (deux pans) ou 1 (appentis). Défaut 2. */
  nbPans?: 1 | 2;
}

const VW = 440;
const VH = 320;
const MARGE_X = 60;
const MARGE_HAUT = 40;
const MARGE_BAS = 60;

const f = (n: number): string => n.toFixed(1);

/** Coupe transversale : entrait, rampant(s), poinçon/mur haut, repères de pannes. */
export function coupeTransversaleSvg(p: ParamsCoupe): string {
  const W = p.largeurM;
  const h = p.hauteurFaitageM;
  const n = Math.max(0, Math.floor(p.nbPannesIntermParPan));
  const appentis = p.nbPans === 1;

  const uw = VW - 2 * MARGE_X;
  const uh = VH - MARGE_HAUT - MARGE_BAS;
  const echelle = Math.min(uw / W, uh / h); // px/m
  const originX = (VW - W * echelle) / 2;
  const baseY = VH - MARGE_BAS;
  const map = (xm: number, ym: number): [number, number] => [
    originX + xm * echelle,
    baseY - ym * echelle,
  ];

  // Course horizontale du sommet : centre en deux pans, mur haut (W) en appentis.
  const courseApex = appentis ? W : W / 2;
  const [lx, ly] = map(0, 0); // appui bas gauche (sablière)
  const [rx, ry] = map(W, 0); // appui bas droit (sablière 2 pans / pied du mur haut en appentis)
  const [ax, ay] = map(courseApex, h); // sommet (faîtage / haut du mur)
  const [px, py] = map(courseApex, 0); // pied du poinçon / du mur haut

  // Repères de pannes
  const pannes: [number, number][] = [
    [ax, ay], // faîtière / panne haute
    [lx, ly], // sablière basse gauche
  ];
  if (!appentis) pannes.push([rx, ry]); // sablière droite (deux pans seulement)
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    if (appentis) {
      pannes.push(map(t * W, t * h)); // rampant unique
    } else {
      pannes.push(map(t * (W / 2), t * h)); // rampant gauche
      pannes.push(map(W - t * (W / 2), t * h)); // rampant droit
    }
  }
  const nbReperes = appentis ? 2 + n : 3 + 2 * n;

  const cercles = pannes
    .map(([cx, cy]) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="4" fill="#b45309"/>`)
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" role="img" font-family="system-ui, sans-serif">`,
    `<title>Coupe transversale ${appentis ? "appentis" : "deux pans"} — portée ${W.toFixed(2)} m, hauteur ${h.toFixed(2)} m</title>`,
    `<desc>Schéma de la charpente : entrait, ${appentis ? "rampant et mur haut" : "rampants et poinçon"}, et ${nbReperes} repères de pannes.</desc>`,
    `<rect x="0" y="0" width="${VW}" height="${VH}" fill="#ffffff"/>`,
    `<text x="${VW / 2}" y="24" text-anchor="middle" font-size="14" fill="#1c1917" font-weight="600">Coupe transversale${appentis ? " (appentis)" : ""}</text>`,
    // triangle : rampant(s) + entrait
    `<polygon points="${f(lx)},${f(ly)} ${f(ax)},${f(ay)} ${f(rx)},${f(ry)}" fill="#f8fafc" stroke="#1c1917" stroke-width="2" stroke-linejoin="round"/>`,
    // poinçon (2 pans) / mur haut (appentis)
    `<line x1="${f(px)}" y1="${f(py)}" x2="${f(ax)}" y2="${f(ay)}" stroke="#1c1917" stroke-width="1.5" stroke-dasharray="4 3"/>`,
    cercles,
    // cote largeur
    `<text x="${f((lx + rx) / 2)}" y="${f(baseY + 28)}" text-anchor="middle" font-size="12" fill="#57534e">W = ${W.toFixed(2)} m</text>`,
    // cote hauteur
    `<text x="${f(ax + 8)}" y="${f((ay + py) / 2)}" font-size="12" fill="#57534e">h = ${h.toFixed(2)} m</text>`,
    // pente
    `<text x="${f(lx + 18)}" y="${f(ly - 10)}" font-size="12" fill="#57534e">${p.penteDeg}°</text>`,
    // légende pannes
    `<circle cx="60" cy="${VH - 16}" r="4" fill="#b45309"/>`,
    `<text x="72" y="${VH - 12}" font-size="11" fill="#57534e">pannes (${nbReperes} en coupe)</text>`,
    `</svg>`,
  ].join("");
}
