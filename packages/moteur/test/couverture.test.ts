import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { metreCouverture } from "../src/engine/couverture.ts";
import type { TypeToiture } from "../src/domain/types.ts";

describe("metreCouverture", () => {
  it("deux pans : faîtage = longueur de pan, arêtiers nuls, rives = 4 rampants", () => {
    const m = metreCouverture(projetParDefaut());
    assert.ok(m.surfaceM2 > 0);
    assert.ok(m.mlFaitage > 0);
    assert.equal(m.mlAretiers, 0);
    assert.ok(m.mlRives > 0 && m.mlEgout > 0);
    assert.ok(m.nbTuiles > 0); // tuile mécanique par défaut
  });

  it("croupe : arêtiers non nuls, pas de rives", () => {
    const base = projetParDefaut();
    const m = metreCouverture(projetParDefaut({ ...base, toiture: { ...base.toiture, typologie: "croupe" as TypeToiture } }));
    assert.ok(m.mlAretiers > 0);
    assert.equal(m.mlRives, 0);
  });

  it("bac acier : 0 tuile", () => {
    const base = projetParDefaut();
    const p = projetParDefaut({
      ...base,
      toiture: { ...base.toiture, couverture: { type: "bac_acier", pureauM: 0.4, poidsKgM2: 12 } },
    });
    assert.equal(metreCouverture(p).nbTuiles, 0);
  });

  it("aucune valeur non finie", () => {
    for (const typologie of ["deux_pans", "appentis", "croupe"] as TypeToiture[]) {
      const base = projetParDefaut();
      const m = metreCouverture(projetParDefaut({ ...base, toiture: { ...base.toiture, typologie } }));
      for (const v of Object.values(m)) assert.ok(Number.isFinite(v));
    }
  });

  it("mono-volume : mlNoues nul", () => {
    assert.equal(metreCouverture(projetParDefaut()).mlNoues, 0);
  });

  it("composé T : mlNoues = 2 × longueur de noue, faîtage augmenté", () => {
    const base = projetParDefaut();
    const W = base.batiment.largeurM;
    const ref = metreCouverture(base);
    const p = projetParDefaut({
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord: "T", secondaire: { largeurM: W, longueurM: 4, positionM: 5 } },
      },
    });
    const m = metreCouverture(p);
    const tan = Math.tan((base.toiture.penteDeg * Math.PI) / 180);
    const noue = (W / 2) * Math.sqrt(2 + tan * tan);
    assert.ok(Math.abs(m.mlNoues - 2 * noue) < 0.05);
    assert.ok(m.mlFaitage > ref.mlFaitage);
  });
});
