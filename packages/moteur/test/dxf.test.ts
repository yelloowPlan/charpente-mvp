import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { planDxf } from "../src/export/dxf.ts";
import { segmentsPlan } from "../src/engine/plan-geometry.ts";
import type { TypeToiture } from "../src/domain/types.ts";

describe("planDxf", () => {
  for (const typologie of ["deux_pans", "appentis", "croupe"] as TypeToiture[]) {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, toiture: { ...base.toiture, typologie } });

    it(`${typologie} : DXF bien formé, autant de LINE que de segments`, () => {
      const dxf = planDxf(p);
      assert.ok(dxf.startsWith("0\r\nSECTION"));
      assert.ok(dxf.trimEnd().endsWith("EOF"));
      const nbLine = (dxf.match(/\r\nLINE\r\n/g) ?? []).length;
      assert.equal(nbLine, segmentsPlan(p).length);
      assert.ok(!dxf.includes("NaN") && !dxf.includes("undefined"));
    });
  }

  it("croupe : contient le calque ARETIER", () => {
    const base = projetParDefaut();
    const p = projetParDefaut({ ...base, toiture: { ...base.toiture, typologie: "croupe" } });
    assert.ok(planDxf(p).includes("ARETIER"));
  });

  it("composé : contient le calque NOUE", () => {
    const base = projetParDefaut();
    const W = base.batiment.largeurM;
    const p = projetParDefaut({
      ...base,
      toiture: {
        ...base.toiture,
        composition: { raccord: "T", secondaire: { largeurM: W, longueurM: 4, positionM: 5 } },
      },
    });
    assert.ok(planDxf(p).includes("NOUE"));
  });
});
