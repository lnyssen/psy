/**
 * Remet un PDF à quelqu'un : « partager » ouvre la feuille de partage du
 * téléphone (WhatsApp, SMS, Mail…) avec le fichier ; là où elle n'existe pas,
 * le fichier se télécharge. À appeler depuis un geste (un clic).
 */
export async function partagerPdf(url: string, titre: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const r = await fetch(url);
    if (!r.ok) return { ok: false, message: (await r.text()) || "Le document n’a pas pu être préparé." };
    const nom =
      /filename="([^"]+)"/.exec(r.headers.get("content-disposition") ?? "")?.[1] ?? "document.pdf";
    const fichier = new File([await r.blob()], nom, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [fichier] })) {
      await navigator.share({ files: [fichier], title: titre });
    } else {
      const lien = document.createElement("a");
      lien.href = URL.createObjectURL(fichier);
      lien.download = nom;
      lien.click();
      URL.revokeObjectURL(lien.href);
    }
    return { ok: true };
  } catch (e) {
    // Fermer la feuille de partage est un choix, pas une erreur.
    if (e instanceof DOMException && e.name === "AbortError") return { ok: true };
    return { ok: false, message: "Le partage a échoué." };
  }
}
