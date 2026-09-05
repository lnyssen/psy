import { prisma } from "@/lib/db";
import { OFFICE_ADDRESS, OFFICE_LABEL } from "@/lib/format";

/**
 * Flux iCalendar des séances, destiné à être suivi depuis Google Calendar,
 * Apple Calendrier ou tout autre agenda.
 *
 * Aucun nom de patient n'y figure. Un événement dit où être et quand, ce qui
 * est tout ce qu'un agenda de téléphone doit dire : envoyer les noms
 * reviendrait à transférer des données de santé chez un tiers, et à les
 * afficher sur l'écran de verrouillage du téléphone. Le nom se lit dans
 * l'application.
 *
 * L'adresse du cabinet est en revanche portée par le champ LOCATION : c'est
 * elle qui permet de lancer un itinéraire depuis l'événement.
 *
 * L'accès repose sur un jeton secret dans l'URL, comparé en temps constant.
 * C'est le mécanisme habituel des agendas privés — un agenda suivi ne peut pas
 * s'authentifier autrement — et il vaut mot de passe : diffuser l'adresse,
 * c'est diffuser l'agenda.
 */
export const dynamic = "force-dynamic";

/** Comparaison à durée constante, pour ne pas laisser deviner le jeton. */
function memeJeton(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Échappement iCalendar : la virgule, le point-virgule et la barre oblique
 *  inverse sont des séparateurs, le saut de ligne s'écrit \n. */
function echapper(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Pliage à 75 octets, comme l'exige la RFC 5545. */
function plier(ligne: string) {
  const octets = Buffer.from(ligne, "utf8");
  if (octets.length <= 75) return ligne;
  const morceaux: string[] = [];
  let debut = 0;
  let limite = 75;
  while (debut < octets.length) {
    let fin = Math.min(debut + limite, octets.length);
    // Ne pas couper au milieu d'un caractère multioctet.
    while (fin > debut && fin < octets.length && (octets[fin] & 0xc0) === 0x80) fin--;
    morceaux.push(octets.subarray(debut, fin).toString("utf8"));
    debut = fin;
    limite = 74; // les lignes suivantes commencent par une espace
  }
  return morceaux.join("\r\n ");
}

const horodatage = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export async function GET(_req: Request, { params }: { params: Promise<{ jeton: string }> }) {
  const attendu = process.env.AGENDA_TOKEN;
  if (!attendu) {
    return new Response("Flux non configuré : AGENDA_TOKEN est absente.", { status: 503 });
  }

  const { jeton } = await params;
  const fourni = jeton.replace(/\.ics$/i, "");
  if (!memeJeton(fourni, attendu)) {
    return new Response("Introuvable.", { status: 404 });
  }

  // Fenêtre glissante : deux mois en arrière, un an en avant. Inutile de
  // charger un agenda de téléphone avec un historique complet.
  const debut = new Date();
  debut.setMonth(debut.getMonth() - 2);
  const fin = new Date();
  fin.setFullYear(fin.getFullYear() + 1);

  const seances = await prisma.session.findMany({
    where: { startsAt: { gte: debut, lt: fin } },
    orderBy: { startsAt: "asc" },
  });

  const maintenant = horodatage(new Date());
  const lignes: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Amapsy SRL//Agenda des séances//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Amapsy — séances",
    "X-WR-TIMEZONE:Europe/Brussels",
    // Indications de rafraîchissement. Google les traite comme un vœu, pas
    // comme une consigne : le flux peut mettre plusieurs heures à se mettre à
    // jour de son côté.
    "REFRESH-INTERVAL;VALUE=DURATION:PT2H",
    "X-PUBLISHED-TTL:PT2H",
  ];

  for (const s of seances) {
    const finSeance = new Date(s.startsAt.getTime() + s.durationMin * 60_000);
    lignes.push(
      "BEGIN:VEVENT",
      `UID:${s.id}@pratique-psy`,
      `DTSTAMP:${maintenant}`,
      `DTSTART:${horodatage(s.startsAt)}`,
      `DTEND:${horodatage(finSeance)}`,
      // Le titre ne porte que le lieu : jamais le patient.
      `SUMMARY:${echapper(`Séance — ${OFFICE_LABEL[s.office]}`)}`,
      `LOCATION:${echapper(OFFICE_ADDRESS[s.office])}`,
      `DESCRIPTION:${echapper("Détail du rendez-vous dans l’outil de gestion.")}`,
      // Une annulation à temps reste dans le flux, marquée annulée : l'agenda
      // qui suit le flux la fait alors disparaître de lui-même.
      `STATUS:${s.status === "CANCELLED_IN_TIME" ? "CANCELLED" : "CONFIRMED"}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }

  lignes.push("END:VCALENDAR");

  return new Response(lignes.map(plier).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="amapsy-seances.ics"',
      "Cache-Control": "no-store",
      // Un flux d'agenda ne doit jamais être indexé.
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
