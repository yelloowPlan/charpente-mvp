import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { calculerGeometrie } from "../src/engine/geometrie.ts";
import { closeTo } from "./helpers.ts";

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
