import type { ParametresProjet } from "./types.ts";

/**
 * Projet de référence (l'exemple chiffré documenté : bâtiment 10 × 8 m, pente 45°).
 * Sert de base à la démo et aux tests. `surcharge` permet de surcharger
 * partiellement les paramètres (peu profond, suffisant pour les cas d'usage).
 */
export function projetParDefaut(
  surcharge: Partial<ParametresProjet> = {},
): ParametresProjet {
  const base: ParametresProjet = {
    batiment: {
      longueurM: 10,
      largeurM: 8,
      debordRampantM: 0.4,
      debordPignonM: 0.3,
    },
    toiture: {
      typologie: "deux_pans",
      penteDeg: 45,
      couverture: { type: "tuile_mecanique", pureauM: 0.32, poidsKgM2: 45 },
    },
    charpente: {
      type: "trad_pannes",
      entraxeChevronM: 0.45,
      entraxeFermeM: 4,
      ecranSousToiture: true,
      sections: {
        chevron: { largeurMm: 63, hauteurMm: 75 },
        panne: { largeurMm: 75, hauteurMm: 225 },
        arbaletrier: { largeurMm: 75, hauteurMm: 225 },
        entrait: { largeurMm: 75, hauteurMm: 225 },
        poincon: { largeurMm: 100, hauteurMm: 100 },
        liteau: { largeurMm: 27, hauteurMm: 40 },
        contreLiteau: { largeurMm: 22, hauteurMm: 40 },
      },
    },
    charges: { neigeKNm2: 0.45, zoneNeige: "A1", altitudeM: 0 },
    essence: {
      nom: "Sapin/Épicéa",
      classe: "C24",
      moduleEMpa: 11000,
      prixM3Cents: 70000, // 700 €/m³
    },
    prix: {
      liteauMlCents: 120,
      contreLiteauMlCents: 90,
      couvertureM2Cents: 4500,
      quincaillerieM2Cents: 800,
      mainOeuvreHeureCents: 4500,
      heuresParM2: 0.8,
      tauxTvaPct: 10,
    },
    debit: { barresCommercialesM: [4, 5, 6, 7, 8], kerfMm: 4 },
  };

  return { ...base, ...surcharge };
}
