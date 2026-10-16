/**
 * Données fictives pour les captures d'écran de la documentation.
 *
 * Vise une base locale jetable (voir scripts/capturer-documentation.ts) : le
 * script REFUSE de tourner sur autre chose qu'une base `docs` en local, et vide
 * ses tables avant d'écrire. Aucun nom, aucun numéro ici ne correspond à une
 * personne réelle.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { ajouterJours, instantBruxelles, isoJour, lundiDe } from "../src/lib/format";

const url = process.env.DATABASE_URL ?? "";
if (!/localhost:5544\/docs$/.test(url)) {
  console.error("Refusé : ce script ne vise que postgresql://…@localhost:5544/docs.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const lundi = lundiDe(new Date());
/** Instant à Bruxelles : jour décalé de n par rapport à lundi, à l'heure donnée. */
const quand = (n: number, h: string) => instantBruxelles(isoJour(ajouterJours(lundi, n)), h)!;

async function main() {
  // Vider dans l'ordre des dépendances.
  for (const t of [
    "documents_patient", "passkeys", "appareils_connus", "reinitialisations_mdp", "acces", "attente_rdv", "demandes_rdv", "depenses",
    "categories_depense", "notes", "sessions", "factures_etablissement", "patients", "disponibilites",
    "indisponibilites", "tarifs", "cabinets", "parametres",
  ]) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`).catch(() => undefined);
  }

  await prisma.parametres.create({
    data: {
      id: "global",
      numeroEntreprise: "BE 0000.000.000",
      numeroInami: "000000-00",
      numeroVisa: "000000",
      numeroCommission: "000000000",
      // IBAN d'exemple à clé valide (celui de la norme), pour que les QR de paiement se génèrent.
      iban: "BE68 5390 0754 7034",
      adresseSiege: "Rue de l'Exemple 1\n1000 Bruxelles",
    },
  });

  // Une adresse de récupération fictive : sans elle, la carte « À compléter » s'affiche.
  await prisma.acces.create({ data: { id: "global", recoveryEmail: "praticienne@example.invalid" } });
  const jours = (n: number) => new Date(Date.now() - n * 86_400_000);
  await prisma.appareilConnu.createMany({
    data: [
      { empreinte: "docs-iphone", nom: "Safari sur iPhone", premiereVue: jours(60), derniereVue: jours(0) },
      { empreinte: "docs-mac", nom: "Chrome sur Mac", premiereVue: jours(45), derniereVue: jours(2) },
    ],
  });

  const uccle = await prisma.cabinet.create({
    data: { nom: "Uccle", addressLine: "Rue de l'Exemple 12", postalCode: "1180", city: "Uccle", colorHex: "#00695C", fillHex: "#C7F7EE", vividHex: "#00D9B0", acces: "Bus 48 — arrêt Exemple, 1 min à pied\nTram 4 — Gare, 6 min à pied", ordre: 0 },
  });
  const auderghem = await prisma.cabinet.create({
    data: { nom: "Auderghem", addressLine: "Place de l'Exemple 4", postalCode: "1160", city: "Auderghem", colorHex: "#B01372", fillHex: "#FFDCF0", vividHex: "#FF5FB8", acces: "Tram 8 — Rond-point, 3 min à pied", ordre: 1 },
  });
  const ecole = await prisma.cabinet.create({
    data: { nom: "École", addressLine: "Avenue de l'Exemple 30", postalCode: "1050", city: "Ixelles", colorHex: "#1B5E9E", fillHex: "#D6E8FA", vividHex: "#4DA3FF", ordre: 2, publie: false, factureInstitution: true, tarifHoraireCents: 6000, quotaHebdoMin: 1440, raisonSociale: "École de l'Exemple ASBL", prefixeReference: "EX" },
  });
  for (const [c, jours] of [[uccle, [0, 1, 3]], [auderghem, [2, 4]]] as const) {
    for (const jour of jours) await prisma.disponibilite.create({ data: { cabinetId: c.id, jour, debutMin: 540, finMin: 1020 } });
  }

  const t1 = await prisma.tarif.create({ data: { libelle: "Tarif 1", amountCents: 7000, parDefaut: true, ordre: 0 } });
  const t2 = await prisma.tarif.create({ data: { libelle: "Tarif 2", amountCents: 7500, ordre: 1 } });
  const tc = await prisma.tarif.create({ data: { libelle: "Conventionné (INAMI)", regime: "CONVENTIONNE", amountCents: 9113, parDefaut: true, ordre: 2 } });

  type P = { prenom: string; nom: string; naissance: string; regime: "PRIVE" | "CONVENTIONNE"; tarif: string; tel?: string; email?: string; mere?: string; cabinet: string; ppl?: "SOUTIEN" | "TRAITEMENT" };
  const liste: P[] = [
    { prenom: "Camille", nom: "Dupont", naissance: "1992-04-12", regime: "PRIVE", tarif: t1.id, tel: "0470 00 00 01", email: "camille.dupont@example.be", cabinet: uccle.id },
    { prenom: "Lucas", nom: "Martin", naissance: "2017-06-03", regime: "PRIVE", tarif: t2.id, mere: "parent.martin@example.be", tel: "0470 00 00 02", cabinet: uccle.id },
    { prenom: "Emma", nom: "Peeters", naissance: "2011-09-21", regime: "CONVENTIONNE", tarif: tc.id, mere: "parent.peeters@example.be", tel: "0470 00 00 03", cabinet: auderghem.id, ppl: "SOUTIEN" },
    { prenom: "Noah", nom: "Janssens", naissance: "2007-01-30", regime: "CONVENTIONNE", tarif: tc.id, email: "noah.janssens@example.be", tel: "0470 00 00 04", cabinet: auderghem.id, ppl: "SOUTIEN" },
    { prenom: "Léa", nom: "Dubois", naissance: "1988-11-08", regime: "PRIVE", tarif: t1.id, email: "lea.dubois@example.be", tel: "0470 00 00 05", cabinet: uccle.id },
    { prenom: "Hugo", nom: "Lambert", naissance: "2003-02-14", regime: "PRIVE", tarif: t1.id, email: "hugo.lambert@example.be", tel: "0470 00 00 06", cabinet: uccle.id },
    { prenom: "Zoé", nom: "Claes", naissance: "2019-12-02", regime: "PRIVE", tarif: t2.id, mere: "parent.claes@example.be", tel: "0470 00 00 07", cabinet: auderghem.id },
    { prenom: "Jules", nom: "Maes", naissance: "2001-07-19", regime: "CONVENTIONNE", tarif: tc.id, email: "jules.maes@example.be", tel: "0470 00 00 08", cabinet: uccle.id, ppl: "TRAITEMENT" },
    // Un doublon volontaire, pour la page « Doublons possibles ».
    { prenom: "camille", nom: "DUPONT", naissance: "1992-04-12", regime: "PRIVE", tarif: t1.id, tel: "0470 00 00 99", cabinet: uccle.id },
  ];
  const patients = [];
  for (const p of liste) {
    patients.push(
      await prisma.patient.create({
        data: {
          firstName: p.prenom, lastName: p.nom, birthDate: new Date(p.naissance), scheme: p.regime, tarifId: p.tarif,
          phone: p.tel, email: p.email ?? null, emailMother: p.mere ?? null, cabinetId: p.cabinet,
          ...(p.ppl ? { pplType: p.ppl } : {}), jetonRdv: crypto.randomUUID(),
        },
      }),
    );
  }
  const [camille, lucas, emma, noah, lea, hugo, zoe, jules] = patients;
  await prisma.note.create({ data: { patientId: emma.id, body: "Parents joignables après 17 h, de préférence par téléphone." } });

  type S = { p: typeof camille; cab: string; n: number; h: string; statut?: "SCHEDULED" | "ATTENDED" | "NO_SHOW" | "CANCELLED_IN_TIME"; paye?: boolean; montant: number; ligne?: boolean };
  const prix = (p: typeof camille) => (p.scheme === "CONVENTIONNE" ? 9113 : p.tarifId === t2.id ? 7500 : 7000);
  const seances: S[] = [];
  const ajouter = (p: typeof camille, cab: string, n: number, h: string, statut: S["statut"], paye = false, ligne = false) =>
    seances.push({ p, cab, n, h, statut, paye, montant: prix(p), ligne });
  // Passé : trois semaines d'historique, la plupart payées, quelques impayés.
  for (const [p, cab, jours] of [
    [camille, uccle.id, [-21, -14, -7]], [lucas, uccle.id, [-20, -13, -6]], [emma, auderghem.id, [-19, -12, -5]],
    [noah, auderghem.id, [-18, -11]], [hugo, uccle.id, [-21, -7]], [jules, uccle.id, [-14, -6]], [zoe, auderghem.id, [-12]],
  ] as const) {
    jours.forEach((n, i) => ajouter(p, cab, n, `${10 + (i % 4)}:00`, "ATTENDED", true));
  }
  ajouter(lea, uccle.id, -9, "15:00", "ATTENDED", false);
  ajouter(lea, uccle.id, -2, "15:00", "ATTENDED", false);
  ajouter(hugo, uccle.id, -3, "11:00", "NO_SHOW", false);
  ajouter(zoe, auderghem.id, -4, "16:00", "CANCELLED_IN_TIME", false);
  ajouter(emma, auderghem.id, -2, "14:00", "ATTENDED", false);
  // Cette semaine et la suivante : séances à venir.
  ajouter(camille, uccle.id, 0, "09:00", "SCHEDULED");
  ajouter(lucas, uccle.id, 0, "10:00", "SCHEDULED");
  ajouter(lea, uccle.id, 0, "15:00", "SCHEDULED");
  ajouter(hugo, uccle.id, 1, "11:00", "SCHEDULED");
  ajouter(jules, uccle.id, 1, "14:00", "SCHEDULED");
  ajouter(emma, auderghem.id, 2, "10:00", "SCHEDULED");
  ajouter(zoe, auderghem.id, 2, "13:00", "SCHEDULED");
  ajouter(noah, auderghem.id, 2, "15:00", "SCHEDULED");
  ajouter(camille, uccle.id, 3, "09:00", "SCHEDULED");
  ajouter(lucas, uccle.id, 7, "10:00", "SCHEDULED");
  ajouter(emma, auderghem.id, 9, "10:00", "SCHEDULED");
  for (const s of seances) {
    await prisma.session.create({
      data: {
        patientId: s.p.id, cabinetId: s.cab, startsAt: quand(s.n, s.h), durationMin: 45,
        status: s.statut ?? "SCHEDULED",
        paymentStatus: s.paye ? "PAID" : "DUE", amountCents: s.statut === "ATTENDED" || s.statut === "NO_SHOW" ? s.montant : null,
        paidAt: s.paye ? quand(s.n, s.h) : null, paymentMethod: s.paye ? (s.p.scheme === "CONVENTIONNE" ? "ELECTRONIC" : "CASH") : null,
        reserveeEnLigne: s.p === lucas && s.n === 7,
        jetonPublic: s.p === camille && s.n === 3 ? "demo-seance-0001" : null,
      },
    });
  }
  // École : blocs facturés à l'heure, sans patient.
  for (const n of [-7, -6, 0, 1]) {
    await prisma.session.create({ data: { patientId: null, cabinetId: ecole.id, startsAt: quand(n, "08:30"), durationMin: 180, status: n < 0 ? "ATTENDED" : "SCHEDULED", amountCents: n < 0 ? 18000 : null } });
  }

  await prisma.demandeRdv.createMany({
    data: [
      { firstName: "Sofia", lastName: "Renard", phone: "0470 00 01 01", email: "sofia.renard@example.be", message: "Disponible plutôt en fin de journée.", souhaite: quand(4, "17:00"), cabinetId: uccle.id },
      { firstName: "Thomas", lastName: "Gérard", phone: "0470 00 01 02", souhaite: quand(8, "09:00"), cabinetId: auderghem.id },
    ],
  });
  await prisma.attenteRdv.createMany({
    data: [
      { firstName: "Inès", lastName: "Collin", phone: "0470 00 02 01", email: "ines.collin@example.be", message: "Pour mon fils de 8 ans." },
      { firstName: "Paul", lastName: "Vermeulen", phone: "0470 00 02 02" },
    ],
  });

  const cats = Object.fromEntries(
    await Promise.all(["Loyer", "Supervision", "Formation", "Matériel", "Assurances"].map(async (l, i) => [l, (await prisma.categorieDepense.create({ data: { libelle: l, ordre: i } })).id])),
  );
  const depenses: [number, string, string, string, number][] = [
    [-30, "Loyer du cabinet d'Uccle", "Loyer", "Cabinet Exemple SRL", 45000],
    [-30, "Loyer du cabinet d'Auderghem", "Loyer", "Centre Exemple", 32000],
    [-20, "Séance de supervision", "Supervision", "Dr Exemple", 9000],
    [-12, "Formation d'une journée", "Formation", "Institut Exemple", 18000],
    [-5, "Jeux et matériel de séance", "Matériel", "Librairie Exemple", 4650],
    [-3, "Assurance responsabilité", "Assurances", "Assureur Exemple", 21000],
  ];
  for (const [n, libelle, cat, fournisseur, amountCents] of depenses) {
    await prisma.depense.create({ data: { date: quand(n, "12:00"), libelle, categorieId: cats[cat], fournisseur, amountCents, cabinetId: uccle.id } });
  }
  console.log("Données fictives prêtes :", await prisma.patient.count(), "patients,", await prisma.session.count(), "séances.");
  console.log("PATIENT_ID=" + emma.id + " JETON_SEANCE=");
}
main().finally(() => prisma.$disconnect());
