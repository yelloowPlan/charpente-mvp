import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { calculerGeometrie, calculerGeometrieComposee } from "../src/engine/geometrie.ts";
import { closeTo } from "./helpers.ts";
import type { ParametresProjet } from "../src/domain/types.ts";

describe("calculerGeometrieComposee — toitures composées (RFC 0001, Lot A)", () => {
  const base = projetParDefaut();

  it("sans composition : identique au mono-volume (rétro-compat)", () => {
    const gc = calculerGeometrieComposee(base);
    assert.equal(gc.nbNoues, 0);
    assert.equal(gc.longueurNoueM, 0);
    assert.equal(gc.surfaceComposeeM2, calculerGeometrie(base).surfaceToitureM2);
    assert.equal(gc.surfaceExacte, true);
  });

  it("noue régulière : longueur == longueur d'arêtier (W/2)·√(2+tan²α)", () => {
    const W = base.batiment.largeurM;
    const tan = Math.tan((base.toiture.penteDeg * Math.PI) / 180);
    const attendu = (W / 2) * Math.sqrt(2 + tan * tan);
    const compoT: ParametresProjet = {
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord: "T", secondaire: { largeurM: W, longueurM: 4, positionM: 5 } },
      },
    };
    const gc = calculerGeometrieComposee(compoT);
    closeTo(gc.longueurNoueM, attendu, 9);

    // Égalité noue ↔ arêtier vérifiée sur une croupe de même largeur (où l'arêtier existe).
    const croupe = calculerGeometrie({
      ...base,
      toiture: { ...base.toiture, typologie: "croupe" },
    });
    closeTo(gc.longueurNoueM, croupe.longueurAretierM, 9);
  });

  it("T → 2 noues, surface exacte = principal + 2·rampant·saillie", () => {
    const W = base.batiment.largeurM;
    const saillie = 4;
    const p: ParametresProjet = {
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord: "T", secondaire: { largeurM: W, longueurM: saillie, positionM: 5 } },
      },
    };
    const g = calculerGeometrie(base);
    const gc = calculerGeometrieComposee(p);
    assert.equal(gc.nbNoues, 2);
    assert.equal(gc.surfaceExacte, true);
    closeTo(gc.surfaceComposeeM2, g.surfaceToitureM2 + 2 * g.rampantM * saillie, 6);
  });

  it("Lot B — aile plus étroite (W2 < W1) : noue & hauteur en W2, surface emprise/cosα", () => {
    const W1 = base.batiment.largeurM; // 8
    const W2 = 5;
    const saillie = 4;
    const d = base.batiment.debordRampantM;
    const alpha = (base.toiture.penteDeg * Math.PI) / 180;
    const p: ParametresProjet = {
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord: "T", secondaire: { largeurM: W2, longueurM: saillie, positionM: 5 } },
      },
    };
    const gc = calculerGeometrieComposee(p);
    closeTo(gc.largeurAileM, W2, 9);
    closeTo(gc.longueurNoueM, (W2 / 2) * Math.sqrt(2 + Math.tan(alpha) ** 2), 9);
    closeTo(gc.hauteurAileM, (W2 / 2) * Math.tan(alpha), 9);
    // surface = principal + 2·rampantAile·saillie, rampantAile = (W2/2 + d)/cosα
    const g = calculerGeometrie(base);
    const rampantAile = (W2 / 2 + d) / Math.cos(alpha);
    closeTo(gc.surfaceComposeeM2, g.surfaceToitureM2 + 2 * rampantAile * saillie, 6);
    assert.equal(gc.surfaceExacte, true);
    // noue plus courte que pour une aile pleine largeur (W1)
    const gcPlein = calculerGeometrieComposee({
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord: "T", secondaire: { largeurM: W1, longueurM: saillie, positionM: 5 } },
      },
    });
    assert.ok(gc.longueurNoueM < gcPlein.longueurNoueM);
  });

  it("Lot C — pente d'aile = pente principale ⇒ géométrie identique (réduction)", () => {
    const W = base.batiment.largeurM;
    const sansPente = calculerGeometrieComposee({
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord: "T", secondaire: { largeurM: 5, longueurM: 4, positionM: 5 } },
      },
    });
    const memePente = calculerGeometrieComposee({
      ...base,
      toiture: {
        ...base.toiture,
        composition: {
          raccord: "T",
          secondaire: { largeurM: 5, longueurM: 4, positionM: 5, penteDeg: base.toiture.penteDeg },
        },
      },
    });
    closeTo(memePente.longueurNoueM, sansPente.longueurNoueM, 9);
    closeTo(memePente.penetrationM, sansPente.penetrationM, 9);
    closeTo(memePente.surfaceComposeeM2, sansPente.surfaceComposeeM2, 6);
    void W;
  });

  it("Lot C — aile plus plate (α2 < α1) : faîtage d'aile plus bas, pénétration moindre", () => {
    const W2 = 6;
    const mk = (penteDeg?: number) =>
      calculerGeometrieComposee({
        ...base,
        toiture: {
          ...base.toiture,
          composition: { raccord: "T", secondaire: { largeurM: W2, longueurM: 4, positionM: 5, penteDeg } },
        },
      });
    const plate = mk(25); // < 45 principal
    const raide = mk(); // = principal (45)
    assert.ok(plate.hauteurAileM < raide.hauteurAileM); // h2 plus bas
    assert.ok(plate.penetrationM < raide.penetrationM); // pénètre moins profond
    assert.ok(Number.isFinite(plate.longueurNoueM) && plate.longueurNoueM > 0);
  });

  it("Lot B — aile plus large que le principal (W2 > W1) : plafonnée à W1, géométrie saine", () => {
    const W1 = base.batiment.largeurM;
    const p: ParametresProjet = {
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord: "T", secondaire: { largeurM: W1 + 4, longueurM: 4, positionM: 5 } },
      },
    };
    const gc = calculerGeometrieComposee(p);
    closeTo(gc.largeurAileM, W1, 9); // plafonné
    assert.ok(Number.isFinite(gc.surfaceComposeeM2) && Number.isFinite(gc.longueurNoueM));
  });

  it("croix → 4 noues, surface = principal + 4·rampantAile·saillie (2 ailes)", () => {
    const W = base.batiment.largeurM;
    const saillie = 4;
    const p: ParametresProjet = {
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord: "croix", secondaire: { largeurM: W, longueurM: saillie, positionM: 5 } },
      },
    };
    const gc = calculerGeometrieComposee(p);
    assert.equal(gc.nbNoues, 4);
    const g = calculerGeometrie(base);
    closeTo(gc.surfaceComposeeM2, g.surfaceToitureM2 + 4 * g.rampantM * saillie, 6);
  });

  it("L → 1 noue, surface exacte = même formule que le T (même emprise)", () => {
    const W = base.batiment.largeurM;
    const saillie = 3;
    const mk = (raccord: "L" | "T"): ParametresProjet => ({
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord, secondaire: { largeurM: W, longueurM: saillie, positionM: 5 } },
      },
    });
    const gcL = calculerGeometrieComposee(mk("L"));
    const gcT = calculerGeometrieComposee(mk("T"));
    assert.equal(gcL.nbNoues, 1);
    assert.equal(gcL.surfaceExacte, true);
    // L et T : même surface développée (emprise identique)
    closeTo(gcL.surfaceComposeeM2, gcT.surfaceComposeeM2, 9);
    const g = calculerGeometrie(base);
    closeTo(gcL.surfaceComposeeM2, g.surfaceToitureM2 + 2 * g.rampantM * saillie, 6);
  });
});

