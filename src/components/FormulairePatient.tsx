import { useId } from "react";
import { NaissanceEtNumeroNational } from "@/components/NaissanceEtNumeroNational";
import { BoutonEnregistrer } from "@/components/BoutonEnregistrer";
import { RegimeEtTarif } from "@/components/RegimeEtTarif";
import { FormulaireAction } from "@/components/FormulaireAction";
import { ChampDate } from "@/components/ChampDate";
import { LIENS, LIEN_PAR_DEFAUT_1, LIEN_PAR_DEFAUT_2 } from "@/lib/liens";

const champ =
  "w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm placeholder:text-ink-muted/60";
const libelle =
  "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";

type Tarif = {
  id: string;
  libelle: string;
  amountCents: number;
  regime: "PRIVE" | "CONVENTIONNE";
  parDefaut: boolean;
};

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  scheme: "PRIVE" | "CONVENTIONNE";
  pplType: "SOUTIEN" | "TRAITEMENT";
  pplReseau: "ENFANTS" | "ADULTES" | null;
  tarifId: string | null;
  feeCents: number | null;
  email: string | null;
  phone: string | null;
  rappelsEmail?: boolean;
  motherFirstName?: string | null;
  motherLastName?: string | null;
  fatherFirstName?: string | null;
  fatherLastName?: string | null;
  pplSeancesAnterieures?: number;
  pplAnterieuresLe?: Date | null;
  pplPeriodes?: number;
  premiereSeanceLe?: Date | null;
  phoneMother: string | null;
  phoneFather: string | null;
  emailMother: string | null;
  emailFather: string | null;
  lienParent1?: string;
  lienParent2?: string;
  nationalNumber: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  birthDate: Date | null;
  cabinetId: string | null;
};

/** Un groupe de champs : un titre qui dit de quoi il s'agit, une phrase si
 *  besoin, puis les champs. C'est ce découpage qui rend la fiche lisible — la
 *  version précédente alignait seize champs sur trois colonnes, sans repère. */
