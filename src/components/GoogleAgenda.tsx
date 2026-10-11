import { TitreSection } from "@/components/tags";
import { changerAgendaGoogle, deconnecterGoogle, synchroniserMaintenant } from "@/lib/google-actions";
import { etatGoogle } from "@/lib/google-sync";
import { compterAFaire } from "@/lib/google-afaire";

const MESSAGES: Record<string, { ton: "ok" | "erreur"; texte: string }> = {
  ok: { ton: "ok", texte: "Google Agenda est connecté. La première synchronisation est en cours." },
  demo: {
    ton: "erreur",
    texte: "Impossible tant que la démonstration ouverte est active : l’outil y est lisible par tous.",
  },
  config: { ton: "erreur", texte: "Les identifiants Google ne sont pas encore configurés sur le serveur." },
  state: { ton: "erreur", texte: "L’autorisation a été interrompue. Réessaie depuis le début." },
  refuse: { ton: "erreur", texte: "L’autorisation a été refusée côté Google." },
  "sans-jeton": {
    ton: "erreur",
    texte:
      "Google n’a pas renvoyé d’accès durable. Retire l’accès de cette application sur myaccount.google.com/permissions, puis réessaie.",
  },
  echec: { ton: "erreur", texte: "La connexion à Google a échoué. Réessaie dans un instant." },
  "agenda-ok": {
    ton: "ok",
    texte: "Agenda changé. Les séances y sont recréées, la synchronisation est en cours.",
  },
  "agenda-inchange": { ton: "ok", texte: "C’est déjà l’agenda synchronisé : rien n’a changé." },
  "agenda-invalide": {
    ton: "erreur",
    texte: "Identifiant d’agenda non reconnu. Il ressemble à une adresse : …@group.calendar.google.com.",
  },
  "agenda-introuvable": {
    ton: "erreur",
    texte: "Agenda introuvable ou non accessible avec ce compte Google. Rien n’a changé.",
  },
  "agenda-occupe": {
    ton: "erreur",
    texte: "Une synchronisation est en cours. Réessaie dans un instant.",
  },
  "agenda-echec": {
    ton: "erreur",
    texte: "Google n’a pas pu être joint pour vérifier l’agenda. Rien n’a changé, réessaie dans un instant.",
  },
};

function ilYa(d: Date | null) {
  if (!d) return "jamais";
  const minutes = Math.round((Date.now() - d.getTime()) / 60_000);
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 48) return `il y a ${heures} h`;
  return `il y a ${Math.round(heures / 24)} jours`;
}

const bouton =
  "rounded-full border border-line-strong px-4 py-1.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text";

