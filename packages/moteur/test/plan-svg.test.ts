import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { calculerGeometrie } from "../src/engine/geometrie.ts";
import { planMasseSvg } from "../src/export/plan-svg.ts";
import type { TypeToiture } from "../src/domain/types.ts";

describe("planMasseSvg", () => {
  for (const typologie of ["deux_pans", "appentis", "croupe"] as TypeToiture[]) {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, toiture: { ...base.toiture, typologie } });
    const svg = planMasseSvg(p, calculerGeometrie(p));

    it(`${typologie} : SVG valide, coté, sans NaN`, () => {
      assert.ok(svg.startsWith("<svg"));
      assert.ok(svg.includes('role="img"'));
      assert.ok(svg.includes("Plan de charpente"));
      assert.ok(svg.includes("L = ") && svg.includes("W = "));
      assert.ok(!svg.includes("NaN") && !svg.includes("Infinity"));
    });
  }

  it("croupe : trace les 4 arêtiers (lignes pointillées) + repères A1..A4", () => {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, toiture: { ...base.toiture, typologie: "croupe" } });
    const svg = planMasseSvg(p);
    assert.equal((svg.match(/stroke-dasharray/g) ?? []).length, 4);
    assert.ok(svg.includes(">A1<") && svg.includes(">A4<"));
  });

  it("deux pans : repérage des fermes F1..", () => {
    const svg = planMasseSvg(projetParDefaut());
    assert.ok(svg.includes(">F1<"));
  });

  it("composé T : trace 2 noues + repères N1/N2, sans NaN", () => {
    const base = projetParDefaut();
    const W = base.batiment.largeurM;
    const p = projetParDefaut({
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord: "T", secondaire: { largeurM: W, longueurM: 4, positionM: 5 } },
      },
    });
    const svg = planMasseSvg(p);
    assert.ok(svg.startsWith("<svg"));
    assert.ok(svg.includes(">N1<") && svg.includes(">N2<"));
    assert.ok(!svg.includes("NaN") && !svg.includes("Infinity"));
  });

  it("composé L : une seule noue (N1, pas de N2)", () => {
    const base = projetParDefaut();
    const W = base.batiment.largeurM;
    const p = projetParDefaut({
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord: "L", secondaire: { largeurM: W, longueurM: 3, positionM: 4 } },
      },
    });
    const svg = planMasseSvg(p);
    assert.ok(svg.includes(">N1<") && !svg.includes(">N2<"));
  });
});
