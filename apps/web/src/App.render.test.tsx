import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import App from "./App.tsx";

/**
 * Test de rendu : exécute réellement l'arbre React (App → ParamForm + Resultats)
 * et l'intégration du moteur, en rendant le markup statique. Détecte les erreurs
 * de rendu, props incohérentes, ou plantage du moteur — sans navigateur.
 */
describe("App — rendu statique du projet par défaut", () => {
  const html = renderToStaticMarkup(<App />);

  it("monte sans erreur et affiche le titre", () => {
    expect(html).toContain("Configurateur de charpente");
  });

  it("affiche le formulaire paramétrique", () => {
    expect(html).toContain("Bâtiment");
    expect(html).toContain("Entraxe chevrons (m)");
  });

  it("affiche les résultats : géométrie, nomenclature, coupe SVG", () => {
    expect(html).toContain("Surface toiture");
    expect(html).toContain("Chevron");
    expect(html).toContain("Coupe transversale"); // SVG embarqué rendu
    expect(html).toContain("<svg");
  });

  it("affiche le devis et son total TTC", () => {
    expect(html).toContain("Total TTC");
    expect(html).toMatch(/Total HT/);
  });

  it("expose les boutons d'export", () => {
    expect(html).toContain("Étude HTML");
    expect(html).toContain("Devis CSV");
  });

  it("affiche le disclaimer Eurocode 5", () => {
    expect(html).toContain("Eurocode 5");
  });
});
