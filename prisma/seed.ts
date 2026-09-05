/**
 * Données de démonstration — entièrement fictives.
 *
 * Cette base de test ne doit recevoir aucune donnée réelle de patient tant que
 * les accords de sous-traitance (Neon, Vercel) ne sont pas signés, le
 * chiffrement des notes en place et la durée de conservation tranchée. Les
 * personnes, adresses et téléphones ci-dessous n'existent pas.
 */
import {
  PrismaClient,
  CareScheme,
  SessionStatus,
  PaymentStatus,
  PaymentMethod,
  Office,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL ou DATABASE_URL est requise.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const DUREE = 45;

/** Lundi de la semaine en cours. */
function lundi(): Date {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Indice du jour courant, lundi = 0. Ramené au vendredi le week-end : il n'y
 *  a pas de séance le samedi ni le dimanche. */
const AUJOURDHUI = Math.min((new Date().getDay() + 6) % 7, 4);

function at(j: number, hour: number, minute = 0): Date {
  const d = lundi();
  d.setDate(d.getDate() + j);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const PATIENTS = [
  {
    firstName: "Camille", lastName: "Dubois", scheme: CareScheme.PRIVE, feeCents: 6500,
    usualOffice: Office.UCCLE, phone: "0475 12 34 56", email: "camille.dubois@example.be",
    addressLine: "12 rue du Doyenné", postalCode: "1180", city: "Uccle",
    birthDate: new Date("1988-04-17"),
  },
  {
    firstName: "Thomas", lastName: "Lefèvre", scheme: CareScheme.CONVENTIONNE, feeCents: null,
    usualOffice: Office.AUDERGHEM, phone: "0498 76 54 32", email: "t.lefevre@example.be",
    addressLine: "88 chaussée de Wavre", postalCode: "1160", city: "Auderghem",
    birthDate: new Date("1995-11-02"),
  },
  {
    firstName: "Naïma", lastName: "Ben Salah", scheme: CareScheme.PRIVE, feeCents: 6500,
    usualOffice: Office.UCCLE, phone: "0472 45 89 10", email: "naima.bensalah@example.be",
    addressLine: "5 avenue Brugmann", postalCode: "1190", city: "Forest",
    birthDate: new Date("1979-06-23"),
  },
  {
    firstName: "Jonas", lastName: "Vermeulen", scheme: CareScheme.CONVENTIONNE, feeCents: null,
    usualOffice: Office.AUDERGHEM, phone: "0486 33 21 07", email: "jonas.vermeulen@example.be",
    addressLine: "40 rue Valduc", postalCode: "1160", city: "Auderghem",
    birthDate: new Date("2001-01-30"),
  },
  {
    firstName: "Élise", lastName: "Moreau", scheme: CareScheme.PRIVE, feeCents: 7000,
    usualOffice: Office.UCCLE, phone: "0491 88 14 25", email: "elise.moreau@example.be",
    addressLine: "27 rue Vanderkindere", postalCode: "1180", city: "Uccle",
    birthDate: new Date("1992-09-08"),
  },
  {
    firstName: "Malik", lastName: "Haddad", scheme: CareScheme.PRIVE, feeCents: 6500,
    usualOffice: Office.AUDERGHEM, phone: "0479 62 40 18", email: "malik.haddad@example.be",
    addressLine: "3 square des Archiducs", postalCode: "1170", city: "Watermael-Boitsfort",
    birthDate: new Date("1984-02-14"),
  },
];

type Semee = {
  who: string; jour: number; h: number; m?: number; office: Office;
  status: SessionStatus; paymentStatus: PaymentStatus; amountCents: number | null;
  paymentMethod?: PaymentMethod;
};

async function main() {
  await prisma.note.deleteMany();
  await prisma.session.deleteMany();
  await prisma.patient.deleteMany();

  const p: Record<string, { id: string }> = {};
  for (const data of PATIENTS) {
    const cree = await prisma.patient.create({ data });
    p[cree.firstName] = cree;
  }

  const U = Office.UCCLE;
  const A = Office.AUDERGHEM;

  // Auderghem en début de semaine, Uccle en fin. Les cas limites sont
  // volontaires : une absence non excusée qui reste due, une annulation à
  // temps non facturable, un impayé, les deux régimes, les deux modes de
  // paiement, et deux séances qui se chevauchent pour éprouver la grille.
  const base: Semee[] = [
    { who: "Thomas", jour: 0, h: 9, office: A, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Jonas", jour: 0, h: 10, office: A, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Malik", jour: 0, h: 14, office: A, status: SessionStatus.NO_SHOW, paymentStatus: PaymentStatus.OVERDUE, amountCents: 6500 },
    { who: "Thomas", jour: 1, h: 9, office: A, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Malik", jour: 1, h: 10, m: 30, office: A, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.PAID, amountCents: 6500, paymentMethod: PaymentMethod.CASH },
    { who: "Camille", jour: 1, h: 10, m: 30, office: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.PAID, amountCents: 6500, paymentMethod: PaymentMethod.ELECTRONIC },
    { who: "Jonas", jour: 2, h: 10, office: A, status: SessionStatus.CANCELLED_IN_TIME, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Camille", jour: 2, h: 15, office: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.PAID, amountCents: 6500, paymentMethod: PaymentMethod.ELECTRONIC },
    { who: "Camille", jour: 3, h: 9, office: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.PAID, amountCents: 6500, paymentMethod: PaymentMethod.CASH },
    { who: "Élise", jour: 3, h: 10, m: 30, office: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: 7000 },
    { who: "Naïma", jour: 3, h: 14, office: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: 6500 },
    { who: "Élise", jour: 4, h: 9, office: U, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Naïma", jour: 4, h: 11, office: U, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Jonas", jour: 4, h: 15, m: 15, office: A, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
  ];

  // La journée du jour est toujours garnie, pour que l'écran d'accueil ne soit
  // jamais vide en démonstration. La séance de 11 h 15 est à Auderghem juste
  // après une séance à Uccle : c'est le conflit de trajet que l'agenda signale.
  const duJour: Semee[] = [
    { who: "Camille", jour: AUJOURDHUI, h: 9, office: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.PAID, amountCents: 6500, paymentMethod: PaymentMethod.ELECTRONIC },
    { who: "Élise", jour: AUJOURDHUI, h: 10, m: 15, office: U, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Malik", jour: AUJOURDHUI, h: 11, m: 15, office: A, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Naïma", jour: AUJOURDHUI, h: 14, m: 30, office: U, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Thomas", jour: AUJOURDHUI, h: 16, office: U, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
  ];

  const seances = [...base.filter((s) => s.jour !== AUJOURDHUI), ...duJour];

  for (const { who, jour, h, m, ...rest } of seances) {
    const debut = at(jour, h, m ?? 0);
    await prisma.session.create({
      data: {
        ...rest,
        durationMin: DUREE,
        startsAt: debut,
        // Une séance payée porte sa date d'encaissement : le reçu la mentionne.
        paidAt: rest.paymentStatus === PaymentStatus.PAID ? debut : null,
        patientId: p[who].id,
      },
    });
  }

  // La semaine suivante est garnie elle aussi : sans quoi la navigation entre
  // semaines ne montrerait rien, et l'écran d'accueil consulté un samedi
  // proposerait un lundi vide. Tout y est à venir et dû, par construction.
  let aVenir = 0;
  for (const { who, jour, h, m, office } of base) {
    const debut = at(jour + 7, h, m ?? 0);
    await prisma.session.create({
      data: {
        patientId: p[who].id,
        startsAt: debut,
        durationMin: DUREE,
        office,
        status: SessionStatus.SCHEDULED,
        paymentStatus: PaymentStatus.DUE,
        amountCents: null,
      },
    });
    aVenir++;
  }

  // Notes de dossier — administratives, jamais cliniques : le chiffrement
  // n'est pas en place, et cette base est publique.
  const notes: [string, string][] = [
    ["Camille", "Préfère les créneaux du matin. Ne pas proposer après 16 h."],
    ["Camille", "Facture à envoyer par courriel, pas de papier."],
    ["Thomas", "Renouvellement de la prescription à vérifier avant la sixième séance."],
    ["Naïma", "Joignable de préférence par SMS."],
    ["Malik", "Deux absences non excusées cette année. Rappeler la veille."],
  ];
  for (const [who, body] of notes) {
    await prisma.note.create({ data: { patientId: p[who].id, body } });
  }

  console.log(
    `Semé : ${PATIENTS.length} patients fictifs, ${seances.length + aVenir} séances de ${DUREE} min ` +
      `sur deux semaines, ${notes.length} notes, 2 cabinets, lundi à vendredi.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
