import { prisma } from "@/lib/db";
import { TitreSection } from "@/components/tags";
import { AjouterAppareil } from "@/components/AjouterAppareil";
import {
  changerMotDePasse,
  enregistrerAdresseRecuperation,
  oublierNavigateur,
  supprimerAppareil,
} from "@/lib/auth-actions";
import { LONGUEUR_MINIMALE } from "@/lib/acces-constantes";
import { courrielConfigure } from "@/lib/courriel";
import { fmtJourMoisAn } from "@/lib/format";

const champ =
  "mt-1 w-full rounded-full border border-line bg-surface px-3.5 py-2 text-sm";
const libelle =
  "block text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase";
const bouton =
  "self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover";

const MESSAGES: Record<string, { ok: boolean; texte: string }> = {
  "mdp-ok": {
    ok: true,
    texte: "Mot de passe changé. Il est demandé dès la prochaine connexion.",
  },
  "mdp-actuel": {
    ok: false,
    texte: "Le mot de passe actuel n’est pas le bon.",
  },
  "mdp-court": {
    ok: false,
    texte: `Le nouveau mot de passe doit compter au moins ${LONGUEUR_MINIMALE} caractères.`,
  },
  "mdp-different": {
    ok: false,
    texte: "Les deux saisies du nouveau mot de passe ne sont pas identiques.",
  },
  "mdp-identique": {
    ok: false,
    texte: "Le nouveau mot de passe doit être différent de l’actuel.",
  },
  "mdp-trop": {
    ok: false,
    texte: "Trop d’essais. Réessayez dans un quart d’heure.",
  },
  "recup-ok": { ok: true, texte: "Adresse de récupération enregistrée." },
  "recup-retiree": { ok: true, texte: "Adresse de récupération retirée." },
  "recup-invalide": {
    ok: false,
    texte: "Cette adresse e-mail n’est pas valable.",
  },
  "navigateur-oublie": {
    ok: true,
    texte: "Navigateur oublié. Sa prochaine connexion sera signalée par e-mail.",
  },
  "appareil-retire": {
    ok: true,
    texte: "Appareil retiré. Il ne peut plus ouvrir l’outil.",
  },
};

/**
 * Sécurité de l'accès : mot de passe, adresse de récupération, appareils
 * enregistrés (Face ID, Touch ID). Trois blocs, chacun avec son bouton : ce
 * qu'on change ici décide de qui peut ouvrir l'outil, autant que chaque geste
 * soit explicite.
 */
