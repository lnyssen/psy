const QUESTIONS: [string, string][] = [
  [
    "Comment se passe une première séance ?",
    "On prend le temps de faire connaissance. Vous racontez ce qui vous amène, à votre rythme et sans avoir à tout dire d’emblée. À la fin, nous décidons ensemble s’il y a lieu de continuer, et à quel rythme. Rien ne vous engage au-delà de cette séance.",
  ],
  [
    "Combien de temps dure une séance ?",
    "Quarante-cinq minutes. C’est une durée qui permet d’aller quelque part sans épuiser, et elle est la même pour tout le monde.",
  ],
  [
    "À quelle fréquence faut-il venir ?",
    "Le plus souvent une fois par semaine au début, puis les séances s’espacent à mesure que les choses se posent. Rien n’est imposé : le rythme se décide ensemble et se réajuste.",
  ],
  [
    "Ce que je dis reste-t-il confidentiel ?",
    "Oui. Le secret professionnel couvre tout ce qui se dit en séance. Il ne connaît qu’un très petit nombre d’exceptions, prévues par la loi, et je vous les expliquerais si la question se posait.",
  ],
  [
    "Et si je dois annuler ?",
    "Prévenez-moi au moins vingt-quatre heures à l’avance et la séance n’est pas due. En deçà, elle reste facturée : le créneau vous était réservé et ne peut plus être proposé à quelqu’un d’autre.",
  ],
  [
    "Recevez-vous les adolescents ?",
    "À compléter — publics reçus, âges, et éventuelles orientations si la demande sort de son champ.",
  ],
  [
    "Faut-il une prescription médicale ?",
    "Pas pour une consultation privée : vous pouvez prendre rendez-vous directement. L’accès à la convention INAMI, lui, suit ses propres règles.",
  ],
];

export default function Questions() {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="font-display text-4xl font-bold tracking-tight">Questions fréquentes</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
          Ce qu’on aimerait savoir avant d’oser appeler.
        </p>
      </section>

      <dl className="flex flex-col gap-3">
        {QUESTIONS.map(([q, r]) => (
          <div key={q} className="rounded-[14px] border border-line px-6 py-5">
            <dt className="font-semibold">{q}</dt>
            <dd className="mt-2 leading-relaxed text-ink-muted">{r}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
