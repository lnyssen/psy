/**
 * Données de démonstration — entièrement fictives.
 *
 * Cette base ne doit recevoir aucune donnée réelle de patient tant que le
 * chiffrement des notes n'est pas en place et la durée de conservation
 * tranchée. Les personnes, adresses et téléphones ci-dessous n'existent pas.
 * Les trois lieux, eux, sont réels.
 */
import {
  PrismaClient,
  CareScheme,
  SessionStatus,
  PaymentStatus,
  PaymentMethod,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL ou DATABASE_URL est requise.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const DUREE = 45;

function lundi(): Date {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Lundi = 0. Ramené au vendredi le week-end : pas de séance samedi ni dimanche. */
const AUJOURDHUI = Math.min((new Date().getDay() + 6) % 7, 4);

function at(j: number, hour: number, minute = 0): Date {
  const d = lundi();
  d.setDate(d.getDate() + j);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const CABINETS = [
  {
    nom: "Uccle",
    addressLine: "Rue Victor Allard 191",
    postalCode: "1180",
    city: "Uccle",
    colorHex: "#0B7285",
    fillHex: "#E0F1F3",
    ordre: 0,
  },
  {
    nom: "Auderghem",
    addressLine: "Place Félix Govaert 4",
    postalCode: "1160",
    city: "Auderghem",
    colorHex: "#A61E78",
    fillHex: "#FBE4F2",
    ordre: 1,
  },
  {
    nom: "École",
    addressLine: "Adresse à compléter",
    postalCode: "1000",
    city: "Bruxelles",
    colorHex: "#1B4F9C",
    fillHex: "#E5ECF8",
    ordre: 2,
  },
];

const TARIFS = [
  { libelle: "Séance individuelle", amountCents: 6500, parDefaut: true, ordre: 0 },
  { libelle: "Première consultation", amountCents: 8000, parDefaut: false, ordre: 1 },
  { libelle: "Séance longue", amountCents: 9000, parDefaut: false, ordre: 2 },
  { libelle: "Vacation scolaire (horaire)", amountCents: 7500, parDefaut: false, ordre: 3 },
];

type Semee = {
  who: string; jour: number; h: number; m?: number; lieu: string;
  status: SessionStatus; paymentStatus: PaymentStatus; amountCents: number | null;
  paymentMethod?: PaymentMethod;
};

async function main() {
  await prisma.note.deleteMany();
  await prisma.session.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.cabinet.deleteMany();
  await prisma.tarif.deleteMany();

  const c: Record<string, { id: string }> = {};
  for (const data of CABINETS) c[data.nom] = await prisma.cabinet.create({ data });
  for (const data of TARIFS) await prisma.tarif.create({ data });

  const PATIENTS = [
    { firstName: "Camille", lastName: "Dubois", scheme: CareScheme.PRIVE, feeCents: 6500, cabinetId: c["Uccle"].id, phone: "0475 12 34 56", email: "camille.dubois@example.be", addressLine: "12 rue du Doyenné", postalCode: "1180", city: "Uccle", birthDate: new Date("1988-04-17") },
    { firstName: "Thomas", lastName: "Lefèvre", scheme: CareScheme.CONVENTIONNE, feeCents: null, cabinetId: c["Auderghem"].id, phone: "0498 76 54 32", email: "t.lefevre@example.be", addressLine: "88 chaussée de Wavre", postalCode: "1160", city: "Auderghem", birthDate: new Date("1995-11-02") },
    { firstName: "Naïma", lastName: "Ben Salah", scheme: CareScheme.PRIVE, feeCents: 6500, cabinetId: c["Uccle"].id, phone: "0472 45 89 10", email: "naima.bensalah@example.be", addressLine: "5 avenue Brugmann", postalCode: "1190", city: "Forest", birthDate: new Date("1979-06-23") },
    { firstName: "Jonas", lastName: "Vermeulen", scheme: CareScheme.CONVENTIONNE, feeCents: null, cabinetId: c["Auderghem"].id, phone: "0486 33 21 07", email: "jonas.vermeulen@example.be", addressLine: "40 rue Valduc", postalCode: "1160", city: "Auderghem", birthDate: new Date("2001-01-30") },
    { firstName: "Élise", lastName: "Moreau", scheme: CareScheme.PRIVE, feeCents: 7000, cabinetId: c["Uccle"].id, phone: "0491 88 14 25", email: "elise.moreau@example.be", addressLine: "27 rue Vanderkindere", postalCode: "1180", city: "Uccle", birthDate: new Date("1992-09-08") },
    { firstName: "Malik", lastName: "Haddad", scheme: CareScheme.PRIVE, feeCents: 6500, cabinetId: c["Auderghem"].id, phone: "0479 62 40 18", email: "malik.haddad@example.be", addressLine: "3 square des Archiducs", postalCode: "1170", city: "Watermael-Boitsfort", birthDate: new Date("1984-02-14") },
    // Élèves suivis à l'école : facturés à l'établissement, pas au patient.
    { firstName: "Lina", lastName: "Peeters", scheme: CareScheme.INSTITUTION, feeCents: null, cabinetId: c["École"].id, phone: null, email: null, addressLine: null, postalCode: null, city: null, birthDate: new Date("2012-03-05") },
    { firstName: "Ibrahim", lastName: "Sow", scheme: CareScheme.INSTITUTION, feeCents: null, cabinetId: c["École"].id, phone: null, email: null, addressLine: null, postalCode: null, city: null, birthDate: new Date("2011-10-19") },
  ];

  const p: Record<string, { id: string }> = {};
  for (const data of PATIENTS) {
    const cree = await prisma.patient.create({ data });
    p[cree.firstName] = cree;
  }

  const U = "Uccle";
  const A = "Auderghem";
  const E = "École";

  // Les matinées scolaires occupent le début de journée en milieu de semaine :
  // c'est le rythme décrit par la praticienne.
  const base: Semee[] = [
    { who: "Lina", jour: 0, h: 9, lieu: E, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Ibrahim", jour: 0, h: 10, lieu: E, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Malik", jour: 0, h: 14, lieu: A, status: SessionStatus.NO_SHOW, paymentStatus: PaymentStatus.OVERDUE, amountCents: 6500 },
    { who: "Thomas", jour: 1, h: 9, lieu: A, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Malik", jour: 1, h: 10, m: 30, lieu: A, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.PAID, amountCents: 6500, paymentMethod: PaymentMethod.CASH },
    { who: "Camille", jour: 1, h: 10, m: 30, lieu: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.PAID, amountCents: 6500, paymentMethod: PaymentMethod.ELECTRONIC },
    { who: "Lina", jour: 2, h: 9, lieu: E, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Jonas", jour: 2, h: 10, lieu: A, status: SessionStatus.CANCELLED_IN_TIME, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Camille", jour: 2, h: 15, lieu: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.PAID, amountCents: 6500, paymentMethod: PaymentMethod.ELECTRONIC },
    { who: "Ibrahim", jour: 3, h: 9, lieu: E, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Élise", jour: 3, h: 10, m: 30, lieu: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: 7000 },
    { who: "Naïma", jour: 3, h: 14, lieu: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.DUE, amountCents: 6500 },
    { who: "Élise", jour: 4, h: 9, lieu: U, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Naïma", jour: 4, h: 11, lieu: U, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Jonas", jour: 4, h: 15, m: 15, lieu: A, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
  ];

  // La journée du jour est toujours garnie. La séance de 11 h 15 est à
  // Auderghem juste après une séance à Uccle : c'est le conflit de trajet.
  const duJour: Semee[] = [
    { who: "Camille", jour: AUJOURDHUI, h: 9, lieu: U, status: SessionStatus.ATTENDED, paymentStatus: PaymentStatus.PAID, amountCents: 6500, paymentMethod: PaymentMethod.ELECTRONIC },
    { who: "Élise", jour: AUJOURDHUI, h: 10, m: 15, lieu: U, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Malik", jour: AUJOURDHUI, h: 11, m: 15, lieu: A, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Naïma", jour: AUJOURDHUI, h: 14, m: 30, lieu: U, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
    { who: "Thomas", jour: AUJOURDHUI, h: 16, lieu: U, status: SessionStatus.SCHEDULED, paymentStatus: PaymentStatus.DUE, amountCents: null },
  ];

  const seances = [...base.filter((s) => s.jour !== AUJOURDHUI), ...duJour];

  for (const { who, jour, h, m, lieu, ...rest } of seances) {
    const debut = at(jour, h, m ?? 0);
    await prisma.session.create({
      data: {
        ...rest,
        durationMin: DUREE,
        startsAt: debut,
        paidAt: rest.paymentStatus === PaymentStatus.PAID ? debut : null,
        patientId: p[who].id,
        cabinetId: c[lieu].id,
      },
    });
  }

  // La semaine suivante, tout à venir : sans elle la navigation entre semaines
  // ne montrerait rien, et un samedi l'accueil proposerait un lundi vide.
  let aVenir = 0;
  for (const { who, jour, h, m, lieu } of base) {
    await prisma.session.create({
      data: {
        patientId: p[who].id,
        cabinetId: c[lieu].id,
        startsAt: at(jour + 7, h, m ?? 0),
        durationMin: DUREE,
        status: SessionStatus.SCHEDULED,
        paymentStatus: PaymentStatus.DUE,
        amountCents: null,
      },
    });
    aVenir++;
  }

  const notes: [string, string][] = [
    ["Camille", "Préfère les créneaux du matin. Ne pas proposer après 16 h."],
    ["Camille", "Facture à envoyer par courriel, pas de papier."],
    ["Thomas", "Renouvellement de la prescription à vérifier avant la sixième séance."],
    ["Naïma", "Joignable de préférence par SMS."],
    ["Malik", "Deux absences non excusées cette année. Rappeler la veille."],
    ["Lina", "Suivi demandé par la direction. Facturation à l’établissement."],
  ];
  for (const [who, body] of notes) {
    await prisma.note.create({ data: { patientId: p[who].id, body } });
  }

  console.log(
    `Semé : ${CABINETS.length} lieux, ${TARIFS.length} tarifs, ${PATIENTS.length} patients ` +
      `fictifs, ${seances.length + aVenir} séances de ${DUREE} min sur deux semaines, ` +
      `${notes.length} notes.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
