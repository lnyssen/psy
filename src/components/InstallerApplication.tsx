import { TitreSection } from "@/components/tags";

/**
 * Mode d'emploi : installer l'outil comme une application. Rien à coder pour
 * l'utilisatrice — le navigateur le propose, il suffit de savoir où.
 */
export function InstallerApplication() {
  return (
    <section id="application" className="flex flex-col gap-3 scroll-mt-6">
      <TitreSection>Application sur le téléphone</TitreSection>
      <div className="rounded-[14px] border border-line bg-surface px-5 py-4 text-sm">
        <p className="text-ink-muted">
          L’outil peut s’installer sur l’écran d’accueil comme une application :
          il s’ouvre alors sans la barre du navigateur, avec l’icône du phare.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          <li>
            <strong>iPhone, iPad</strong> : dans Safari, ouvrez l’outil, touchez{" "}
            <em>Partager</em>, puis <em>Sur l’écran d’accueil</em>.
          </li>
          <li>
            <strong>Android</strong> : dans Chrome, menu <em>⋮</em>, puis{" "}
            <em>Installer l’application</em>.
          </li>
          <li>
            <strong>Mac</strong> : dans Safari, <em>Fichier</em>, puis{" "}
            <em>Ajouter au Dock</em>.
          </li>
        </ul>
      </div>
    </section>
  );
}
