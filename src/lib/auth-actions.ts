"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { COOKIE_SESSION, creerJeton, optionsCookie } from "@/lib/session";
import { exigerSession } from "@/lib/garde";
import { LONGUEUR_MINIMALE } from "@/lib/acces-constantes";
import {
  adresseDuSite,
  definirMotDePasse,
  empreinteAttendue,
  empreinteJeton,
  motDePasseValide,
} from "@/lib/acces";
import { adresseDe, tropd } from "@/lib/limite";
import { courrielConfigure, envoyerCourriel } from "@/lib/courriel";

/**
 * Connexion par mot de passe. Voir lib/acces.ts pour l'origine de l'empreinte
 * (base, sinon environnement) et app/api/passkey pour la connexion par Face ID.
 */
export async function seConnecter(
  _etat: string | null,
  f: FormData,
): Promise<string | null> {
  if (!(await empreinteAttendue()))
    return "L’authentification n’est pas configurée sur ce serveur.";

  // Dix essais par quart d'heure et par adresse : de quoi se tromper, pas de
  // quoi deviner.
  if (tropd(`connexion:${adresseDe(await headers())}`, 10, 15 * 60_000)) {
    return "Trop d’essais. Réessayez dans un quart d’heure.";
  }

  const motDePasse = String(f.get("motDePasse") ?? "");
  const suite = String(f.get("suite") ?? "/");

  if (!(await motDePasseValide(motDePasse))) return "Mot de passe incorrect.";

  const jar = await cookies();
  jar.set(COOKIE_SESSION, await creerJeton(), optionsCookie);

  // Ne rediriger que vers un chemin interne : une valeur venue de l'URL ne doit
  // jamais pouvoir emmener ailleurs.
  redirect(suite.startsWith("/") && !suite.startsWith("//") ? suite : "/admin");
}

/**
 * Verrouiller, c'est détruire la session — pas la masquer. Un écran seulement
 * caché resterait déverrouillé pour qui rouvre l'onglet ou lit la mémoire du
 * navigateur.
 */
export async function verrouiller() {
  const jar = await cookies();
  jar.delete(COOKIE_SESSION);
  redirect("/connexion?verrouille=1");
}

// ---------------------------------------------------------------------------
// Réglages › Sécurité
// ---------------------------------------------------------------------------

const RETOUR = "/admin/reglages";
function retour(code: string): never {
  redirect(`${RETOUR}?securite=${code}#securite`);
}

export async function changerMotDePasse(f: FormData) {
  await exigerSession();
  if (tropd("changer-mdp", 5, 15 * 60_000)) retour("mdp-trop");

  const actuel = String(f.get("actuel") ?? "");
  const nouveau = String(f.get("nouveau") ?? "");
  const confirmation = String(f.get("confirmation") ?? "");

  if (!(await motDePasseValide(actuel))) retour("mdp-actuel");
  if (nouveau.length < LONGUEUR_MINIMALE) retour("mdp-court");
  if (nouveau !== confirmation) retour("mdp-different");
  if (nouveau === actuel) retour("mdp-identique");

  await definirMotDePasse(nouveau);
  revalidatePath(RETOUR);
  retour("mdp-ok");
}

export async function enregistrerAdresseRecuperation(f: FormData) {
  await exigerSession();
  const adresse = String(f.get("adresse") ?? "")
    .trim()
    .toLowerCase();
  if (adresse && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(adresse))
    retour("recup-invalide");

  await prisma.acces.upsert({
    where: { id: "global" },
    update: { recoveryEmail: adresse || null },
    create: { id: "global", recoveryEmail: adresse || null },
  });
  revalidatePath(RETOUR);
  retour(adresse ? "recup-ok" : "recup-retiree");
}

export async function supprimerAppareil(f: FormData) {
  await exigerSession();
  const id = String(f.get("id") ?? "");
  if (id) await prisma.passkey.deleteMany({ where: { id } });
  revalidatePath(RETOUR);
  retour("appareil-retire");
}

