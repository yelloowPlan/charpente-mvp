import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { genererNomenclature } from "../src/engine/nomenclature.ts";
import type { RoleElement } from "../src/domain/types.ts";
import { closeTo } from "./helpers.ts";

const nom = genererNomenclature(projetParDefaut());

function quantite(role: RoleElement): number {
  return nom.elements.filter((e) => e.role === role).reduce((s, e) => s + e.quantite, 0);
}
function longueur(role: RoleElement): number {
  const el = nom.elements.find((e) => e.role === role);
  if (!el) throw new Error(`rôle absent: ${role}`);
  return el.longueurM;
}

describe("genererNomenclature — exemple de référence", () => {
  it("48 chevrons de ~6,22 m", () => {
    assert.equal(quantite("chevron"), 48);
    closeTo(longueur("chevron"), 6.2225, 3);
  });

  it("40 rangs de liteaux de 10,6 m", () => {
    assert.equal(quantite("liteau"), 40);
    closeTo(longueur("liteau"), 10.6, 6);
  });

  it("contre-liteaux = nombre de chevrons (écran activé)", () => {
    assert.equal(quantite("contre_liteau"), 48);
  });

  it("désactiver l'écran supprime les contre-liteaux", () => {
    const p = projetParDefaut();
    const nom2 = genererNomenclature({
      ...p,
      charpente: { ...p.charpente, ecranSousToiture: false },
    });
    assert.equal(nom2.elements.some((e) => e.role === "contre_liteau"), false);
  });

  it("1 faîtière + 2 sablières", () => {
    assert.equal(quantite("panne_faitiere"), 1);
    assert.equal(quantite("panne_sabliere"), 2);
  });

  it("portée admissible ≈ 2,49 m → 2 pannes intermédiaires/pan (4 au total)", () => {
    closeTo(nom.porteeAdmissibleChevronM, 2.49, 1);
    assert.equal(nom.nbPannesIntermediairesParPan, 2);
    assert.equal(quantite("panne_intermediaire"), 4);
  });

  it("3 fermes : 3 entraits de 8 m, 6 arbalétriers, 3 poinçons de 4 m", () => {
    assert.equal(quantite("ferme_entrait"), 3);
    closeTo(longueur("ferme_entrait"), 8, 6);
    assert.equal(quantite("ferme_arbaletrier"), 6);
    closeTo(longueur("ferme_arbaletrier"), 5.65685, 4);
    assert.equal(quantite("ferme_poincon"), 3);
    closeTo(longueur("ferme_poincon"), 4, 6);
  });

  it("toutes les pièces portent une formule de traçabilité", () => {
    for (const el of nom.elements) assert.ok(el.formule.length > 0);
  });
});
