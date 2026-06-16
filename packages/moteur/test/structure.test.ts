import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aireSectionM2,
  momentQuadratiqueMm4,
  porteeAdmissibleFlecheM,
  chargeElsKNm2,
  chargeNeigeSolKNm2,
  fmdMPa,
  contrainteFlexionMPa,
} from "../src/engine/structure.ts";

describe("flexion EC5 (indicatif)", () => {
  it("f_m,d C24 ≈ 14,8 MPa (k_mod 0,8 / γ_M 1,3)", () => {
    closeTo(fmdMPa("C24"), (0.8 * 24) / 1.3, 2);
  });
  it("contrainte de flexion croît avec la portée²", () => {
    const sec = { largeurMm: 63, hauteurMm: 75 };
    const s2 = contrainteFlexionMPa(sec, 0.45, 2, 1);
    const s4 = contrainteFlexionMPa(sec, 0.45, 4, 1);
    closeTo(s4 / s2, 4, 1); // ℓ² → ×4 pour ℓ doublé
  });
  it("contrainte décroît si la section grandit (h²)", () => {
    const s1 = contrainteFlexionMPa({ largeurMm: 63, hauteurMm: 75 }, 0.45, 2.5, 1);
    const s2 = contrainteFlexionMPa({ largeurMm: 63, hauteurMm: 100 }, 0.45, 2.5, 1);
    assert.ok(s2 < s1);
  });
});
import { projetParDefaut } from "../src/domain/defaults.ts";
import { closeTo } from "./helpers.ts";

describe("chargeNeigeSolKNm2 — EN 1991-1-3 / NA", () => {
  it("zone A1 au sol = 0,45 kN/m²", () => {
    assert.equal(chargeNeigeSolKNm2("A1", 0), 0.45);
  });
  it("zone E au sol = 1,40 kN/m²", () => {
    assert.equal(chargeNeigeSolKNm2("E", 100), 1.4);
  });
  it("supplément d'altitude continu à 500 m (A1 → 0,90)", () => {
    closeTo(chargeNeigeSolKNm2("A1", 500), 0.9, 2);
  });
  it("supplément d'altitude à 1000 m (A1 → 2,65)", () => {
    closeTo(chargeNeigeSolKNm2("A1", 1000), 2.65, 2);
  });
  it("croît avec l'altitude", () => {
    assert.ok(chargeNeigeSolKNm2("C2", 800) > chargeNeigeSolKNm2("C2", 200));
  });
});

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