function Groupe({
  titre,
  aide,
  children,
}: {
  titre: string;
  aide?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div
      role="group"
      aria-labelledby={id}
      className="flex flex-col gap-1 border-t border-line pt-6 first-of-type:border-t-0 first-of-type:pt-0"
    >
      <h2 id={id} className="text-sm font-semibold">
        {titre}
      </h2>
      {aide && <p className="text-xs text-ink-muted">{aide}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/**
 * Formulaire d'un dossier patient, commun à la création et à la modification :
 * les deux écrans demandent les mêmes informations, dans le même ordre.
 *
 *  1. Qui est la personne : nom, naissance, numéro national ;
 *  2. Comment elle est prise en charge : régime, tarif, cabinet habituel ;
 *  3. Comment la joindre, elle ;
 *  4. Comment joindre ses parents (enfant, adolescent) ;
 *  5. Où elle habite.
 *
 * Rien n'est obligatoire hors le prénom et le nom.
 */
export function FormulairePatient({
  action,
  patient,
  tarifs,
  cabinets,
  libelleBouton,
  premiereSeanceAgenda = null,
}: {
  action: (f: FormData) => unknown;
  patient?: Patient;
  tarifs: Tarif[];
  cabinets: { id: string; nom: string }[];
  libelleBouton: string;
  /** Date de la première séance de l'agenda (AAAA-MM-JJ), proposée tant
   *  qu'aucune date n'est saisie. */
  premiereSeanceAgenda?: string | null;
}) {
  const p = patient;
  return (
    <FormulaireAction
      action={action}
      className="flex flex-col gap-6"
      confirmation={p ? "Fiche enregistrée." : "Patient ajouté."}
    >
      {p && <input type="hidden" name="id" value={p.id} />}

      <Groupe
        titre="Identité"
        aide="Seuls le prénom et le nom sont obligatoires."
      >
        <label>
          <span className={libelle}>Prénom</span>
          <input
            name="firstName"
            defaultValue={p?.firstName}
            required
            autoFocus={!p}
            className={`mt-1 ${champ}`}
          />
        </label>
        <label>
          <span className={libelle}>Nom</span>
          <input
            name="lastName"
            defaultValue={p?.lastName}
            required
            className={`mt-1 ${champ}`}
          />
        </label>
        <NaissanceEtNumeroNational
          naissanceInitiale={
            p?.birthDate ? p.birthDate.toISOString().slice(0, 10) : ""
          }
          numeroInitial={p?.nationalNumber ?? ""}
          libelle={libelle}
          champ={champ}
        />
      </Groupe>

      <Groupe
        titre="Prise en charge"
        aide="Le régime décide qui paie : le patient (privé) ou l’INAMI (conventionné, psychologue de première ligne)."
      >
        <RegimeEtTarif
          tarifs={tarifs}
          regimeInitial={p?.scheme}
          tarifInitial={p?.tarifId}
          ancienMontantCents={p?.feeCents}
          pplTypeInitial={p?.pplType}
          pplReseauInitial={p?.pplReseau}
          anterieuresInitial={p?.pplSeancesAnterieures ?? 0}
          anterieuresLeInitial={p?.pplAnterieuresLe ? p.pplAnterieuresLe.toISOString().slice(0, 10) : ""}
          periodesInitial={p?.pplPeriodes ?? 1}
        />
        <label>
          <span className={libelle}>Date de la première séance</span>
          <ChampDate
            name="premiereSeanceLe"
            defaultValue={p?.premiereSeanceLe ? p.premiereSeanceLe.toISOString().slice(0, 10) : ""}
            className={`mt-1 ${champ}`}
          />
          <span className="mt-1 block text-[11px] text-ink-muted">
            {premiereSeanceAgenda
              ? `Vide : celle de l’agenda, le ${premiereSeanceAgenda.split("-").reverse().join("/")}.`
              : "Pour un suivi commencé avant l’outil. Vide : la première séance de l’agenda."}
          </span>
        </label>
        <label>
          <span className={libelle}>Cabinet habituel</span>
          <select
            name="cabinetId"
            defaultValue={p?.cabinetId ?? ""}
            className={`mt-1 ${champ}`}
          >
            <option value="">Aucun</option>
            {cabinets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>
      </Groupe>

      <Groupe titre="Contact du patient">
        <label>
          <span className={libelle}>Téléphone</span>
          <input
            name="phone"
            type="tel"
            defaultValue={p?.phone ?? ""}
            className={`mt-1 ${champ}`}
          />
        </label>
        <label>
          <span className={libelle}>E-mail</span>
          <input
            name="email"
            type="email"
            defaultValue={p?.email ?? ""}
            className={`mt-1 ${champ}`}
          />
        </label>
        <label className="flex items-start gap-3 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="rappelsEmail"
            defaultChecked={p ? (p.rappelsEmail ?? true) : true}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="font-medium">
              Rappel de rendez-vous par e-mail, la veille
            </span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              Envoyé au patient s’il a une adresse, sinon à ses parents. À
              décocher pour qui préfère être appelé.
            </span>
          </span>
        </label>
      </Groupe>

      <Groupe
        titre="Parents ou responsables"
        aide="Pour un enfant ou un adolescent. À laisser vide pour un adulte. Choisissez le lien de chacun : deux mères, un tuteur, une famille d’accueil se saisissent de la même façon."
      >
        {(
          [
            {
              n: 1,
              lien: p?.lienParent1 ?? LIEN_PAR_DEFAUT_1,
              champs: ["motherFirstName", "motherLastName", "phoneMother", "emailMother"],
              valeurs: [p?.motherFirstName, p?.motherLastName, p?.phoneMother, p?.emailMother],
            },
            {
              n: 2,
              lien: p?.lienParent2 ?? LIEN_PAR_DEFAUT_2,
              champs: ["fatherFirstName", "fatherLastName", "phoneFather", "emailFather"],
              valeurs: [p?.fatherFirstName, p?.fatherLastName, p?.phoneFather, p?.emailFather],
            },
          ] as const
        ).map((r) => (
          <fieldset key={r.n} className="contents">
            <legend className="sr-only">Responsable {r.n}</legend>
            <label className="sm:col-span-2">
              <span className={libelle}>Responsable {r.n} : lien</span>
              <select
                name={`lienParent${r.n}`}
                defaultValue={r.lien}
                className={`mt-1 ${champ} sm:w-1/2`}
              >
                {LIENS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {(["Prénom", "Nom", "Téléphone", "E-mail"] as const).map((t, i) => (
              <label key={t}>
                <span className={libelle}>{t}</span>
                <input
                  name={r.champs[i]}
                  type={t === "Téléphone" ? "tel" : t === "E-mail" ? "email" : "text"}
                  defaultValue={r.valeurs[i] ?? ""}
                  className={`mt-1 ${champ}`}
                />
              </label>
            ))}
          </fieldset>
        ))}
      </Groupe>

      <Groupe titre="Adresse">
        <label className="sm:col-span-2">
          <span className={libelle}>Rue et numéro</span>
          <input
            name="addressLine"
            defaultValue={p?.addressLine ?? ""}
            className={`mt-1 ${champ}`}
          />
        </label>
        <label>
          <span className={libelle}>Code postal</span>
          <input
            name="postalCode"
            defaultValue={p?.postalCode ?? ""}
            className={`mt-1 ${champ}`}
          />
        </label>
        <label>
          <span className={libelle}>Commune</span>
          <input
            name="city"
            defaultValue={p?.city ?? ""}
            className={`mt-1 ${champ}`}
          />
        </label>
      </Groupe>

      <div className="border-t border-line pt-5">
        <BoutonEnregistrer className="self-start">
          {libelleBouton}
        </BoutonEnregistrer>
      </div>
    </FormulaireAction>
  );
}
