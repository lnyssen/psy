"use client";

import { useEffect, useRef } from "react";

type Rgb = [number, number, number];

/** Lit une couleur calculée (« rgb(…) », « rgba(…) ») ; null si transparente. */
function lireCouleur(css: string): Rgb | null {
  const m = css.match(/[\d.]+/g);
  if (!m || m.length < 3) return null;
  const alpha = m.length > 3 ? Number(m[3]) : 1;
  if (alpha < 0.6) return null;
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}

/** Luminance relative WCAG. */
function luminance([r, g, b]: Rgb) {
  const c = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

function contraste(a: Rgb, b: Rgb) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/**
 * Le fond opaque le plus proche sous le pointeur. On remonte jusqu'au premier
 * fond plein plutôt que de chercher une classe : un bouton blanc posé sur un
 * aplat mauve est blanc, pas mauve. Sans fond trouvé, c'est celui de la page.
 */
function fondSous(depart: Element | null): Rgb | null {
  for (let n: Element | null = depart; n; n = n.parentElement) {
    const c = lireCouleur(getComputedStyle(n).backgroundColor);
    if (c) return c;
  }
  return lireCouleur(getComputedStyle(document.body).backgroundColor);
}

/**
 * La couleur du disque pour ce fond : le mauve tant qu'il se détache (3:1, le
 * seuil WCAG des éléments graphiques), sinon le blanc ou l'encre nuit, celle
 * des deux qui ressort le mieux. Ainsi le disque reste visible sur l'aplat
 * mauve, sur la bande navy, sur un bouton survolé, dans les deux thèmes, et
 * sur tout bloc coloré ajouté plus tard, sans liste à tenir à jour.
 */
function couleurPour(fond: Rgb | null, accent: Rgb): string {
  if (!fond || contraste(accent, fond) >= 3) return "";
  const blanc: Rgb = [255, 255, 255];
  const nuit: Rgb = [27, 20, 100];
  return contraste(blanc, fond) >= contraste(nuit, fond)
    ? "#ffffff"
    : "#1b1464";
}

/**
 * Un disque plein, mauve, qui suit la souris — même geste que sur
 * laurentnyssen.be, sans les étiquettes.
 *
 * Il remplace la flèche, sauf sur les champs de saisie où l'on a besoin de voir
 * le curseur de texte. Il n'intercepte aucun clic (pointer-events: none) et
 * grossit un peu au-dessus de ce qui se clique. Sur un fond où le mauve ne se
 * détache pas (aplat mauve, bande navy…), il change de couleur : du mauve sur
 * du mauve disparaîtrait. Le fond est relu quand la souris bouge, mais aussi
 * quand la page défile sous une souris immobile (molette, pavé tactile).
 *
 * Son retard est calculé sur le temps écoulé et non sur le nombre d'images :
 * le mouvement a la même fluidité sur un écran à 60 ou à 120 Hz.
 *
 * Il n'existe que là où il a un sens — un pointeur précis qui survole (souris,
 * pavé tactile), jamais au doigt — et il disparaît pour les personnes qui ont
 * demandé moins d'animations : la flèche reste alors la leur.
 */
export function CurseurRond() {
  const disque = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = disque.current;
    if (!el) return;
    const fin = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fin.matches || calme.matches) return;

    const racine = document.documentElement;
    racine.dataset.curseurRond = "";

    const cible = { x: 0, y: 0 };
    const actuel = { x: 0, y: 0 };
    let vu = false;
    let dernier: Element | null = null;
    let frame = 0;
    let relire = 0;

    // Le mauve du thème en cours (#7f00ff en clair, #a566ff en sombre),
    // relu à chaque fois : le thème peut basculer sans recharger la page.
    const accent = (): Rgb => {
      const hex = getComputedStyle(racine)
        .getPropertyValue("--color-accent")
        .trim()
        .match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
      return hex
        ? [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)]
        : [127, 0, 255];
    };

    const analyser = (cibleEl: Element | null) => {
      el.dataset.actif = cibleEl?.closest(
        "a, button, summary, label, select, [role=button]",
      )
        ? "oui"
        : "non";
      // Relu même si l'élément n'a pas changé : un bouton change de fond au
      // survol, et le thème peut basculer.
      dernier = cibleEl;
      const couleur = couleurPour(fondSous(cibleEl), accent());
      if (couleur) el.style.setProperty("--disque", couleur);
      else el.style.removeProperty("--disque");
    };

    // Constante de temps de 120 ms : le disque rattrape le pointeur en
    // douceur, avec une traîne qu'on sent sans que l'écart gêne au clic — c'est
    // le pointeur réel, invisible, qui atteint la cible.
    let avant = performance.now();
    const suivre = (maintenant: number) => {
      const dt = Math.min(maintenant - avant, 64);
      avant = maintenant;
      const k = 1 - Math.exp(-dt / 120);
      const dx = cible.x - actuel.x;
      const dy = cible.y - actuel.y;
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        actuel.x += dx * k;
        actuel.y += dy * k;
        el.style.transform = `translate3d(${actuel.x}px, ${actuel.y}px, 0) translate(-50%, -50%)`;
      }
      frame = requestAnimationFrame(suivre);
    };

    const bouge = (e: PointerEvent) => {
      cible.x = e.clientX;
      cible.y = e.clientY;
      if (!vu) {
        actuel.x = cible.x;
        actuel.y = cible.y;
        vu = true;
        el.style.opacity = "1";
      }
      const cibleEl = e.target as Element | null;
      if (cibleEl !== dernier) analyser(cibleEl);
    };

    // La page défile sous une souris immobile : aucun pointermove n'arrive,
    // l'élément sous le disque change quand même. On le relit une fois par
    // image, au plus.
    const defile = () => {
      if (!vu || relire) return;
      relire = requestAnimationFrame(() => {
        relire = 0;
        analyser(document.elementFromPoint(cible.x, cible.y));
      });
    };
    // Thème clair ou sombre basculé : l'accent et les fonds changent.
    const theme = () => vu && analyser(document.elementFromPoint(cible.x, cible.y));
    const schema = window.matchMedia("(prefers-color-scheme: dark)");
    const observateur = new MutationObserver(theme);
    observateur.observe(racine, { attributes: true, attributeFilter: ["data-theme", "class"] });
    schema.addEventListener("change", theme);

    const sort = () => {
      el.style.opacity = "0";
      vu = false;
    };

    window.addEventListener("pointermove", bouge, { passive: true });
    window.addEventListener("scroll", defile, { passive: true, capture: true });
    racine.addEventListener("pointerleave", sort);
    frame = requestAnimationFrame(suivre);
    return () => {
      window.removeEventListener("pointermove", bouge);
      window.removeEventListener("scroll", defile, { capture: true });
      schema.removeEventListener("change", theme);
      observateur.disconnect();
      cancelAnimationFrame(relire);
      racine.removeEventListener("pointerleave", sort);
      cancelAnimationFrame(frame);
      delete racine.dataset.curseurRond;
    };
  }, []);

  return (
    <div
      ref={disque}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[60] opacity-0 transition-opacity duration-200"
    >
      <span className="block h-5 w-5 rounded-full bg-[var(--disque,var(--color-accent))] transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] [[data-actif=oui]_&]:scale-[1.7]" />
    </div>
  );
}
