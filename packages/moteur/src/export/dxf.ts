import type { ParametresProjet } from "../domain/types.ts";
import type { GeometrieToit } from "../engine/geometrie.ts";
import { segmentsPlan, type TypeSegment } from "../engine/plan-geometry.ts";

/**
 * Export DXF (R12 ASCII) du plan de charpente : entités LINE en mètres, réparties
 * par calque selon le type. Échange avec un logiciel de CAO (archi/BE).
 */

const CALQUE: Record<TypeSegment, string> = {
  contour: "CONTOUR",
  faitage: "FAITAGE",
  mur_haut: "MUR_HAUT",
  ferme: "FERME",
  aretier: "ARETIER",
  chevron: "CHEVRON",
};

export function planDxf(p: ParametresProjet, geo?: GeometrieToit): string {
  const out: string[] = ["0", "SECTION", "2", "ENTITIES"];
  for (const s of segmentsPlan(p, geo)) {
    out.push(
      "0", "LINE",
      "8", CALQUE[s.type],
      "10", s.x1.toFixed(4),
      "20", s.y1.toFixed(4),
      "30", "0.0",
      "11", s.x2.toFixed(4),
      "21", s.y2.toFixed(4),
      "31", "0.0",
    );
  }
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\r\n") + "\r\n";
}
