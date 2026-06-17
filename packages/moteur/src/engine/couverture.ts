import type { ParametresProjet } from "../domain/types.ts";
import { calculerGeometrie, calculerGeometrieComposee, type GeometrieToit } from "./geometrie.ts";

/**
 * Métré de couverture : surfaces et linéaires (faîtage, arêtiers, égout, rives)
 * + estimation du nombre de tuiles par densité au m² selon le type de couverture.
 */

export interface MetreCouverture {
  surfaceM2: number;
  mlFaitage: number;
  mlAretiers: number;
  /** linéaire de noue(s) — 0 hors toiture composée */
  mlNoues: number;
  mlEgout: number;
  mlRives: number;
  /** estimation du nombre de tuiles/ardoises (0 pour le bac acier) */
  nbTuiles: number;
}

/** Densité indicative de tuiles/ardoises au m² selon le type. */
const DENSITE: Record<string, number> = {
  tuile_mecanique: 12,
  tuile_plate: 60,
  ardoise: 20,
  bac_acier: 0,
};

export function metreCouverture(p: ParametresProjet, geo?: GeometrieToit): MetreCouverture {
  const g = geo ?? calculerGeometrie(p);
  const Lp = g.longueurPanM;
  const W = p.batiment.largeurM;
  const d = p.batiment.debordRampantM;
  const typologie = p.toiture.typologie;

  let mlFaitage = g.longueurFaitageM;
  const mlAretiers = typologie === "croupe" ? 4 * g.longueurAretierM : 0;

  let mlEgout = 0;
  let mlRives = 0;
  if (typologie === "deux_pans") {
    mlEgout = 2 * Lp; // 2 sablières
    mlRives = 4 * g.rampantM; // 2 pignons × 2 rampants
  } else if (typologie === "appentis") {
    mlEgout = Lp; // 1 égout bas
    mlRives = 2 * g.rampantM; // 2 rives latérales
  } else {
    // croupe : égout sur tout le périmètre, pas de rives (croupes à la place)
    mlEgout = 2 * Lp + 2 * (W + 2 * d);
    mlRives = 0;
  }

  // Composition multi-volumes : noue(s) exacte(s) + linéaires de l'aile.
  let mlNoues = 0;
  const compo = p.toiture.composition;
  if (compo) {
    const gc = calculerGeometrieComposee(p);
    const S = compo.secondaire.longueurM;
    mlNoues = gc.nbNoues * gc.longueurNoueM;
    mlFaitage += W / 2 + S; // faîtage de l'aile (croisement → pignon)
    mlEgout += 2 * S; // 2 égouts d'aile (saillie)
    mlRives += 2 * g.rampantM; // pignon libre de l'aile (2 rampants)
  }

  const densite = DENSITE[p.toiture.couverture.type] ?? 0;
  const nbTuiles = Math.round(g.surfaceToitureM2 * densite);

  return {
    surfaceM2: Math.round(g.surfaceToitureM2 * 100) / 100,
    mlFaitage: Math.round(mlFaitage * 100) / 100,
    mlAretiers: Math.round(mlAretiers * 100) / 100,
    mlNoues: Math.round(mlNoues * 100) / 100,
    mlEgout: Math.round(mlEgout * 100) / 100,
    mlRives: Math.round(mlRives * 100) / 100,
    nbTuiles,
  };
}