export async function GoogleAgenda({ retour }: { retour?: string }) {
  const e = await etatGoogle();
  const aFaire = await compterAFaire();
  const message = retour ? MESSAGES[retour] : undefined;

  return (
    <section id="google" className="flex flex-col gap-4 scroll-mt-6">
      <div>
        <TitreSection>Google Agenda</TitreSection>
        <p className="mt-1 text-sm text-ink-muted">
          Les séances d’ici apparaissent dans ton Google Agenda, sous le nom du patient et du lieu.
          Ce que tu y ajoutes arrive ici « à rattacher ». Un rendez-vous titré du prénom et du
          nom d’un patient devient automatiquement sa séance. Un déplacement ou une suppression
          faite d’un côté est reprise de l’autre.
        </p>
      </div>

      {message && (
        <p
          role="status"
          className={`rounded-[14px] px-5 py-3 text-sm ${
            message.ton === "ok" ? "bg-paid-soft text-paid" : "bg-overdue-soft text-overdue"
          }`}
        >
          {message.texte}
        </p>
      )}

      <p className="rounded-[14px] bg-sunken px-5 py-3 text-sm">
        <span className="font-semibold">À savoir avant de connecter :</span> le nom de chaque
        patient est envoyé à Google pour titrer les événements — une donnée de santé de plus chez
        un tiers. Le flux iCalendar d’abonnement, lui, n’en porte jamais.
      </p>

      <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface px-5 py-4 text-sm">
        {e.demo ? (
          <p>
            <span className="font-semibold">Désactivé en démonstration ouverte.</span> L’outil y
            est accessible sans mot de passe : y brancher ton agenda l’afficherait à tous. La
            connexion se débloque dès que la démonstration est coupée.
          </p>
        ) : !e.configure ? (
          <>
            <p>
              <span className="font-semibold">Pas encore configuré.</span> Il faut d’abord créer
              l’accès chez Google, une fois pour toutes.
            </p>
            <details className="text-ink-muted">
              <summary className="w-fit cursor-pointer font-medium text-ink">La marche à suivre</summary>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                <li>
                  Sur console.cloud.google.com, crée un projet et active l’API « Google Calendar ».
                </li>
                <li>
                  Écran de consentement OAuth : type « Externe », ton adresse en utilisateur test,
                  puis « Publier l’application » — sans cela, l’accès expire au bout de 7 jours.
                  Google affichera un avertissement « application non vérifiée » : c’est attendu,
                  l’application n’a qu’une utilisatrice.
                </li>
                <li>
                  Identifiants → ID client OAuth → « Application Web ». URI de redirection autorisé :{" "}
                  <code className="rounded bg-sunken px-1">/api/google/callback</code> précédé de
                  l’adresse de l’outil.
                </li>
                <li>
                  Dans les variables Vercel : <code className="rounded bg-sunken px-1">GOOGLE_CLIENT_ID</code>,{" "}
                  <code className="rounded bg-sunken px-1">GOOGLE_CLIENT_SECRET</code>,{" "}
                  <code className="rounded bg-sunken px-1">GOOGLE_TOKEN_KEY</code> (
                  <code className="rounded bg-sunken px-1">openssl rand -base64 32</code>) et{" "}
                  <code className="rounded bg-sunken px-1">CRON_SECRET</code>.
                </li>
              </ol>
            </details>
          </>
        ) : !e.connecte ? (
          <>
            <p>Ton Google Agenda n’est pas connecté.</p>
            <a
              href="/api/google/connexion"
              className="w-fit rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              Connecter mon Google Agenda
            </a>
          </>
        ) : (
          <>
            <p>
              Connecté à <span className="font-semibold">{e.email}</span> · dernière synchronisation{" "}
              <span data-numeric>{ilYa(e.derniereSynchro)}</span>
              {aFaire.lignes > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <a href="/admin/google" className="font-medium text-accent-text underline">
                    {aFaire.lignes} à traiter
                  </a>
                </>
              )}
            </p>
            {e.derniereErreur && (
              <p role="alert" className="rounded-[14px] bg-overdue-soft px-4 py-2 text-overdue">
                {e.derniereErreur}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <form action={synchroniserMaintenant}>
                <button type="submit" className={bouton}>
                  Synchroniser maintenant
                </button>
              </form>
              <form action={deconnecterGoogle}>
                <button
                  type="submit"
                  className={`${bouton} text-ink-muted hover:border-overdue hover:text-overdue`}
                >
                  Déconnecter
                </button>
              </form>
            </div>
            <form action={changerAgendaGoogle} className="flex flex-col gap-2 border-t border-line pt-3">
              <label htmlFor="calendrierId" className="font-medium">
                Agenda synchronisé
              </label>
              <p className="text-ink-muted">
                Actuellement :{" "}
                <span className="font-semibold text-ink break-all">
                  {e.calendrierId === "primary" ? "Agenda principal" : e.calendrierId}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  id="calendrierId"
                  name="calendrierId"
                  type="text"
                  defaultValue={e.calendrierId === "primary" ? "" : (e.calendrierId ?? "")}
                  placeholder="primary"
                  autoComplete="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm"
                />
                <button type="submit" className={bouton}>
                  Enregistrer
                </button>
              </div>
              <p className="text-xs text-ink-muted">
                L’identifiant se trouve dans Google Agenda → paramètres de l’agenda → « Intégrer
                l’agenda » → « ID de l’agenda ». « primary » ou vide = agenda principal. Changer
                d’agenda recrée les séances dans le nouveau ; l’ancien n’est pas modifié.
              </p>
            </form>
            <p className="text-xs text-ink-muted">
              Déconnecter n’efface rien dans Google : les événements déjà créés y restent, et sont
              reconnus si tu te reconnectes.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
