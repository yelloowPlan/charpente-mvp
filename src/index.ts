// API publique du moteur paramétrique de charpente (MVP).
export * from "./domain/types.ts";
export { projetParDefaut } from "./domain/defaults.ts";
export { calculerGeometrie, type GeometrieToit } from "./engine/geometrie.ts";
export {
  aireSectionM2,
  momentQuadratiqueMm4,
  chargeElsKNm2,
  porteeAdmissibleFlecheM,
} from "./engine/structure.ts";
export { genererNomenclature, type ResultatNomenclature } from "./engine/nomenclature.ts";
export { planifierDebit, type PlanDebit, type PlanSection, type BarreDebitee } from "./engine/debit.ts";
export { chiffrerDevis, type Devis, type LigneDevis } from "./engine/devis.ts";
export { etudier, validerProjet, ErreurValidation, type Etude } from "./engine/etude.ts";
