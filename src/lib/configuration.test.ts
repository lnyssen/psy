import { describe, expect, it } from "vitest";
import { pointsAcompleter, type EtatConfiguration } from "@/lib/configuration";

const IBAN = "BE68 5390 0754 7034";

const complet: EtatConfiguration = {
  reglages: {
    iban: IBAN,
    numeroEntreprise: "0123.456.789",
    numeroInami: "1-23456-78-901",
    numeroVisa: "12345",
    adresseSiege: "Rue X 1\n1180 Uccle",
    rdvEnLigne: true,
  },
  courrielConfigure: true,
  cleNotesPresente: true,
  adresseRecuperation: "a@example.be",
  nbTarifsActifs: 2,
  nbCabinetsActifs: 2,
  nbDisponibilites: 8,
  sauvegarde: { etat: "ok", date: new Date(), tailleMo: 1, nombre: 3 },
  restauration: { etat: "ok", date: new Date(), patients: 1, seances: 1 },
};
const ids = (e: EtatConfiguration) => pointsAcompleter(e).map((p) => p.id);

describe("pointsAcompleter", () => {
  it("ne dit rien quand tout est en ordre", () => {
    expect(pointsAcompleter(complet)).toEqual([]);
  });

  it("ne dit rien quand les statuts de sauvegarde sont inconnus (poste de développement)", () => {
    expect(ids({ ...complet, sauvegarde: { etat: "inconnu" }, restauration: { etat: "inconnu" } })).toEqual([]);
  });

  it("signale un IBAN absent, vide ou à clé fausse", () => {
    for (const iban of [null, "", "  ", "BE68 5390 0754 7035"])
      expect(ids({ ...complet, reglages: { ...complet.reglages, iban } })).toContain("iban");
  });

  it("nomme les numéros légaux qui manquent", () => {
    const [p] = pointsAcompleter({
      ...complet,
      reglages: { ...complet.reglages, numeroInami: null, numeroEntreprise: " " },
    });
    expect(p.titre).toContain("n° INAMI");
    expect(p.titre).toContain("n° d’entreprise");
    expect(p.titre).not.toContain("visa");
  });

  it("met les risques de perte (sauvegarde, accès, clé) avant les manques de confort", () => {
    const r = pointsAcompleter({
      ...complet,
      reglages: { ...complet.reglages, iban: null },
      adresseRecuperation: null,
      sauvegarde: { etat: "ancienne", date: new Date(), tailleMo: 1, nombre: 1 },
    });
    expect(r.map((p) => p.id)).toEqual(["sauvegarde", "recuperation", "iban"]);
    expect(r.slice(0, 2).every((p) => p.urgent)).toBe(true);
    expect(r[2].urgent).toBe(false);
  });

  it("signale la clé de notes absente et le test de restauration raté comme urgents", () => {
    const r = pointsAcompleter({
      ...complet,
      cleNotesPresente: false,
      restauration: { etat: "echec", date: new Date(), motif: "x" },
    });
    expect(r.map((p) => p.id).sort()).toEqual(["cle-notes", "restauration"]);
    expect(r.every((p) => p.urgent)).toBe(true);
  });

  it("ne réclame pas d'horaires si la réservation en ligne est fermée", () => {
    expect(ids({ ...complet, nbDisponibilites: 0 })).toContain("horaires");
    expect(ids({ ...complet, nbDisponibilites: 0, reglages: { ...complet.reglages, rdvEnLigne: false } })).not.toContain(
      "horaires",
    );
  });

  it("signale l'absence de tarif, de lieu et d'envoi d'e-mails", () => {
    expect(ids({ ...complet, nbTarifsActifs: 0 })).toContain("tarifs");
    expect(ids({ ...complet, nbCabinetsActifs: 0 })).toContain("lieux");
    expect(ids({ ...complet, courrielConfigure: false })).toContain("courriel");
  });

  it("chaque point mène quelque part dans les réglages", () => {
    const tous = pointsAcompleter({
      ...complet,
      reglages: { iban: null, numeroEntreprise: null, numeroInami: null, numeroVisa: null, adresseSiege: null, rdvEnLigne: true },
      courrielConfigure: false,
      cleNotesPresente: false,
      adresseRecuperation: null,
      nbTarifsActifs: 0,
      nbCabinetsActifs: 0,
      sauvegarde: { etat: "ancienne", date: new Date(), tailleMo: 1, nombre: 1 },
      restauration: { etat: "echec", date: new Date(), motif: "x" },
    });
    expect(tous.length).toBeGreaterThanOrEqual(9);
    for (const p of tous) expect(p.href).toMatch(/^\/admin\/reglages#[a-z-]+$/);
  });
});
