import type { ParametresProjet } from "../domain/types.ts";
import { calculerGeometrie, type GeometrieToit } from "../engine/geometrie.ts";

/**
 * Plan de charpente 2D (vue de dessus) en SVG pur : contour, faîtière, chevrons,
 * fermes, arêtiers (croupe), avec cotes L et W. Chaîne autonome, sans dépendance.
 */

const VW = 480;
const VH = 360;
const MARGE = 52;
const f = (n: number): string => n.toFixed(1);

export function planMasseSvg(p: ParametresProjet, geo?: GeometrieToit): string {
  const g = geo ?? calculerGeometrie(p);
  const L = p.batiment.longueurM;
  const W = p.batiment.largeurM;
  const Lp = g.longueurPanM;
  const entraxe = p.charpente.entraxeChevronM;
  const typologie = p.toiture.typologie;

  const uw = VW - 2 * MARGE;
  const uh = VH - 2 * MARGE;
  const echelle = Math.min(uw / Lp, uh / W);
  const ox = (VW - Lp * echelle) / 2;
  const oy = (VH - W * echelle) / 2;
  const X = (x: number): number => ox + x * echelle;
  const Y = (y: number): number => oy + y * echelle;

  const el: string[] = [];

  // Contour de la toiture
  el.push(
    `<rect x="${f(X(0))}" y="${f(Y(0))}" width="${f(Lp * echelle)}" height="${f(W * echelle)}" fill="#f8fafc" stroke="#1c1917" stroke-width="2"/>`,
  );

  // Chevrons (lignes fines)
  const nbChev = Math.floor(Lp / entraxe) + 1;
  for (let i = 0; i < nbChev; i++) {
    const x = (i * Lp) / (nbChev - 1 || 1);
    el.push(`<line x1="${f(X(x))}" y1="${f(Y(0))}" x2="${f(X(x))}" y2="${f(Y(W))}" stroke="#cda571" stroke-width="1"/>`);
  }

  // Faîtière + arêtiers selon typologie
  if (typologie === "appentis") {
    el.push(`<line x1="${f(X(0))}" y1="${f(Y(0))}" x2="${f(X(Lp))}" y2="${f(Y(0))}" stroke="#9a6533" stroke-width="3"/>`);
  } else if (typologie === "croupe") {
    const ridge = g.longueurFaitageM;
    const x0 = (Lp - ridge) / 2;
    const x1 = (Lp + ridge) / 2;
    el.push(`<line x1="${f(X(x0))}" y1="${f(Y(W / 2))}" x2="${f(X(x1))}" y2="${f(Y(W / 2))}" stroke="#9a6533" stroke-width="3"/>`);
    // 4 arêtiers (coins → extrémités du faîtage)
    el.push(`<line x1="${f(X(0))}" y1="${f(Y(0))}" x2="${f(X(x0))}" y2="${f(Y(W / 2))}" stroke="#8a5a2b" stroke-width="1.5" stroke-dasharray="5 3"/>`);
    el.push(`<line x1="${f(X(0))}" y1="${f(Y(W))}" x2="${f(X(x0))}" y2="${f(Y(W / 2))}" stroke="#8a5a2b" stroke-width="1.5" stroke-dasharray="5 3"/>`);
    el.push(`<line x1="${f(X(Lp))}" y1="${f(Y(0))}" x2="${f(X(x1))}" y2="${f(Y(W / 2))}" stroke="#8a5a2b" stroke-width="1.5" stroke-dasharray="5 3"/>`);
    el.push(`<line x1="${f(X(Lp))}" y1="${f(Y(W))}" x2="${f(X(x1))}" y2="${f(Y(W / 2))}" stroke="#8a5a2b" stroke-width="1.5" stroke-dasharray="5 3"/>`);
  } else {
    // deux pans : faîtière au milieu + fermes
    el.push(`<line x1="${f(X(0))}" y1="${f(Y(W / 2))}" x2="${f(X(Lp))}" y2="${f(Y(W / 2))}" stroke="#9a6533" stroke-width="3"/>`);
    const nbFermes = Math.floor(L / p.charpente.entraxeFermeM) + 1;
    const debut = (Lp - L) / 2;
    for (let j = 0; j < nbFermes; j++) {
      const x = debut + (nbFermes > 1 ? (j * L) / (nbFermes - 1) : L / 2);
      el.push(`<line x1="${f(X(x))}" y1="${f(Y(0))}" x2="${f(X(x))}" y2="${f(Y(W))}" stroke="#8a5a2b" stroke-width="2.5"/>`);
    }
  }

  // Cotes
  el.push(`<text x="${f(VW / 2)}" y="${f(Y(W) + 28)}" text-anchor="middle" font-size="12" fill="#57534e">L = ${L.toFixed(2)} m</text>`);
  el.push(`<text x="${f(X(0) - 14)}" y="${f((Y(0) + Y(W)) / 2)}" text-anchor="middle" font-size="12" fill="#57534e" transform="rotate(-90 ${f(X(0) - 14)} ${f((Y(0) + Y(W)) / 2)})">W = ${W.toFixed(2)} m</text>`);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" role="img" font-family="system-ui, sans-serif">`,
    `<title>Plan de charpente (vue de dessus) — ${L.toFixed(2)} × ${W.toFixed(2)} m</title>`,
    `<rect x="0" y="0" width="${VW}" height="${VH}" fill="#ffffff"/>`,
    `<text x="${VW / 2}" y="24" text-anchor="middle" font-size="14" fill="#1c1917" font-weight="600">Plan de charpente</text>`,
    ...el,
    `</svg>`,
  ].join("");
}
