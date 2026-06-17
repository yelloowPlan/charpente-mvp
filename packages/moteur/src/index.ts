// API publique du moteur paramétrique de charpente (MVP).
export * from "./domain/types.ts";
export { projetParDefaut } from "./domain/defaults.ts";
export {
  calculerGeometrie,
  calculerGeometrieComposee,
  type GeometrieToit,
  type GeometrieComposee,
} from "./engine/geometrie.ts";
export {
  aireSectionM2,
  momentQuadratiqueMm4,
  chargeElsKNm2,
  porteeAdmissibleFlecheM,
  chargeNeigeSolKNm2,
  fmdMPa,
  contrainteFlexionMPa,
  type ZoneNeige,
} from "./engine/structure.ts";
export {
  genererNomenclature,
  genererNomenclatureComposee,
  type ResultatNomenclature,
} from "./engine/nomenclature.ts";
export { metreCouverture, type MetreCouverture } from "./engine/couverture.ts";
export { planifierDebit, type PlanDebit, type PlanSection, type BarreDebitee } from "./engine/debit.ts";
export {
  chiffrerDevis,
  appliquerRemise,
  ligneLibre,
  type Devis,
  type DevisFinal,
  type LigneDevis,
} from "./engine/devis.ts";
export {
  etudier,
  validerProjet,
  ErreurValidation,
  type Etude,
  type VerifStructure,
} from "./engine/etude.ts";
export {
  genererOssature3D,
  genererLattage3D,
  genererCouverture3D,
  genererOssatureComposee3D,
  genererLattageComposee3D,
  genererCouvertureComposee3D,
  type Poutre3D,
  type Pan3D,
  type Point3,
  type RolePoutre,
} from "./engine/ossature.ts";
// Exports / livrables
export { nomenclatureVersCsv, debitVersCsv, devisVersCsv, planDeCoupeVersCsv } from "./export/csv.ts";
export { coupeTransversaleSvg, type ParamsCoupe } from "./export/schema-svg.ts";
export { planMasseSvg } from "./export/plan-svg.ts";
export { planDxf } from "./export/dxf.ts";
export { segmentsPlan, type SegmentPlan, type TypeSegment } from "./engine/plan-geometry.ts";
export { etudeVersHtml, type OptionsHtml } from "./export/html.ts";