export async function Securite({ code }: { code?: string }) {
  const [acces, appareils, navigateurs] = await Promise.all([
    prisma.acces.findUnique({ where: { id: "global" } }),
    prisma.passkey.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.appareilConnu.findMany({ orderBy: { derniereVue: "desc" }, take: 12 }),
  ]);
  const message = code ? MESSAGES[code] : undefined;
  const courriel = courrielConfigure();

  return (
    <section id="securite" className="flex flex-col gap-6 scroll-mt-6">
      <div>
        <TitreSection>Sécurité de l’accès</TitreSection>
        <p className="mt-1 text-sm text-ink-muted">
          Comment l’outil s’ouvre : le mot de passe, l’adresse qui permet de le
          retrouver s’il est oublié, et les appareils qui l’ouvrent d’un geste
          (Face ID, Touch ID).
        </p>
      </div>

      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`rounded-[14px] border px-4 py-3 text-sm ${
            message.ok
              ? "border-paid/40 bg-paid-soft text-paid"
              : "border-overdue/40 bg-overdue-soft text-overdue"
          }`}
        >
          {message.texte}
        </p>
      )}

      <div id="mot-de-passe" className="flex flex-col gap-3 scroll-mt-6">
        <h3 className="text-sm font-semibold">Mot de passe</h3>
        <form
          action={changerMotDePasse}
          className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface px-5 py-5"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <label>
              <span className={libelle}>Mot de passe actuel</span>
              <input
                name="actuel"
                type="password"
                autoComplete="current-password"
                required
                className={champ}
              />
            </label>
            <label>
              <span className={libelle}>Nouveau mot de passe</span>
              <input
                name="nouveau"
                type="password"
                autoComplete="new-password"
                minLength={LONGUEUR_MINIMALE}
                required
                className={champ}
              />
            </label>
            <label>
              <span className={libelle}>Le même, une seconde fois</span>
              <input
                name="confirmation"
                type="password"
                autoComplete="new-password"
                minLength={LONGUEUR_MINIMALE}
                required
                className={champ}
              />
            </label>
          </div>
          <p className="text-xs text-ink-muted">
            Au moins {LONGUEUR_MINIMALE} caractères. Une phrase courte est plus
            sûre et plus facile à retenir qu’un mot compliqué. Les sessions déjà
            ouvertes restent ouvertes jusqu’à leur fin ; pour les fermer toutes,
            utilisez « Verrouiller » sur chaque appareil.
          </p>
          <button type="submit" className={bouton}>
            Changer le mot de passe
          </button>
        </form>
      </div>

      <div id="recuperation" className="flex flex-col gap-3 scroll-mt-6">
        <h3 className="text-sm font-semibold">Adresse de récupération</h3>
        <form
          action={enregistrerAdresseRecuperation}
          className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface px-5 py-5"
        >
          <label className="max-w-md">
            <span className={libelle}>Adresse e-mail</span>
            <input
              name="adresse"
              type="email"
              defaultValue={acces?.recoveryEmail ?? ""}
              placeholder="une adresse que vous consultez, distincte du site"
              autoComplete="email"
              className={champ}
            />
          </label>
          <p className="text-xs text-ink-muted">
            Si vous oubliez le mot de passe, « Mot de passe oublié ? » sur
            l’écran de connexion envoie à cette adresse un lien valable 30
            minutes, utilisable une seule fois. Choisissez une boîte que vous
            seule consultez.
          </p>
          {!courriel && (
            <p className="rounded-[10px] border border-due/40 bg-due-soft px-4 py-2.5 text-sm text-due">
              L’envoi d’e-mails n’est pas encore configuré sur ce serveur :
              l’adresse est enregistrée, mais aucun lien ne peut partir tant que
              le serveur de messagerie n’est pas renseigné (SMTP_HOST).
            </p>
          )}
          <button type="submit" className={bouton}>
            Enregistrer l’adresse
          </button>
        </form>
      </div>

      <div id="appareils" className="flex flex-col gap-3 scroll-mt-6">
        <h3 className="text-sm font-semibold">
          Face ID, Touch ID et empreinte
        </h3>
        <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface px-5 py-5">
          <p className="text-xs text-ink-muted">
            Un appareil enregistré ouvre l’outil d’un geste, sans mot de passe.
            Votre visage ou votre empreinte ne quitte jamais l’appareil : le
            serveur ne garde qu’une clé publique. Le mot de passe reste valable
            en secours.
          </p>

          {appareils.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucun appareil enregistré.</p>
          ) : (
            <ul className="overflow-hidden rounded-[12px] border border-line">
              {appareils.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-3 last:border-b-0"
                >
                  <span className="min-w-40 flex-1 text-sm font-medium">
                    {a.nom}
                  </span>
                  <span className="text-xs text-ink-muted">
                    Ajouté le {fmtJourMoisAn.format(a.createdAt)}
                    {a.lastUsedAt
                      ? ` · utilisé le ${fmtJourMoisAn.format(a.lastUsedAt)}`
                      : " · jamais utilisé"}
                  </span>
                  <form action={supprimerAppareil}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-line-strong px-4 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-overdue hover:text-overdue"
                    >
                      Retirer
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <AjouterAppareil nomParDefaut="Mon appareil" />
        </div>
      </div>

      <div id="navigateurs" className="flex flex-col gap-3 scroll-mt-6">
        <h3 className="text-sm font-semibold">Navigateurs déjà connectés</h3>
        <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface px-5 py-5">
          <p className="text-xs text-ink-muted">
            Chaque connexion depuis un navigateur inconnu envoie un e-mail à
            l’adresse de récupération. Un navigateur dont on efface les cookies
            compte comme un nouveau : c’est une alerte de trop, jamais une de
            moins. « Oublier » un navigateur le fera de nouveau signaler à sa
            prochaine connexion.
          </p>
          {navigateurs.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Aucun navigateur enregistré pour l’instant : le prochain à se
              connecter sera signalé.
            </p>
          ) : (
            <ul className="overflow-hidden rounded-[12px] border border-line">
              {navigateurs.map((n) => (
                <li
                  key={n.id}
                  className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{n.nom}</p>
                    <p className="text-xs text-ink-muted">
                      Première connexion le {fmtJourMoisAn.format(n.premiereVue)} · dernière le{" "}
                      {fmtJourMoisAn.format(n.derniereVue)}
                    </p>
                  </div>
                  <form action={oublierNavigateur}>
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-line-strong px-4 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-overdue hover:text-overdue"
                    >
                      Oublier
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
