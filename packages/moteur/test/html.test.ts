import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projetParDefaut } from "../src/domain/defaults.ts";
import { etudier } from "../src/engine/etude.ts";
import { etudeVersHtml } from "../src/export/html.ts";

const etude = etudier(projetParDefaut());
const html = etudeVersHtml(etude, { dateGeneration: "2026-06-14" });

describe("export HTML", () => {
  it("document HTML complet et bien formé en surface", () => {
    assert.ok(html.startsWith("<!doctype html>"));
    assert.ok(html.includes('<html lang="fr">'));
    assert.ok(html.trimEnd().endsWith("</html>"));
    assert.ok(html.includes('<meta charset="utf-8">'));
  });

  it("embarque le schéma de coupe SVG", () => {
    assert.ok(html.includes("<svg"));
    assert.ok(html.includes("Coupe transversale"));
  });

  it("contient une ligne de tableau par élément de nomenclature", () => {
    // chaque élément génère une cellule avec sa désignation
    for (const e of etude.nomenclature.elements) {
      assert.ok(html.includes(`<td>${e.nom}</td>`), `manque: ${e.nom}`);
    }
  });

  it("affiche le total TTC formaté en euros", () => {
    const ttc = (etude.devis.totalTtcCents / 100).toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
    });
    assert.ok(html.includes(ttc));
  });

  it("échappe le HTML (pas d'injection via les libellés)", () => {
    // forge un projet dont le type de couverture contient des caractères dangereux
    const p = projetParDefaut();
    const pInj = {
      ...p,
      toiture: { ...p.toiture, couverture: { ...p.toiture.couverture, type: "<script>x</script>" } },
    };
    const e2 = etudier(pInj);
    const h2 = etudeVersHtml(e2);
    assert.ok(!h2.includes("<script>x</script>"));
    assert.ok(h2.includes("&lt;script&gt;"));
  });

  it("inclut la date de génération quand fournie", () => {
    assert.ok(html.includes("Généré le 2026-06-14"));
  });

  it("n'affiche pas d'en-tête entreprise quand elle est absente", () => {
    assert.ok(!html.includes('<div class="entete-entreprise">'));
  });

  it("affiche l'en-tête entreprise quand elle est renseignée", () => {
    const h = etudeVersHtml(etude, {
      entreprise: {
        raisonSociale: "Charpentes Dupont",
        adresse: "12 rue des Compagnons",
        codePostal: "73000",
        ville: "Chambéry",
        siret: "12345678900012",
        telephone: "06 00 00 00 00",
        email: "contact@dupont.fr",
      },
    });
    assert.ok(h.includes('<div class="entete-entreprise">'));
    assert.ok(h.includes("Charpentes Dupont"));
    assert.ok(h.includes("SIRET 12345678900012"));
    assert.ok(h.includes("73000 Chambéry"));
  });

  it("n'affiche pas l'en-tête si tous les champs entreprise sont vides", () => {
    const h = etudeVersHtml(etude, {
      entreprise: { raisonSociale: "", adresse: "", codePostal: "", ville: "", siret: "", telephone: "", email: "" },
    });
    assert.ok(!h.includes('<div class="entete-entreprise">'));
  });

  it("échappe le HTML dans les champs entreprise", () => {
    const h = etudeVersHtml(etude, {
      entreprise: {
        raisonSociale: "<script>x</script>",
        adresse: "", codePostal: "", ville: "", siret: "", telephone: "", email: "",
      },
    });
    assert.ok(!h.includes("<script>x</script>"));
    assert.ok(h.includes("&lt;script&gt;"));
  });

  it("affiche la référence chantier à côté du titre", () => {
    const h = etudeVersHtml(etude, { referenceChantier: "Maison Martin" });
    assert.ok(h.includes("Étude de charpente — Maison Martin"));
  });

  it("n'affiche pas de bloc devis/client par défaut", () => {
    assert.ok(!html.includes('<div class="bloc-devis">'));
  });

  it("affiche le bloc client + n° + date + validité", () => {
    const h = etudeVersHtml(etude, {
      client: { nom: "M. Martin", adresse: "3 chemin du Bois", codePostal: "73100", ville: "Aix" },
      numeroDevis: "DEV-2026-001",
      dateDevis: "14/06/2026",
      validiteJours: 30,
    });
    assert.ok(h.includes('<div class="bloc-devis">'));
    assert.ok(h.includes("À l'attention de"));
    assert.ok(h.includes("M. Martin"));
    assert.ok(h.includes("73100 Aix"));
    assert.ok(h.includes("Devis n° DEV-2026-001"));
    assert.ok(h.includes("Date : 14/06/2026"));
    assert.ok(h.includes("Validité : 30 jours"));
  });

  it("affiche le bloc même sans client si un n° est fourni", () => {
    const h = etudeVersHtml(etude, { numeroDevis: "X-1" });
    assert.ok(h.includes('<div class="bloc-devis">'));
    assert.ok(!h.includes("À l'attention de"));
  });

  it("échappe le HTML dans le client", () => {
    const h = etudeVersHtml(etude, {
      client: { nom: "<b>x</b>", adresse: "", codePostal: "", ville: "" },
    });
    assert.ok(!h.includes("<b>x</b>"));
    assert.ok(h.includes("&lt;b&gt;x&lt;/b&gt;"));
  });
});
