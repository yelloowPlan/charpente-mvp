import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projetParDefaut } from "./domain/defaults.ts";
import { etudier } from "./engine/etude.ts";
import { nomenclatureVersCsv, debitVersCsv, devisVersCsv } from "./export/csv.ts";
import { etudeVersHtml } from "./export/html.ts";

/**
 * Génère les livrables de l'étude de référence dans `out/` :
 *   etude.html · nomenclature.csv · debit.csv · devis.csv
 */
function main(): void {
  const etude = etudier(projetParDefaut());
  const dossier = "out";
  mkdirSync(dossier, { recursive: true });

  const dateGeneration = new Date().toISOString().slice(0, 10);
  const fichiers: Array<[string, string]> = [
    ["etude.html", etudeVersHtml(etude, { dateGeneration })],
    ["nomenclature.csv", nomenclatureVersCsv(etude.nomenclature)],
    ["debit.csv", debitVersCsv(etude.debit)],
    ["devis.csv", devisVersCsv(etude.devis)],
  ];

  for (const [nom, contenu] of fichiers) {
    const chemin = join(dossier, nom);
    writeFileSync(chemin, contenu, "utf8");
    console.log(`  écrit  ${chemin}  (${contenu.length} octets)`);
  }
  console.log(`\n  Ouvrir ${join(dossier, "etude.html")} dans un navigateur, puis Imprimer → PDF.`);
}

main();
