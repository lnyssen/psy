/**
 * Numéro de téléphone au format international sans « + » (« 32475123456 »), tel
 * que l'attend wa.me. Un numéro belge saisi « 0475 12 34 56 », « +32 475… » ou
 * « 0032… » donne le même résultat ; un numéro qu'on ne sait pas lire donne
 * null plutôt qu'un lien qui mènerait ailleurs.
 */
export function telephoneInternational(brut: string | null | undefined) {
  if (!brut) return null;
  let t = brut.replace(/[^\d+]/g, "");
  if (t.startsWith("+")) t = t.slice(1);
  else if (t.startsWith("00")) t = t.slice(2);
  else if (t.startsWith("0")) t = `32${t.slice(1)}`;
  else return null;
  return t.length >= 9 && t.length <= 15 ? t : null;
}

/** Lien WhatsApp vers un numéro, avec un texte prérempli s'il y en a un. */
export function lienWhatsApp(telephone: string | null | undefined, texte?: string) {
  const n = telephoneInternational(telephone);
  if (!n) return null;
  return texte ? `https://wa.me/${n}?text=${encodeURIComponent(texte)}` : `https://wa.me/${n}`;
}

/** Les coordonnées d'un patient, en clair, prêtes à coller dans un message ou
 *  un événement d'agenda. Ne contient ni numéro national ni donnée de santé. */
export function texteCoordonnees(p: {
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  phoneMother: string | null;
  emailMother: string | null;
  phoneFather: string | null;
  emailFather: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
}) {
  const lignes = [`${p.firstName} ${p.lastName}`];
  if (p.phone) lignes.push(`Tél. : ${p.phone}`);
  if (p.email) lignes.push(`E-mail : ${p.email}`);
  const parent = (nom: string, tel: string | null, mail: string | null) => {
    const v = [tel, mail].filter(Boolean).join(" · ");
    if (v) lignes.push(`${nom} : ${v}`);
  };
  parent("Mère", p.phoneMother, p.emailMother);
  parent("Père", p.phoneFather, p.emailFather);
  if (p.addressLine)
    lignes.push(
      `Adresse : ${p.addressLine}, ${p.postalCode ?? ""} ${p.city ?? ""}`.trim(),
    );
  return lignes.join("\n");
}
