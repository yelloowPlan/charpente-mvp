# RFC 0002 — Lucarnes

- **Statut** : **implémenté** (deux pans à fronton + chien-assis)
- **Date** : 2026-06-17
- **Périmètre** : moteur (`packages/moteur`) + app (`apps/web`)

---

## 1. Problème

Une **lucarne** est un petit ouvrage posé **sur un pan** de toiture (éclairage de combles). C'est une feature distincte du raccord d'aile (RFC 0001) : la lucarne ne se greffe pas à l'égout, elle perce localement le pan et possède sa propre petite charpente (faîtage/linteau, versant(s), joues, fronton).

## 2. Modèle de données (`toiture.lucarnes?: Lucarne[]`)

Optionnel ⇒ absent/vide = aucune lucarne, **mono/multi-volume inchangé, golden préservé**.

```ts
export type TypeLucarne = "deux_pans" | "chien_assis";
export interface Lucarne {
  type: TypeLucarne;
  largeurM: number;     // largeur le long de l'égout
  hauteurFaceM: number; // hauteur de la face avant au-dessus du pan
  avanceeM: number;     // profondeur sur le rampant
  positionXM: number;   // position le long du bâtiment
  cote: "avant" | "arriere"; // pan porteur
}
```

## 3. Géométrie — ESTIMATIVE (assumée)

Le pan principal **n'est pas percé** (trémie négligée) ⇒ léger sur-métré, du bon côté pour un devis. Tout est marqué `estimation: true` et signalé par une alerte.

- **Deux pans (fronton)** : pente déduite de `hauteurFace` et `largeur/2` ; versant transversal `rampant = √((L/2)² + hF²)` ; **surface** `2·rampant·avancée` ; **2 noues** de longueur `√(avancée² + rampant²)` ; ossature = chevrons (2 versants), faîtière (avancée), 2 chevrons de noue (section renforcée), linteau de face.
- **Chien-assis (1 pan)** : `rampant = √(avancée² + hF²)` ; **surface** `largeur·rampant` ; **2 noues** latérales de longueur `rampant` ; ossature = chevrons (1 versant), linteau haut, 2 noues, linteau de face.

## 4. Intégration

- `metreLucarnes(p)` (`engine/lucarnes.ts`) → `{ nb, surfaceM2, mlNoues, elements }`.
- `etudier` : ajoute la surface (devis couverture/MO) et l'ossature à la nomenclature, force `estimation`, pousse une alerte.
- `metreCouverture` : ajoute `mlNoues` des lucarnes.
- **Plan 2D / DXF** : glyphe par lucarne (face d'égout + faîtage + noues ; chien-assis = rectangle à côtés noue).
- **3D** : `genererLucarnes3D(p)` (faîtière + pans + noues), superposé à l'ossature et à la couverture côté app.
- **UI** : section « Lucarnes » (ajout/suppression, type, pan, largeur, hauteur de face, avancée, position) ; preset « Maison + lucarnes ».
- **Validation** : largeur/hauteur/avancée > 0 (bloquant), position dans le bâtiment (attention).

## 5. Hors périmètre

Perçage exact du pan (trémie, chevêtres), coupes de noue exactes, habillage (joues menuisées, fronton, zinguerie), types capucine / rampante / œil-de-bœuf, dimensionnement EC5 des chevêtres.
