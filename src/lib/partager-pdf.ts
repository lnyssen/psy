/**
 * Remettre un PDF à quelqu'un, en deux temps séparables :
 *
 * 1. preparerPdf va chercher le fichier (réseau, donc asynchrone) ;
 * 2. remettrePdf ouvre la feuille de partage du téléphone ou de l'ordinateur
 *    (Mail, WhatsApp, Messages, AirDrop…) avec ce fichier ; là où elle
 *    n'existe pas, le fichier se télécharge, à joindre soi-même à un e-mail.
 *
 * Pourquoi deux temps : Safari (et l'app installée sur iPhone) n'ouvre la
 * feuille de partage que dans la foulée d'un geste. Après le téléchargement
 * du PDF, ce geste est parfois « consommé » et le partage refusé
 * (NotAllowedError). Le fichier, lui, est prêt : un second toucher le partage
 * aussitôt, sans attente réseau. Voir EnvoyerPdf.
 */

export class PartageRefuse extends Error {}

export async function preparerPdf(url: string): Promise<File> {
  const r = await fetch(url);
  if (!r.ok) throw new Error((await r.text()) || "Le document n’a pas pu être préparé.");
  const nom =
    /filename="([^"]+)"/.exec(r.headers.get("content-disposition") ?? "")?.[1] ?? "document.pdf";
  return new File([await r.blob()], nom, { type: "application/pdf" });
}

/**
 * « partage » : la feuille de partage s'est ouverte (et a été utilisée ou
 * fermée, ce qui est un choix, pas une erreur) ; « telecharge » : pas de
 * feuille de partage ici, le fichier a été téléchargé. Lève PartageRefuse si
 * le navigateur exige un nouveau geste.
 */
export async function remettrePdf(fichier: File, titre: string): Promise<"partage" | "telecharge"> {
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: titre });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "partage";
      if (e instanceof DOMException && e.name === "NotAllowedError") throw new PartageRefuse();
      throw e;
    }
    return "partage";
  }
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(fichier);
  lien.download = fichier.name;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 10_000);
  return "telecharge";
}

/** Les deux temps d'un coup, pour un bouton qui n'a pas besoin du second toucher. */
export async function partagerPdf(url: string, titre: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const r = await remettrePdf(await preparerPdf(url), titre);
    return r === "telecharge"
      ? { ok: true, message: "PDF téléchargé : joignez-le à votre e-mail." }
      : { ok: true };
  } catch (e) {
    if (e instanceof PartageRefuse) return { ok: false, message: "Touchez à nouveau pour partager." };
    return { ok: false, message: e instanceof Error && e.message ? e.message : "Le partage a échoué." };
  }
}
