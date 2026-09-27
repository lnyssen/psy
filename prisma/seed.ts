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
  CategorieDepense,
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
    colorHex: "#056A73",
    fillHex: "#C6F4F8",
    vividHex: "#00C8D4",
    // Arrêts STIB relevés sur les données cartographiques ouvertes : géocodage
    // de l'adresse, puis relations d'itinéraire desservant chaque arrêt dans un
    // rayon de sept cents mètres, distances calculées et converties en minutes
    // de marche. Trois exclusions volontaires : le tram 97, qui dessert Wagon
    // mais reste suspendu pour travaux ; les Noctis N11, qui ne roulent que les
    // nuits de week-end ; et les lignes De Lijn et TEC, qui ne sont pas STIB.
    acces: [
      "Victor Allard · 1 min — bus 48, 74",
      "Aulne · 4 min — bus 48, 74",
      "Uccle-Stalle · 5 min — bus 74, et la gare",
      "Decroly · 6 min — bus 48, 74",
      "Wagon · 6 min — tram 4",
      "Égide Van Ophem · 8 min — tram 4",
      "Globe · 8 min — tram 4, 18",
      "Xavier de Bue · 8 min — tram 18",
      "Rittweger · 8 min — tram 18",
      "Merlo · 9 min — tram 82",
      "Carrefour Stalle · 9 min — tram 82",
    ].join("\n"),
    ordre: 0,
  },
  {
    nom: "Auderghem",
    addressLine: "Place Félix Govaert 4",
    postalCode: "1160",
    city: "Auderghem",
    colorHex: "#A8005A",
    fillHex: "#FFD6EA",
    vividHex: "#FF2D8F",
    acces: [
      "Rond-point du Souverain · 3 min — tram 8, bus 34",
      "Empain · 5 min — tram 8",
      "Auderghem-Shopping · 7 min — tram 8, bus 34",
      "Bergoje · 7 min — bus 34",
      "Valduc · 9 min — bus 34",
      "Sainte-Anne · 9 min — bus 34",
      "Deux Chaussées · 9 min — bus 34",
      "Herrmann-Debroux ou Demey · 13 min — métro 5",
    ].join("\n"),
    ordre: 1,
  },
  {
    nom: "École",
    addressLine: "Adresse à compléter",
    postalCode: "1000",
    city: "Bruxelles",
    colorHex: "#1A45B8",
    fillHex: "#D9E4FF",
    vividHex: "#2B6BFF",
    ordre: 2,
    // L'école n'est pas un lieu où l'on prend rendez-vous : elle n'a rien à
    // faire sur le site public.
    publie: false,
    // Vingt-quatre heures par semaine, convenues avec l'établissement — et
    // facturées à l'heure plutôt que par élève, d'où le tarif horaire plutôt
    // qu'un tarif de la grille.
    quotaHebdoMin: 24 * 60,
    factureInstitution: true,
    tarifHoraireCents: 7500,
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
  // Paramètres de la pratique. Un battement de quinze minutes plutôt que zéro :
  // une psychologue note, souffle et accueille entre deux patients, et la
  // valeur par défaut du schéma serait irréaliste en démonstration.
  await prisma.parametres.upsert({
    where: { id: "global" },
    update: {
      dureeSeanceMin: DUREE,
      battementMin: 15,
      trajetMin: 30,
      pasMin: 15,
      horizonSemaines: 4,
      chainerSeances: true,
    },
    create: {
      id: "global",
      dureeSeanceMin: DUREE,
      battementMin: 15,
      trajetMin: 30,
      pasMin: 15,
      horizonSemaines: 4,
      chainerSeances: true,
    },
  });

  await prisma.demandeRdv.deleteMany();
  await prisma.disponibilite.deleteMany();
  await prisma.indisponibilite.deleteMany();
  await prisma.note.deleteMany();
  await prisma.depense.deleteMany();
  await prisma.factureEtablissement.deleteMany();
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

  const p: Record<string, { id: string; jetonRdv: string | null }> = {};
  for (const data of PATIENTS) {
    // Jeton personnel de réservation : il vaut reconnaissance du patient et
    // lui ouvre la réservation directe depuis le site.
    const cree = await prisma.patient.create({
      data: { ...data, jetonRdv: crypto.randomUUID() },
    });
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

  // Horaires d'ouverture. Les matinées scolaires occupent le début de semaine,
  // Auderghem les après-midi de début de semaine, Uccle la fin de semaine.
  const OUVERTURES: [string, number, number, number][] = [
    ["École", 0, 8 * 60 + 30, 12 * 60 + 30],
    ["École", 2, 8 * 60 + 30, 12 * 60 + 30],
    ["Auderghem", 0, 13 * 60 + 30, 18 * 60],
    ["Auderghem", 1, 13 * 60 + 30, 18 * 60],
    ["Auderghem", 4, 14 * 60, 18 * 60],
    ["Uccle", 1, 9 * 60, 12 * 60 + 30],
    ["Uccle", 2, 13 * 60 + 30, 18 * 60],
    ["Uccle", 3, 9 * 60, 18 * 60],
    ["Uccle", 4, 9 * 60, 13 * 60],
  ];
  for (const [lieu, jour, debutMin, finMin] of OUVERTURES) {
    await prisma.disponibilite.create({
      data: { cabinetId: c[lieu].id, jour, debutMin, finMin },
    });
  }

  // Un congé à venir, pour éprouver la soustraction des créneaux.
  const congeDebut = new Date();
  congeDebut.setDate(congeDebut.getDate() + 21);
  congeDebut.setHours(0, 0, 0, 0);
  const congeFin = new Date(congeDebut);
  congeFin.setDate(congeFin.getDate() + 7);
  await prisma.indisponibilite.create({
    data: { debut: congeDebut, fin: congeFin, motif: "Congé" },
  });

  // Une demande en attente, pour que l'écran de traitement ne soit pas vide.
  const souhaite = new Date();
  souhaite.setDate(souhaite.getDate() + 9);
  souhaite.setHours(10, 0, 0, 0);
  await prisma.demandeRdv.create({
    data: {
      firstName: "Sophie",
      lastName: "Delvaux",
      email: "sophie.delvaux@example.be",
      phone: "0477 21 45 63",
      message: "Bonjour, je souhaiterais un premier rendez-vous. Merci.",
      souhaite,
      cabinetId: c["Uccle"].id,
    },
  });

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

  // Deux dépenses de démonstration, sans reçu joint : la photo est un geste de
  // l'utilisatrice, pas quelque chose qu'un jeu de données peut simuler.
  const DEPENSES: {
    libelle: string; categorie: CategorieDepense; montant: number; jour: number; cabinet?: string; fournisseur?: string;
  }[] = [
    { libelle: "Assurance RC professionnelle", categorie: CategorieDepense.ASSURANCE, montant: 42000, jour: 3, fournisseur: "AG Assurances" },
    { libelle: "Loyer du mois — Uccle", categorie: CategorieDepense.LOYER, montant: 85000, jour: 1, cabinet: "Uccle" },
  ];
  const ceMois = new Date();
  ceMois.setDate(1);
  for (const d of DEPENSES) {
    const date = new Date(ceMois);
    date.setDate(d.jour);
    await prisma.depense.create({
      data: {
        libelle: d.libelle,
        categorie: d.categorie,
        amountCents: d.montant,
        date,
        fournisseur: d.fournisseur ?? null,
        cabinetId: d.cabinet ? c[d.cabinet].id : null,
      },
    });
  }

  console.log(
    `Semé : ${CABINETS.length} lieux, ${TARIFS.length} tarifs, ${PATIENTS.length} patients ` +
      `fictifs, ${seances.length + aVenir} séances de ${DUREE} min sur deux semaines, ` +
      `${notes.length} notes, ${OUVERTURES.length} plages d'ouverture, 1 congé, 1 demande, ` +
      `paramètres posés.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
