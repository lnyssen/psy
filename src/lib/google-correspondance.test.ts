import { describe, expect, it } from "vitest";
import {
  cleAlias,
  participantsDuTitre,
  proposer,
  suggererPatient,
  titreDesignePatient,
  type AliasCandidat,
} from "@/lib/google-correspondance";

const patients = [
  { id: "anas", firstName: "Anas", lastName: "Benali", cabinetId: "uccle" },
  { id: "chloe-e", firstName: "Chloé", lastName: "Evrard", cabinetId: null },
  { id: "chloe-m", firstName: "Chloé", lastName: "Martin", cabinetId: null },
  { id: "delhia", firstName: "Delhia", lastName: "Owusu", cabinetId: "auderghem" },
  { id: "tom", firstName: "Tom", lastName: "Dupont", cabinetId: null },
];
const cab = (id: string, nom: string, extra: Partial<{ actif: boolean; factureInstitution: boolean }> = {}) => ({
  id,
  nom,
  addressLine: `Rue ${nom} 1`,
  postalCode: "1180",
  city: nom,
  actif: true,
  factureInstitution: false,
  ...extra,
});
const cabinets = [cab("uccle", "Uccle"), cab("auderghem", "Auderghem"), cab("ecole", "École", { factureInstitution: true })];

function ref(alias: [string, AliasCandidat][] = [], dernier: [string, string][] = []) {
  return { patients, cabinets, alias: new Map(alias), dernierCabinet: new Map(dernier) };
}

describe("suggererPatient", () => {
  it("prénom seul, prénom + initiale, suffixe ignoré", () => {
    expect(suggererPatient("Anas", patients)?.id).toBe("anas");
    expect(suggererPatient("Chloé E", patients)?.id).toBe("chloe-e");
    expect(suggererPatient("Delhia + parents", patients)?.id).toBe("delhia");
  });
  it("deux Chloé sans initiale : rien", () => {
    expect(suggererPatient("Chloé", patients)).toBeNull();
  });
  it("nom de famille seul", () => {
    expect(suggererPatient("Dupont + maman", patients)?.id).toBe("tom");
  });
});

describe("participantsDuTitre", () => {
  it("lit les accompagnants", () => {
    expect(participantsDuTitre("Delhia + parents")).toBe("AVEC_PARENTS");
    expect(participantsDuTitre("Tom avec maman")).toBe("AVEC_MERE");
    expect(participantsDuTitre("Léa (papa)")).toBe("AVEC_PERE");
    expect(participantsDuTitre("Anas")).toBe("INDIVIDUELLE");
  });
  it("ne lit jamais le premier mot", () => {
    expect(participantsDuTitre("Pere")).toBe("INDIVIDUELLE");
  });
});

describe("mémoire des titres", () => {
  it("clé sans lieu ni casse", () => {
    expect(cleAlias("Anas — Uccle")).toBe("anas");
    expect(cleAlias("CHLOÉ E")).toBe("chloe e");
  });
  it("retient seulement un titre qui nomme le patient", () => {
    expect(titreDesignePatient("Anas", patients[0])).toBe(true);
    expect(titreDesignePatient("Benali + papa", patients[0])).toBe(true);
    expect(titreDesignePatient("Bilan", patients[0])).toBe(false);
  });
});

describe("proposer", () => {
  it("nom complet : rattachable sans clic, lieu de l'historique", () => {
    const p = proposer({ titre: "Anas Benali", lieu: null }, ref([], [["anas", "auderghem"]]));
    expect(p).toMatchObject({ source: "nom", cabinetId: "auderghem" });
  });
  it("titre retenu : patient, lieu et accompagnants de la mémoire", () => {
    const p = proposer(
      { titre: "Chloé", lieu: null },
      ref([["chloe", { patientId: "chloe-m", cabinetId: "uccle", participants: "AVEC_MERE" }]]),
    );
    expect(p).toMatchObject({ source: "memoire", cabinetId: "uccle", participants: "AVEC_MERE" });
    expect(p !== "refuse" && p?.patient.id).toBe("chloe-m");
  });
  it("le titre l'emporte sur la mémoire pour les accompagnants", () => {
    const p = proposer(
      { titre: "Delhia + parents", lieu: null },
      ref([["delhia parents", { patientId: "delhia", cabinetId: null, participants: "INDIVIDUELLE" }]]),
    );
    expect(p).toMatchObject({ source: "memoire", participants: "AVEC_PARENTS", cabinetId: "auderghem" });
  });
  it("ressemblance : proposée, jamais sûre", () => {
    expect(proposer({ titre: "Anas", lieu: null }, ref())).toMatchObject({ source: "ressemblance", cabinetId: "uccle" });
  });
  it("lieu facturé à un établissement : refus", () => {
    expect(proposer({ titre: "Anas Benali", lieu: "École" }, ref())).toBe("refuse");
  });
  it("le lieu de l'événement prime", () => {
    expect(proposer({ titre: "Anas — Auderghem", lieu: null }, ref())).toMatchObject({ cabinetId: "auderghem" });
  });
  it("nom du lieu dans le titre, sans tiret", () => {
    expect(proposer({ titre: "Anas Auderghem", lieu: null }, ref())).toMatchObject({ cabinetId: "auderghem" });
    expect(proposer({ titre: "Anas Benali Auderghem", lieu: null }, ref())).toMatchObject({
      source: "nom",
      cabinetId: "auderghem",
    });
    const memo = ref([["delhia parents", { patientId: "delhia", cabinetId: "auderghem", participants: "AVEC_PARENTS" }]]);
    expect(proposer({ titre: "Delhia Uccle + parents", lieu: null }, memo)).toMatchObject({
      source: "memoire",
      cabinetId: "uccle",
      participants: "AVEC_PARENTS",
    });
    expect(cleAlias("Anas Uccle", ["Uccle"])).toBe("anas");
    expect(cleAlias("Uccle", ["Uccle"])).toBe("uccle");
  });
  it("titre inconnu : rien", () => {
    expect(proposer({ titre: "Réunion", lieu: null }, ref())).toBeNull();
  });
});
