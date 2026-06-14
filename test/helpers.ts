import assert from "node:assert/strict";

/**
 * Équivalent de `toBeCloseTo` de Vitest : vrai si |actual − expected| < 0,5·10^-digits.
 */
export function closeTo(actual: number, expected: number, digits = 2): void {
  const tolerance = 0.5 * Math.pow(10, -digits);
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `attendu ${actual} proche de ${expected} (±${tolerance})`,
  );
}
