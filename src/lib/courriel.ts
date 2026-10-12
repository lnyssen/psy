import nodemailer from "nodemailer";
import { SITE } from "@/lib/site";
import { FUSEAU } from "@/lib/format";

/**
 * Envoi d'e-mails par le SMTP de la boîte du domaine.
 *
 * Configuration dans l'environnement :
 *   SMTP_HOST, SMTP_PORT (465 par défaut, TLS direct), SMTP_USER, SMTP_PASS ;
 *   MAIL_FROM            expéditeur, par défaut l'adresse du site ;
 *   MAIL_NOTIFICATIONS   où prévenir Amandine, par défaut l'adresse du site.
 *
 * Sans SMTP_HOST, rien ne part et rien ne casse : l'outil fonctionnait sans
 * e-mail avant, il continue. Un échec d'envoi est journalisé mais n'annule
 * jamais l'action qui l'a déclenché — une demande enregistrée reste
 * enregistrée même si le serveur de messagerie boude.
 *
 * Aucun contenu clinique ne passe par ici : l'e-mail n'est pas chiffré de bout
 * en bout, il ne transporte que de la logistique (un créneau, un nom).
 */
function transport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
      : undefined,
  });
}

export function courrielConfigure() {
  return Boolean(process.env.SMTP_HOST);
}

export async function envoyerCourriel(m: {
  a: string;
  sujet: string;
  texte: string;
  repondreA?: string;
  pieces?: { nom: string; contenu: Buffer; type: string }[];
}) {
  const t = transport();
  if (!t) return false;
  try {
    await t.sendMail({
      from: `${SITE.nom} <${process.env.MAIL_FROM || SITE.email}>`,
      to: m.a,
      replyTo: m.repondreA,
      subject: m.sujet,
      text: m.texte,
      attachments: m.pieces?.map((p) => ({
        filename: p.nom,
        content: p.contenu,
        contentType: p.type,
      })),
    });
    return true;
  } catch (e) {
    console.error("Envoi d’e-mail impossible :", e);
    return false;
  }
}

export function adresseNotifications() {
  return process.env.MAIL_NOTIFICATIONS || SITE.email;
}

const fmtCreneau = new Intl.DateTimeFormat("fr-BE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSEAU,
});

/** « mardi 14 octobre à 16:30 » */
export function creneauEnClair(d: Date) {
  return fmtCreneau.format(d);
}
