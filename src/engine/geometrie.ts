import type { ParametresProjet } from "../domain/types.ts";

/**
 * Géométrie d'une toiture deux pans symétrique.
 * Toutes les longueurs sont en mètres.
 */
export interface GeometrieToit {
  /** longueur réelle d'un rampant, débord compris (m) */
  rampantM: number;
  /** longueur réelle d'un rampant, hors débord (m) — utile pour les arbalétriers */
  rampantSansDebordM: number;
  /** hauteur de la faîtière au-dessus du niveau des sablières (m) */
  hauteurFaitageM: number;
  /** longueur d'un pan (débords de pignon inclus) (m) */
  longueurPanM: number;
  /** demi-portée horizontale (m) */
  demiPorteeM: number;
  /** surface développée de la toiture (m²) */
  surfaceToitureM2: number;
}

const degVersRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Calcule la géométrie d'une toiture deux pans symétrique.
 *
 * Formules (α = pente) :
 *   rampant          R  = (W/2 + d) / cos α
 *   hauteur faîtage  h  = (W/2) · tan α
 *   longueur de pan  Lp = L + 2·dp
 *   surface          S  = 2 · R · Lp
 */
export function calculerGeometrie(p: ParametresProjet): GeometrieToit {
  const { largeurM: W, longueurM: L, debordRampantM: d, debordPignonM: dp } = p.batiment;
  const alpha = degVersRad(p.toiture.penteDeg);
  const cos = Math.cos(alpha);
  const tan = Math.tan(alpha);

  const demiPorteeM = W / 2;
  const rampantM = (demiPorteeM + d) / cos;
  const rampantSansDebordM = demiPorteeM / cos;
  const hauteurFaitageM = demiPorteeM * tan;
  const longueurPanM = L + 2 * dp;
  const surfaceToitureM2 = 2 * rampantM * longueurPanM;

  return {
    rampantM,
    rampantSansDebordM,
    hauteurFaitageM,
    longueurPanM,
    demiPorteeM,
    surfaceToitureM2,
  };
}
