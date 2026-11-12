import { describe, expect, it } from "vitest";
import { MESSAGE_REVOQUEE, decisionCourriel, santeSynchro, type EtatSynchro } from "./google-sante";

const maintenant = new Date("2026-11-12T12:00:00Z");
const ilYa = (min: number) => new Date(maintenant.getTime() - min * 60_000);

const sain: EtatSynchro = {
  derniereSynchro: ilYa(5),
  derniereErreur: null,
  echecsConsecutifs: 0,
  problemeDepuis: null,
  bloquee: false,
  alerteEnvoyeeLe: null,
};

const sante = (c: Partial<EtatSynchro> | null, configure = true) =>
  santeSynchro(c ? { ...sain, ...c } : null, { configure, maintenant }).niveau;

describe("santeSynchro", () => {
  it("ne dit rien sans agenda connecté, ni quand tout va bien", () => {
    expect(sante(null)).toBe("ok");
    expect(sante({})).toBe("ok");
  });

  it("signale une synchro coupée sur le serveur", () => {
    expect(sante({}, false)).toBe("coupee");
  });

  it("signale tout de suite le garde-fou anti-suppression", () => {
    expect(sante({ bloquee: true, derniereErreur: "12 événements…", problemeDepuis: ilYa(1) })).toBe(
      "bloquee",
    );
  });

  it("laisse passer une erreur isolée et récente", () => {
    expect(sante({ derniereErreur: "fetch failed", echecsConsecutifs: 1, problemeDepuis: ilYa(10) })).toBe(
      "ok",
    );
  });

  it("alerte après deux échecs, après une heure, ou si l'accès est retiré", () => {
    expect(sante({ derniereErreur: "x", echecsConsecutifs: 2, problemeDepuis: ilYa(10) })).toBe("erreur");
    expect(sante({ derniereErreur: "x", echecsConsecutifs: 1, problemeDepuis: ilYa(61) })).toBe("erreur");
    expect(sante({ derniereErreur: MESSAGE_REVOQUEE, echecsConsecutifs: 1, problemeDepuis: ilYa(1) })).toBe(
      "erreur",
    );
  });

  it("signale une synchro qui ne tourne plus depuis plus de 26 h", () => {
    expect(sante({ derniereSynchro: ilYa(25 * 60) })).toBe("ok");
    expect(sante({ derniereSynchro: ilYa(27 * 60) })).toBe("retard");
  });
});

describe("decisionCourriel", () => {
  const d = (c: Partial<EtatSynchro>) => decisionCourriel({ ...sain, ...c }, maintenant);
  const panne = { derniereErreur: "x", echecsConsecutifs: 3, problemeDepuis: ilYa(120) };

  it("écrit une fois au début, puis un rappel par jour", () => {
    expect(d(panne)).toBe("alerte");
    expect(d({ ...panne, alerteEnvoyeeLe: ilYa(60) })).toBeNull();
    expect(d({ ...panne, alerteEnvoyeeLe: ilYa(25 * 60) })).toBe("rappel");
  });

  it("n'écrit pas pour une erreur isolée", () => {
    expect(d({ derniereErreur: "x", echecsConsecutifs: 1, problemeDepuis: ilYa(1) })).toBeNull();
  });

  it("annonce le retour à la normale, une seule fois", () => {
    expect(d({ alerteEnvoyeeLe: ilYa(30) })).toBe("retablie");
    expect(d({})).toBeNull();
  });
});
