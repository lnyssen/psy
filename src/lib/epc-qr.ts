import QRCode from "qrcode";

/**
 * Code QR de virement SEPA (norme EPC069-12, dite « EPC QR » ou « Scan to
 * pay ») : les applications des banques belges (KBC, Belfius, ING, BNP Paribas
 * Fortis, Argenta, Payconiq…) le lisent et pré-remplissent le virement —
 * bénéficiaire, IBAN, montant et communication. Rien à recopier pour le patient.
 */

/** Titulaire du compte, tel qu'il s'affiche dans l'application de la banque. */
export const BENEFICIAIRE = "AMAPSY SRL";

/** Vrai pour un IBAN dont la clé (modulo 97) est correcte. */
export function ibanValide(brut: string | null | undefined) {
  if (!brut) return false;
  const iban = brut.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const deplace = iban.slice(4) + iban.slice(0, 4);
  const chiffres = deplace.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let reste = 0;
  for (const c of chiffres) reste = (reste * 10 + Number(c)) % 97;
  return reste === 1;
}

/** Le contenu du code : douze lignes, dans l'ordre fixé par la norme. */
export function chaineEpc(o: { iban: string; montantCents: number; communication: string }) {
  const iban = o.iban.replace(/\s+/g, "").toUpperCase();
  if (!ibanValide(iban)) return null;
  if (!Number.isInteger(o.montantCents) || o.montantCents <= 0 || o.montantCents > 99_999_999_999)
    return null;
  const euros = (o.montantCents / 100).toFixed(2);
  // La norme n'admet que des lignes courtes et sans retour à la ligne.
  const propre = (t: string, max: number) => t.replace(/[\r\n]+/g, " ").trim().slice(0, max);
  return [
    "BCD", // service tag
    "002", // version
    "1", // jeu de caractères : UTF-8
    "SCT", // virement SEPA
    "", // BIC : facultatif en version 002
    propre(BENEFICIAIRE, 70),
    iban,
    `EUR${euros}`,
    "", // code de finalité
    "", // référence structurée
    // Communication libre : dernière ligne utile. La ligne « information du
    // bénéficiaire » qui suit est facultative et laissée de côté.
    propre(o.communication, 140),
  ].join("\n");
}

/** L'image PNG du code, ou null si l'IBAN ou le montant ne permettent pas d'en faire un. */
export async function qrVirement(o: { iban: string | null; montantCents: number; communication: string }) {
  if (!o.iban) return null;
  const contenu = chaineEpc({ iban: o.iban, montantCents: o.montantCents, communication: o.communication });
  if (!contenu) return null;
  return QRCode.toBuffer(contenu, { errorCorrectionLevel: "M", margin: 2, width: 480, type: "png" });
}
