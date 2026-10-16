import { createHash, randomBytes } from "node:crypto";
import { after } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { adresseDe } from "@/lib/limite";
import { creneauEnClair, envoyerCourriel } from "@/lib/courriel";

/**
 * Alerte de connexion depuis un appareil inconnu.
 *
 * À chaque connexion réussie (mot de passe ou Face ID), le navigateur reçoit un
 * cookie long portant un identifiant aléatoire. Si ce cookie manque, ou si son
 * empreinte n'est pas connue, c'est un nouvel appareil : un e-mail part à
 * l'adresse de récupération. Une personne qui aurait obtenu le mot de passe est
 * ainsi prévenue… la praticienne l'est aussi, sans rien avoir à surveiller.
 *
 * Limites, dites à l'écran : un navigateur dont on a vidé les cookies compte
 * comme un nouvel appareil (une alerte de trop, jamais une de moins) ; l'alerte
 * prévient, elle ne bloque pas.
 */
export const COOKIE_APPAREIL = "amapsy_appareil";
const UN_AN_S = 365 * 24 * 3600;

export function empreinteAppareil(identifiant: string) {
  return createHash("sha256").update(identifiant).digest("hex");
}

/** « Safari sur iPhone » à partir du user-agent ; jamais le texte brut. */
export function libelleAppareil(ua: string | null | undefined) {
  if (!ua) return "Appareil inconnu";
  const systeme = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Macintosh|Mac OS X/.test(ua)
            ? "Mac"
            : /Linux/.test(ua)
              ? "Linux"
              : null;
  // L'ordre compte : Edge et Chrome se disent aussi Safari ; Chrome sur iOS se dit CriOS.
  const navigateur = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\/|FxiOS/.test(ua)
        ? "Firefox"
        : /Chrome\/|CriOS/.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : null;
  if (navigateur && systeme) return `${navigateur} sur ${systeme}`;
  return navigateur ?? systeme ?? "Appareil inconnu";
}

/**
 * À appeler juste après avoir ouvert la session. Ne lève jamais : une alerte
 * qui échoue ne doit pas empêcher d'entrer.
 */
export async function noterConnexion(moyen: "mot de passe" | "Face ID, Touch ID ou empreinte") {
  try {
    const jar = await cookies();
    const h = await headers();
    const nom = libelleAppareil(h.get("user-agent"));
    const presente = jar.get(COOKIE_APPAREIL)?.value;
    const identifiant = presente || randomBytes(24).toString("base64url");
    const empreinte = empreinteAppareil(identifiant);

    const connu = presente
      ? await prisma.appareilConnu.findUnique({ where: { empreinte } })
      : null;

    if (connu) {
      await prisma.appareilConnu.update({ where: { id: connu.id }, data: { derniereVue: new Date(), nom } });
    } else {
      await prisma.appareilConnu.create({ data: { empreinte, nom } });
    }
    jar.set(COOKIE_APPAREIL, identifiant, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: UN_AN_S,
    });

    if (!connu) {
      const adresse = adresseDe(h);
      after(() => alerter({ nom, moyen, adresse, quand: new Date() }));
    }
  } catch (e) {
    console.error("Suivi de l’appareil impossible :", e);
  }
}

async function alerter(o: { nom: string; moyen: string; adresse: string; quand: Date }) {
  try {
    const acces = await prisma.acces.findUnique({ where: { id: "global" } });
    if (!acces?.recoveryEmail) return;
    await envoyerCourriel({
      a: acces.recoveryEmail,
      sujet: "Nouvelle connexion à votre outil",
      texte: [
        "Bonjour,",
        "",
        "Votre outil vient d’être ouvert depuis un appareil qu’il ne connaissait pas :",
        "",
        `  Quand : ${creneauEnClair(o.quand)}`,
        `  Appareil : ${o.nom}`,
        `  Connexion par : ${o.moyen}`,
        `  Adresse réseau : ${o.adresse}`,
        "",
        "Si c’est vous (nouvel ordinateur, téléphone, navigateur dont les cookies ont été effacés), il n’y a rien à faire : cet appareil est désormais connu et ne vous écrira plus.",
        "",
        "Si ce n’est pas vous, changez le mot de passe sans attendre (Réglages › Sécurité, depuis un appareil de confiance) et retirez les appareils que vous ne reconnaissez pas.",
        "",
        "— Message automatique, merci de ne pas y répondre.",
      ].join("\n"),
    });
  } catch (e) {
    console.error("Alerte de nouvel appareil impossible :", e);
  }
}
