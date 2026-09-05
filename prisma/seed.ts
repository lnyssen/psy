/**
 * Données de démonstration — entièrement fictives.
 *
 * Cette base de test ne doit recevoir aucune donnée réelle de patient tant que
 * les accords de sous-traitance (Neon, Vercel) ne sont pas signés et la durée
 * de conservation tranchée. Les personnes ci-dessous n'existent pas.
 */
import { PrismaClient, CareScheme, SessionStatus, PaymentStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

// Comme dans prisma.config.ts : la CLI ne lit pas .env.local d'elle-même.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL ou DATABASE_URL est requise.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Lundi de la semaine en cours, à minuit. */
function mondayOfThisWeek(): Date {
  const d = new Date();
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function at(dayOffset: number, hour: number, minute = 0): Date {
  const d = mondayOfThisWeek();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const PATIENTS = [
  { firstName: "Camille", lastName: "Dubois", scheme: CareScheme.PRIVE, feeCents: 6500 },
  { firstName: "Thomas", lastName: "Lefèvre", scheme: CareScheme.CONVENTIONNE, feeCents: null },
  { firstName: "Naïma", lastName: "Ben Salah", scheme: CareScheme.PRIVE, feeCents: 6500 },
  { firstName: "Jonas", lastName: "Vermeulen", scheme: CareScheme.CONVENTIONNE, feeCents: null },
  { firstName: "Élise", lastName: "Moreau", scheme: CareScheme.PRIVE, feeCents: 7000 },
];

async function main() {
  await prisma.session.deleteMany();
  await prisma.patient.deleteMany();

  const patients = [];
  for (const p of PATIENTS) {
    patients.push(await prisma.patient.create({ data: p }));
  }

  // Une semaine plausible : deux jours passés déjà statués, le reste à venir.
  // Les cas volontairement présents : une absence non excusée qui reste due,
  // une annulation à temps non facturable, un impayé, et les deux régimes.
  const [camille, thomas, naima, jonas, elise] = patients;
  const seances = [
    { patient: camille, startsAt: at(0, 9), status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.PAID, amountCents: 6500, paidAt: at(0, 10) },
    { patient: thomas, startsAt: at(0, 11), status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { patient: naima, startsAt: at(0, 14), status: SessionStatus.NO_SHOW, paymentStatus: PaymentStatus.OVERDUE, amountCents: 6500 },
    { patient: elise, startsAt: at(1, 9, 30), status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: 7000 },
    { patient: jonas, startsAt: at(1, 11), status: SessionStatus.CANCELLED_IN_TIME, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { patient: camille, startsAt: at(2, 9), status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { patient: thomas, startsAt: at(3, 11), status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { patient: naima, startsAt: at(4, 14), status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
  ];

  for (const s of seances) {
    const { patient, ...rest } = s;
    await prisma.session.create({ data: { ...rest, patientId: patient.id } });
  }

  console.log(`Semé : ${patients.length} patients fictifs, ${seances.length} séances.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
