import { useId } from "react";
import { ChampNumeroNational } from "@/components/ChampNumeroNational";
import { BoutonEnregistrer } from "@/components/BoutonEnregistrer";
import { RegimeEtTarif } from "@/components/RegimeEtTarif";

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
  phoneMother: string | null;
  phoneFather: string | null;
  emailMother: string | null;
  emailFather: string | null;
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
      <h3 id={id} className="text-sm font-semibold">
        {titre}
      </h3>
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
}: {
  action: (f: FormData) => void | Promise<void>;
  patient?: Patient;
  tarifs: Tarif[];
  cabinets: { id: string; nom: string }[];
  libelleBouton: string;
}) {
  const p = patient;
  return (
    <form action={action} className="flex flex-col gap-6">
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
        <label>
          <span className={libelle}>Date de naissance</span>
          <input
            name="birthDate"
            type="date"
            defaultValue={
              p?.birthDate ? p.birthDate.toISOString().slice(0, 10) : ""
            }
            className={`mt-1 ${champ}`}
          />
        </label>
        <label>
          <span className={libelle}>Numéro national</span>
          <ChampNumeroNational
            defaultValue={p?.nationalNumber ?? ""}
            className={`mt-1 ${champ}`}
          />
        </label>
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
        />
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
      </Groupe>

      <Groupe
        titre="Parents"
        aide="Pour un enfant ou un adolescent. À laisser vide pour un adulte."
      >
        <label>
          <span className={libelle}>Téléphone de la mère</span>
          <input
            name="phoneMother"
            type="tel"
            defaultValue={p?.phoneMother ?? ""}
            className={`mt-1 ${champ}`}
          />
        </label>
        <label>
          <span className={libelle}>E-mail de la mère</span>
          <input
            name="emailMother"
            type="email"
            defaultValue={p?.emailMother ?? ""}
            className={`mt-1 ${champ}`}
          />
        </label>
        <label>
          <span className={libelle}>Téléphone du père</span>
          <input
            name="phoneFather"
            type="tel"
            defaultValue={p?.phoneFather ?? ""}
            className={`mt-1 ${champ}`}
          />
        </label>
        <label>
          <span className={libelle}>E-mail du père</span>
          <input
            name="emailFather"
            type="email"
            defaultValue={p?.emailFather ?? ""}
            className={`mt-1 ${champ}`}
          />
        </label>
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
    </form>
  );
}
