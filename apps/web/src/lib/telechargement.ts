/** Déclenche le téléchargement d'un contenu texte généré côté client. */
export function telecharger(nomFichier: string, contenu: string, mime: string): void {
  const blob = new Blob([contenu], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}
