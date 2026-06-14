import type { ParametresProjet } from "../domain/types.ts";

/**
 * Géométrie d'une toiture (deux pans symétrique OU appentis mono-pan).
 * Toutes les longueurs sont en mètres.
 */
export interface GeometrieToit {
  /** nombre de pans (2 = deux pans, 1 = appentis) */
  nbPans: 1 | 2;
  /** longueur réelle d'un rampant, débord compris (m) */
  rampantM: number;
  /** longueur réelle d'un rampant, hors débord (m) — utile pour les arbalétriers */
  rampantSansDebordM: number;
  /** hauteur du faîtage (deux pans) ou du mur haut (appentis), au-dessus des sablières (m) */
  hauteurFaitageM: number;
  /** longueur d'un pan (débords de pignon inclus) (m) */
  longueurPanM: number;
  /** projection horizontale d'un rampant, hors débord (m) — demi-portée en deux pans, portée en appentis */
  demiPorteeM: number;
  /** surface développée de la toiture (m²) */
  surfaceToitureM2: number;
}

const degVersRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Calcule la géométrie de la toiture selon la typologie.
 *
 * Deux pans (α = pente) :
 *   rampant R = (W/2 + d)/cos α · hauteur h = (W/2)·tan α · surface = 2·R·Lp
 * Appentis (mono-pan, la pente couvre toute la portée W) :
 *   rampant R = (W + d)/cos α · hauteur h = W·tan α · surface = 1·R·Lp
 * avec Lp = L + 2·dp dans les deux cas.
 */
export function calculerGeometrie(p: ParametresProjet): GeometrieToit {
  const { largeurM: W, longueurM: L, debordRampantM: d, debordPignonM: dp } = p.batiment;
  const alpha = degVersRad(p.toiture.penteDeg);
  const cos = Math.cos(alpha);
  const tan = Math.tan(alpha);

  const appentis = p.toiture.typologie === "appentis";
  const nbPans: 1 | 2 = appentis ? 1 : 2;
  // « course » horizontale du rampant (hors débord) : portée entière en appentis,
  // demi-portée en deux pans.
  const demiPorteeM = appentis ? W : W / 2;

  const rampantM = (demiPorteeM + d) / cos;
  const rampantSansDebordM = demiPorteeM / cos;
  const hauteurFaitageM = demiPorteeM * tan;
  const longueurPanM = L + 2 * dp;
  const surfaceToitureM2 = nbPans * rampantM * longueurPanM;

  return {
    nbPans,
    rampantM,
    rampantSansDebordM,
    hauteurFaitageM,
    longueurPanM,
    demiPorteeM,
    surfaceToitureM2,
  };
}
