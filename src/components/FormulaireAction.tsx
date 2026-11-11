"use client";

import { createContext, useTransition } from "react";
import { confirmer } from "@/components/Confirmations";

/** État d'un FormulaireAction : BoutonEnregistrer le lit à la place de
 *  useFormStatus, qui ne voit que les <form action>. Nul hors d'un
 *  FormulaireAction. Le formulaire referme lui-même son panneau, et seulement
 *  si l'enregistrement a réussi. */
export const EnregistrementEnCours = createContext<{ enCours: boolean } | null>(null);

/**
 * Un formulaire qui envoie à une action serveur sans être remis à zéro après
 * coup.
 *
 * Un <form action={...}> de React 19 se réinitialise une fois l'action passée.
 * Sur une liste déroulante, la réinitialisation ramène l'option choisie au
 * premier affichage de la page, pas la valeur qu'on vient d'enregistrer :
 * on passait la convention à 20 séances, on enregistrait, la liste affichait
 * de nouveau « 10 séances », et l'enregistrement suivant (le nombre de
 * séances déjà faites, par exemple) remettait 10 en base sans qu'on ait rien
 * touché. Ici, l'envoi passe par onSubmit : rien n'est réinitialisé, ce qui
 * est affiché est ce qui est enregistré.
 *
 * L'action peut renvoyer { ok: false, message } : le message s'affiche en
 * erreur au lieu de la confirmation, plutôt qu'un refus silencieux.
 */
export function FormulaireAction({
  action,
  children,
  className,
  confirmation,
}: {
  action: (f: FormData) => unknown | Promise<unknown>;
  children: React.ReactNode;
  className?: string;
  /** Texte de la confirmation affichée après l'enregistrement. */
  confirmation?: string;
}) {
  const [enCours, demarrer] = useTransition();
  return (
    <form
      className={className}
      data-confirmation-propre=""
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const donnees = new FormData(form, (e.nativeEvent as SubmitEvent).submitter);
        demarrer(async () => {
          let r: unknown;
          try {
            r = await action(donnees);
          } catch (err) {
            // Une redirection (création d'un patient) passe par une exception
            // que Next doit recevoir telle quelle.
            const digest = (err as { digest?: unknown })?.digest;
            if (typeof digest === "string" && digest.startsWith("NEXT_")) throw err;
            confirmer("L’enregistrement a échoué. Réessayez.", true);
            return;
          }
          if (r && typeof r === "object" && "ok" in r && r.ok === false) {
            const message = "message" in r && typeof r.message === "string" ? r.message : "Rien n’a été enregistré.";
            confirmer(message, true);
            return;
          }
          confirmer(confirmation ?? "Enregistré.");
          form.closest("details")?.removeAttribute("open");
        });
      }}
    >
      <EnregistrementEnCours.Provider value={{ enCours }}>{children}</EnregistrementEnCours.Provider>
    </form>
  );
}
