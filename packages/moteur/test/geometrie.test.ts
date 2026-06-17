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
