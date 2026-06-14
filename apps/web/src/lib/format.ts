/** Formatage d'affichage (locale FR). */

export const euros = (cents: number): string =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export const nb = (n: number, dec = 2): string =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: dec });
