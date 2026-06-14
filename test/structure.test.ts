import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aireSectionM2,
  momentQuadratiqueMm4,
  porteeAdmissibleFlecheM,
  chargeElsKNm2,
} from "../src/engine/structure.ts";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { closeTo } from "./helpers.ts";

describe("structure — fonctions de base", () => {
  it("aire de section 75×225 = 0,016875 m²", () => {
    closeTo(aireSectionM2({ largeurMm: 75, hauteurMm: 225 }), 0.016875, 6);
  });

  it("moment quadratique I = b·h³/12 (chevron 63×75)", () => {
    closeTo(momentQuadratiqueMm4({ largeurMm: 63, hauteurMm: 75 }), 2214843.75, 1);
  });

  it("charge ELS de référence ≈ 0,8914 kN/m² (couverture 45 kg/m² + neige 0,45)", () => {
    closeTo(chargeElsKNm2(projetParDefaut()), 0.89145, 4);
  });
});

describe("porteeAdmissibleFlecheM — critère de flèche", () => {
  it("chevron de référence ≈ 2,49 m", () => {
    const p = projetParDefaut();
    const portee = porteeAdmissibleFlecheM(
      p.charpente.sections.chevron,
      p.charpente.entraxeChevronM,
      chargeElsKNm2(p),
      p.essence.moduleEMpa,
    );
    closeTo(portee, 2.49, 1);
  });

  it("croît avec la hauteur de section (h³)", () => {
    const charge = 1.0;
    const p1 = porteeAdmissibleFlecheM({ largeurMm: 63, hauteurMm: 75 }, 0.45, charge, 11000);
    const p2 = porteeAdmissibleFlecheM({ largeurMm: 63, hauteurMm: 100 }, 0.45, charge, 11000);
    assert.ok(p2 > p1);
  });

  it("décroît quand la charge augmente", () => {
    const s = { largeurMm: 63, hauteurMm: 75 };
    const faible = porteeAdmissibleFlecheM(s, 0.45, 0.5, 11000);
    const forte = porteeAdmissibleFlecheM(s, 0.45, 2.0, 11000);
    assert.ok(forte < faible);
  });

  it("charge nulle → portée infinie (pas de division par zéro)", () => {
    assert.equal(porteeAdmissibleFlecheM({ largeurMm: 63, hauteurMm: 75 }, 0.45, 0, 11000), Infinity);
  });
});