// ---------------------------------------------------------------------------
// Mot de passe oublié
// ---------------------------------------------------------------------------

const VALIDITE_LIEN_MS = 30 * 60_000;

/**
 * Envoie un lien de réinitialisation à l'adresse de récupération.
 *
 * La réponse est la même, adresse enregistrée ou non : on ne révèle pas ce que
 * l'outil contient à quelqu'un qui n'est pas connecté. Seule exception, utile à
 * la praticienne : si les e-mails ne sont pas configurés sur le serveur, on le
 * dit — aucun lien ne pourrait partir, autant ne pas la laisser attendre.
 */
export async function demanderReinitialisation(): Promise<string> {
  if (!courrielConfigure()) {
    return "L’envoi d’e-mails n’est pas configuré sur ce serveur : la réinitialisation par e-mail n’est pas disponible. Contactez la personne qui administre le site.";
  }
  const h = await headers();
  if (
    tropd(`oubli:${adresseDe(h)}`, 3, 60 * 60_000) ||
    tropd("oubli:global", 6, 60 * 60_000)
  ) {
    return "Trop de demandes. Réessayez dans une heure.";
  }

  const acces = await prisma.acces.findUnique({ where: { id: "global" } });
  if (acces?.recoveryEmail) {
    const jeton = randomBytes(32).toString("base64url");
    await prisma.reinitialisationMdp.deleteMany({
      where: {
        OR: [{ utiliseAt: { not: null } }, { expireAt: { lt: new Date() } }],
      },
    });
    await prisma.reinitialisationMdp.create({
      data: {
        jetonHash: empreinteJeton(jeton),
        expireAt: new Date(Date.now() + VALIDITE_LIEN_MS),
      },
    });
    const { origine } = await adresseDuSite();
    await envoyerCourriel({
      a: acces.recoveryEmail,
      sujet: "Réinitialiser votre mot de passe",
      texte: [
        "Bonjour,",
        "",
        "Une réinitialisation du mot de passe de l’outil a été demandée. Ce lien, valable 30 minutes et utilisable une seule fois, permet d’en choisir un nouveau :",
        "",
        `${origine}/connexion/reinitialiser?jeton=${jeton}`,
        "",
        "Si vous n’êtes pas à l’origine de cette demande, ne faites rien : votre mot de passe reste inchangé.",
      ].join("\n"),
    });
  }
  return "Si une adresse de récupération est enregistrée, un lien vient d’y être envoyé. Il est valable 30 minutes.";
}

export async function reinitialiserMotDePasse(
  _etat: string | null,
  f: FormData,
): Promise<string | null> {
  if (tropd(`reinit:${adresseDe(await headers())}`, 10, 60 * 60_000)) {
    return "Trop d’essais. Réessayez dans une heure.";
  }
  const jeton = String(f.get("jeton") ?? "");
  const nouveau = String(f.get("nouveau") ?? "");
  const confirmation = String(f.get("confirmation") ?? "");

  if (nouveau.length < LONGUEUR_MINIMALE)
    return `Le mot de passe doit compter au moins ${LONGUEUR_MINIMALE} caractères.`;
  if (nouveau !== confirmation)
    return "Les deux saisies ne sont pas identiques.";

  const ligne = await prisma.reinitialisationMdp.findUnique({
    where: { jetonHash: empreinteJeton(jeton) },
  });
  if (!ligne || ligne.utiliseAt || ligne.expireAt < new Date()) {
    return "Ce lien n’est plus valable. Demandez-en un nouveau depuis l’écran de connexion.";
  }

  await definirMotDePasse(nouveau);
  await prisma.reinitialisationMdp.update({
    where: { id: ligne.id },
    data: { utiliseAt: new Date() },
  });
  redirect("/connexion?reinit=1");
}
