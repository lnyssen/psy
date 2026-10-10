/**
 * Vérification ponctuelle de la reconnaissance d'un patient dans le titre
 * d'un événement Google (lib/google-correspondance.ts). Sans base de données.
 *
 *   npx tsx scripts/verifier-correspondance.ts
 */
import assert from "node:assert/strict";
import { cabinetDesLieux, normaliser, patientDuTitre } from "../src/lib/google-correspondance";

const patients = [
  { id: "eloise", firstName: "Éloïse", lastName: "D’Hondt" },
  { id: "jp", firstName: "Jean-Pierre", lastName: "Martin" },
  { id: "lea1", firstName: "Léa", lastName: "Dubois" },
  { id: "lea2", firstName: "Lea", lastName: "Dubois" },
  { id: "tom", firstName: "Tom", lastName: "Van der Berg" },
];
const id = (titre: string) => patientDuTitre(titre, patients)?.patient.id ?? null;

assert.equal(normaliser("  Éloïse  D’HONDT. "), "eloise d hondt");
// Accents, casse, apostrophes.
assert.equal(id("eloise d'hondt"), "eloise");
assert.equal(id("ÉLOÏSE D HONDT"), "eloise");
// Ordre inversé.
assert.equal(id("D'Hondt Éloïse"), "eloise");
assert.equal(id("Martin Jean Pierre"), "jp");
// Suffixe de lieu, au format de l'app et au tiret simple.
assert.deepEqual(patientDuTitre("Jean-Pierre Martin — Ixelles", patients), {
  patient: patients[1],
  lieu: "Ixelles",
});
assert.equal(id("Tom Van der Berg - Uccle"), "tom");
// Homonymes : rien.
assert.equal(id("Léa Dubois"), null);
// Partiel ou approximatif : rien.
assert.equal(id("Martin"), null);
assert.equal(id("Jean-Pierre"), null);
assert.equal(id("Jean-Pierre Martinez"), null);
assert.equal(id("RDV Jean-Pierre Martin"), null);
assert.equal(id("Jean-Pierre Martin Ixelles"), null);
assert.equal(id(""), null);

const cab = (o: Partial<Parameters<typeof cabinetDesLieux>[1][number]> & { id: string; nom: string }) => ({
  addressLine: "Rue " + o.nom + " 1",
  postalCode: "1000",
  city: "Bruxelles",
  actif: true,
  factureInstitution: false,
  ...o,
});
const cabinets = [cab({ id: "ix", nom: "Ixelles" }), cab({ id: "uc", nom: "Uccle" }), cab({ id: "ec", nom: "École", factureInstitution: true })];
assert.equal((cabinetDesLieux(["ixelles"], cabinets) as { cabinet: { id: string } }).cabinet.id, "ix");
assert.equal(
  (cabinetDesLieux([null, "Rue Uccle 1, 1000 Bruxelles, Belgique"], cabinets) as { cabinet: { id: string } }).cabinet.id,
  "uc",
);
assert.equal(cabinetDesLieux(["Ecole"], cabinets), "refuse");
assert.equal(cabinetDesLieux(["Ixelles", "Uccle"], cabinets), null); // ambigu
assert.equal(cabinetDesLieux(["Ailleurs"], cabinets), null);
assert.equal(cabinetDesLieux([null, ""], cabinets), null);

console.log("Correspondance : tous les cas passent.");
