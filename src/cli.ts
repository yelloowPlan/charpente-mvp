import { projetParDefaut } from "./domain/defaults.ts";
import { etudier } from "./engine/etude.ts";

/** Formate des centimes en euros (chaîne « 1 234,56 € »). */
function euros(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
}

function ligne(c = "─", n = 64): string {
  return c.repeat(n);
}

function main(): void {
  const projet = projetParDefaut();
  const etude = etudier(projet);
  const { geometrie: g, nomenclature: nom, debit, devis } = etude;

  console.log(ligne("═"));
  console.log("  ÉTUDE DE CHARPENTE — toiture deux pans, charpente traditionnelle");
  console.log(ligne("═"));
  const b = projet.batiment;
  console.log(
    `  Bâtiment : ${b.longueurM} × ${b.largeurM} m · pente ${projet.toiture.penteDeg}° · ` +
      `débords ${b.debordRampantM} m / ${b.debordPignonM} m`,
  );
  console.log(`  Couverture : ${projet.toiture.couverture.type} · essence ${projet.essence.classe}`);
  console.log("");

  console.log("  GÉOMÉTRIE");
  console.log(`    Rampant ............. ${g.rampantM.toFixed(3)} m`);
  console.log(`    Hauteur faîtage ..... ${g.hauteurFaitageM.toFixed(3)} m`);
  console.log(`    Longueur de pan ..... ${g.longueurPanM.toFixed(3)} m`);
  console.log(`    Surface toiture ..... ${g.surfaceToitureM2.toFixed(2)} m²`);
  console.log("");

  console.log("  NOMENCLATURE");
  for (const el of nom.elements) {
    const sec = `${el.section.largeurMm}×${el.section.hauteurMm}`;
    console.log(
      `    ${el.nom.padEnd(28)} ${String(el.quantite).padStart(3)} × ` +
        `${el.longueurM.toFixed(2)} m  (${sec})`,
    );
    console.log(`      └ ${el.formule}`);
  }
  console.log("");

  console.log("  DÉBIT (optimisation des barres)");
  for (const s of debit.sections) {
    console.log(
      `    Section ${s.sectionLabel.padEnd(8)} [${s.mode}] : ` +
        `${s.barres} barre(s) · brut ${s.mlBrut.toFixed(1)} m · ` +
        `acheté ${s.mlAchete.toFixed(1)} m · perte ${s.pertePct.toFixed(1)} % · ` +
        `${s.volumeAcheteM3.toFixed(3)} m³`,
    );
  }
  console.log("");

  console.log("  DEVIS");
  for (const l of devis.lignes) {
    console.log(
      `    ${l.libelle.padEnd(44)} ${l.quantite.toString().padStart(8)} ${l.unite.padEnd(3)} ` +
        `× ${euros(l.prixUnitaireCents).padStart(10)} = ${euros(l.totalHtCents).padStart(12)}`,
    );
  }
  console.log(`    ${ligne("·", 58)}`);
  console.log(`    Total HT  ${euros(devis.totalHtCents).padStart(54)}`);
  console.log(`    TVA ${devis.tauxTvaPct} %  ${euros(devis.tvaCents).padStart(52)}`);
  console.log(`    Total TTC ${euros(devis.totalTtcCents).padStart(54)}`);
  console.log("");

  console.log("  ALERTES & VÉRIFICATIONS");
  for (const al of etude.alertes) {
    const tag = al.niveau === "attention" ? "⚠ " : al.niveau === "bloquant" ? "✕ " : "ℹ ";
    console.log(`    ${tag}${al.message}`);
  }
  console.log(ligne("═"));
}

main();
