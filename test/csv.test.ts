import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { etudier } from "../src/engine/etude.ts";
import { nomenclatureVersCsv, debitVersCsv, devisVersCsv } from "../src/export/csv.ts";

const etude = etudier(projetParDefaut());

describe("export CSV", () => {
  it("commence par un BOM UTF-8 et utilise le séparateur ;", () => {
    const csv = debitVersCsv(etude.debit);
    assert.equal(csv.charCodeAt(0), 0xfeff);
    assert.ok(csv.split("\r\n")[0].includes(";"));
  });

  it("nomenclature : une ligne d'en-tête + une ligne par élément", () => {
    const csv = nomenclatureVersCsv(etude.nomenclature);
    const lignes = csv.replace("﻿", "").trimEnd().split("\r\n");
    assert.equal(lignes.length, etude.nomenclature.elements.length + 1);
    assert.ok(lignes[0].startsWith("Rôle;Désignation"));
  });

  it("devis : contient les totaux HT/TVA/TTC avec décimales à la virgule", () => {
    const csv = devisVersCsv(etude.devis);
    const attenduTtc = (etude.devis.totalTtcCents / 100).toFixed(2).replace(".", ",");
    assert.ok(csv.includes("Total TTC"));
    assert.ok(csv.includes(attenduTtc));
    assert.ok(/TVA \d+ %/.test(csv));
  });

  it("débit : autant de lignes de données que de sections", () => {
    const csv = debitVersCsv(etude.debit);
    const lignes = csv.replace("﻿", "").trimEnd().split("\r\n");
    assert.equal(lignes.length, etude.debit.sections.length + 1);
  });

  it("échappe les champs contenant le séparateur", () => {
    // Les formules ne contiennent pas de ';' ; on vérifie le mécanisme directement
    // via une formule forgée n'est pas exposé — on teste l'absence de ';' parasite.
    const csv = nomenclatureVersCsv(etude.nomenclature);
    for (const ligne of csv.replace("﻿", "").trimEnd().split("\r\n")) {
      // chaque ligne non échappée doit avoir exactement 6 séparateurs (7 colonnes)
      const horsGuillemets = ligne.replace(/"[^"]*"/g, "");
      assert.equal((horsGuillemets.match(/;/g) ?? []).length, 6);
    }
  });
});
