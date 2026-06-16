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

  it("croupe : trace les 4 arêtiers (lignes pointillées)", () => {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, toiture: { ...base.toiture, typologie: "croupe" } });
    const svg = planMasseSvg(p);
    assert.equal((svg.match(/stroke-dasharray/g) ?? []).length, 4);
  });
});
