import { projetParDefaut, type ParametresProjet } from "@charpente/moteur";

/** Modèles de départ : chargent une configuration type en un clic. */
export interface Preset {
  id: string;
  nom: string;
  projet: ParametresProjet;
}

function maison2Pans(): ParametresProjet {
  return projetParDefaut(); // 10 × 8 m, pente 45°, tuile mécanique
}

function abriCarport(): ParametresProjet {
  const p = projetParDefaut();
  p.toiture.typologie = "appentis";
  p.batiment = { longueurM: 6, largeurM: 3, debordRampantM: 0.3, debordPignonM: 0.2 };
  p.toiture.penteDeg = 12;
  p.toiture.couverture = { type: "bac_acier", pureauM: 0.4, poidsKgM2: 12 };
  p.charpente.ecranSousToiture = false;
  return p;
}

function extension(): ParametresProjet {
  const p = projetParDefaut();
  p.toiture.typologie = "appentis";
  p.batiment = { longueurM: 5, largeurM: 4, debordRampantM: 0.35, debordPignonM: 0.3 };
  p.toiture.penteDeg = 25;
  p.toiture.couverture = { type: "tuile_mecanique", pureauM: 0.32, poidsKgM2: 45 };
  return p;
}

function pavillonCroupe(): ParametresProjet {
  const p = projetParDefaut();
  p.toiture.typologie = "croupe";
  p.batiment = { longueurM: 12, largeurM: 8, debordRampantM: 0.4, debordPignonM: 0.3 };
  p.toiture.penteDeg = 40;
  return p;
}

function maisonEnT(): ParametresProjet {
  const p = projetParDefaut();
  p.batiment = { longueurM: 10, largeurM: 6, debordRampantM: 0.4, debordPignonM: 0.3 };
  p.toiture.penteDeg = 40;
  // Aile perpendiculaire centrale (même largeur, même pente) → 2 noues.
  p.toiture.composition = { raccord: "T", secondaire: { largeurM: 6, longueurM: 5, positionM: 5 } };
  return p;
}

function maisonAvecExtension(): ParametresProjet {
  const p = projetParDefaut();
  p.batiment = { longueurM: 10, largeurM: 8, debordRampantM: 0.4, debordPignonM: 0.3 };
  p.toiture.penteDeg = 40;
  // Aile plus étroite (5 m < 8 m) greffée en L : faîtage qui pénètre le pan principal.
  p.toiture.composition = { raccord: "L", secondaire: { largeurM: 5, longueurM: 4, positionM: 7.5 } };
  return p;
}

export const PRESETS: Preset[] = [
  { id: "maison", nom: "Maison 2 pans", projet: maison2Pans() },
  { id: "abri", nom: "Abri / carport", projet: abriCarport() },
  { id: "extension", nom: "Extension", projet: extension() },
  { id: "croupe", nom: "Pavillon croupe", projet: pavillonCroupe() },
  { id: "maison_t", nom: "Maison en T (noues)", projet: maisonEnT() },
  { id: "maison_ext", nom: "Maison + extension étroite", projet: maisonAvecExtension() },
];
