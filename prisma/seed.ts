/**
 * Données de démonstration — entièrement fictives.
 *
 * Cette base de test ne doit recevoir aucune donnée réelle de patient tant que
 * les accords de sous-traitance (Neon, Vercel) ne sont pas signés et la durée
 * de conservation tranchée. Les personnes ci-dessous n'existent pas.
 *
 * Les séances sont ancrées sur le jour d'exécution, pour que l'écran
 * « Aujourd'hui » ne soit jamais vide en démonstration.
 */
import { PrismaClient, CareScheme, SessionStatus, PaymentStatus, Office } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

// Comme dans prisma.config.ts : la CLI ne lit pas .env.local d'elle-même.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL ou DATABASE_URL est requise.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Lundi de la semaine en cours. */
function lundi(): Date {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Indice du jour courant dans la semaine, lundi = 0, ramené au samedi si
 *  l'on est dimanche : la grille ne montre pas le dimanche. */
const AUJOURDHUI = Math.min((new Date().getDay() + 6) % 7, 5);

/** Séance placée sur le jour `j` de la semaine (0 = lundi), à l'heure dite. */
function at(j: number, hour: number, minute = 0): Date {
  const d = lundi();
  d.setDate(d.getDate() + j);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const PATIENTS = [
  { firstName: "Camille", lastName: "Dubois", scheme: CareScheme.PRIVE, feeCents: 6500, usualOffice: Office.UCCLE },
  { firstName: "Thomas", lastName: "Lefèvre", scheme: CareScheme.CONVENTIONNE, feeCents: null, usualOffice: Office.AUDERGHEM },
  { firstName: "Naïma", lastName: "Ben Salah", scheme: CareScheme.PRIVE, feeCents: 6500, usualOffice: Office.UCCLE },
  { firstName: "Jonas", lastName: "Vermeulen", scheme: CareScheme.CONVENTIONNE, feeCents: null, usualOffice: Office.AUDERGHEM },
  { firstName: "Élise", lastName: "Moreau", scheme: CareScheme.PRIVE, feeCents: 7000, usualOffice: Office.UCCLE },
  { firstName: "Malik", lastName: "Haddad", scheme: CareScheme.PRIVE, feeCents: 6500, usualOffice: Office.AUDERGHEM },
];

async function main() {
  await prisma.session.deleteMany();
  await prisma.patient.deleteMany();

  const p: Record<string, { id: string }> = {};
  for (const data of PATIENTS) {
    const created = await prisma.patient.create({ data });
    p[created.firstName] = created;
  }

  const U = Office.UCCLE;
  const A = Office.AUDERGHEM;

  // Une semaine plausible, à jours fixes (0 = lundi … 5 = samedi) : Auderghem
  // en début de semaine, Uccle en fin. Les cas limites sont volontaires — une
  // absence non excusée qui reste due, une annulation à temps non facturable,
  // un impayé, et les deux régimes.
  type Semee = {
    who: string;
    jour: number;
    h: number;
    m?: number;
    office: Office;
    status: SessionStatus;
    paymentStatus: PaymentStatus;
    amountCents: number | null;
  };

  const base: Semee[] = [
    { who: "Thomas", jour: 0, h: 9, office: A, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Jonas", jour: 0, h: 10, office: A, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Malik", jour: 0, h: 14, office: A, status: SessionStatus.NO_SHOW, paymentStatus: PaymentStatus.OVERDUE, amountCents: 6500 },
    { who: "Thomas", jour: 1, h: 9, office: A, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Malik", jour: 1, h: 11, office: A, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.PAID, amountCents: 6500 },
    { who: "Jonas", jour: 2, h: 10, office: A, status: SessionStatus.CANCELLED_IN_TIME, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Camille", jour: 2, h: 15, office: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.PAID, amountCents: 6500 },
    { who: "Camille", jour: 3, h: 9, office: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.PAID, amountCents: 6500 },
    { who: "Élise", jour: 3, h: 10, m: 30, office: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: 7000 },
    { who: "Naïma", jour: 3, h: 14, office: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: 6500 },
    { who: "Élise", jour: 4, h: 9, office: U, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Naïma", jour: 4, h: 11, office: U, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Camille", jour: 5, h: 10, office: U, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
  ];

  // Le jour courant reçoit toujours sa propre journée, pour que l'écran
  // « Aujourd'hui » ne soit jamais vide en démonstration. La séance de 11h est
  // à Auderghem juste après une séance à Uccle : c'est le conflit de trajet
  // que l'agenda doit signaler.
  const duJour: Semee[] = [
    { who: "Camille", jour: AUJOURDHUI, h: 9, office: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.PAID, amountCents: 6500 },
    { who: "Élise", jour: AUJOURDHUI, h: 10, office: U, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Malik", jour: AUJOURDHUI, h: 11, office: A, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Naïma", jour: AUJOURDHUI, h: 15, office: U, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
  ];

  const seances = [...base.filter((s) => s.jour !== AUJOURDHUI), ...duJour];

  for (const { who, jour, h, m, ...rest } of seances) {
    await prisma.session.create({
      data: { ...rest, startsAt: at(jour, h, m ?? 0), patientId: p[who].id },
    });
  }

  console.log(`Semé : ${PATIENTS.length} patients fictifs, ${seances.length} séances, 2 cabinets.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