describe("calculerGeometrie — exemple de référence (10×8 m, pente 45°)", () => {
  const g = calculerGeometrie(projetParDefaut());

  it("rampant = (W/2 + d)/cos α ≈ 6,2225 m", () => {
    closeTo(g.rampantM, 6.2225, 3);
  });

  it("hauteur de faîtage = (W/2)·tan 45° = 4 m", () => {
    closeTo(g.hauteurFaitageM, 4.0, 6);
  });

  it("rampant sans débord = (W/2)/cos 45° ≈ 5,6569 m", () => {
    closeTo(g.rampantSansDebordM, 5.65685, 4);
  });

  it("longueur de pan = L + 2·dp = 10,6 m", () => {
    closeTo(g.longueurPanM, 10.6, 6);
  });

  it("surface toiture = 2·R·Lp ≈ 131,92 m²", () => {
    closeTo(g.surfaceToitureM2, 131.92, 1);
  });

  it("à faible pente, rampant ≈ demi-portée + débord", () => {
    const base = projetParDefaut();
    const g0 = calculerGeometrie(
      projetParDefaut({ ...base, toiture: { ...base.toiture, penteDeg: 6 } }),
    );
    assert.ok(g0.rampantM > 4.4); // > (W/2 + d)
    assert.ok(g0.rampantM < 4.5);
  });
});

describe("calculerGeometrie — appentis (mono-pan, 8×10 m, pente 45°)", () => {
  const base = projetParDefaut();
  const g = calculerGeometrie(
    projetParDefaut({ ...base, toiture: { ...base.toiture, typologie: "appentis" } }),
  );

  it("un seul pan", () => {
    assert.equal(g.nbPans, 1);
  });

  it("rampant = (W + d)/cos α ≈ 11,879 m (pente sur toute la portée)", () => {
    closeTo(g.rampantM, 11.879, 2);
  });

  it("hauteur = W·tan 45° = 8 m", () => {
    closeTo(g.hauteurFaitageM, 8.0, 4);
  });

  it("surface = 1 pan ≈ 125,92 m²", () => {
    closeTo(g.surfaceToitureM2, 125.92, 1);
  });
});
