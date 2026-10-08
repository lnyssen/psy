/**
 * Client minimal de l'API Google Agenda et de l'autorisation OAuth.
 *
 * Quelques appels `fetch` plutôt que le paquet `googleapis` : il pèse plusieurs
 * dizaines de mégaoctets pour cinq requêtes, et chaque requête reste lisible
 * ici. Les adresses de base se surchargent par l'environnement, ce qui permet
 * de tester toute la synchronisation contre un faux Google en local.
 */

/** `calendar.events` suffit : lire et écrire des événements, sans pouvoir
 *  toucher aux réglages ni à la liste des agendas du compte. */
export const SCOPES = "openid email https://www.googleapis.com/auth/calendar.events";

const AUTH_URL = () =>
  process.env.GOOGLE_AUTH_BASE ?? "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_BASE = () => process.env.GOOGLE_OAUTH_BASE ?? "https://oauth2.googleapis.com";
const API_BASE = () => process.env.GOOGLE_API_BASE ?? "https://www.googleapis.com/calendar/v3";

/** Vrai quand les trois variables nécessaires sont posées. Sans elles, toute
 *  la fonction reste inerte : ni erreur, ni appel sortant. */
export function googleConfigure() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_TOKEN_KEY,
  );
}

/** Adresse de retour de l'autorisation. À poser en variable quand l'outil est
 *  servi sous plusieurs noms : Google n'accepte que celles déclarées chez lui. */
export function adresseRetour(req: Request) {
  return process.env.GOOGLE_REDIRECT_URI ?? `${new URL(req.url).origin}/api/google/callback`;
}

export class GoogleErreur extends Error {
  constructor(
    public statut: number,
    public code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "GoogleErreur";
  }
}

export function urlAutorisation(redirectUri: string, state: string) {
  const u = new URL(AUTH_URL());
  u.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", SCOPES);
  // offline + consent : sans cela Google ne renvoie le jeton de rafraîchissement
  // qu'à la toute première autorisation, et une reconnexion resterait muette.
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("state", state);
  return u.toString();
}

async function lireJson(r: Response) {
  const texte = await r.text();
  try {
    return texte ? JSON.parse(texte) : {};
  } catch {
    return { raw: texte };
  }
}

async function appelToken(corps: Record<string, string>) {
  const r = await fetch(`${OAUTH_BASE()}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...corps,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await lireJson(r);
  if (!r.ok) {
    throw new GoogleErreur(
      r.status,
      json.error,
      json.error_description ?? json.error ?? `Échec du jeton (${r.status})`,
    );
  }
  return json as { access_token: string; refresh_token?: string; id_token?: string };
}

/** L'adresse du compte se lit dans le id_token : reçu directement de Google
 *  par une connexion TLS, il n'a pas besoin d'être revérifié ici. */
function emailDuIdToken(idToken?: string) {
  if (!idToken) return null;
  try {
    const charge = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
    return typeof charge.email === "string" ? charge.email : null;
  } catch {
    return null;
  }
}

export async function echangerCode(code: string, redirectUri: string) {
  const t = await appelToken({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
  return { refreshToken: t.refresh_token ?? null, email: emailDuIdToken(t.id_token) };
}

export async function jetonAcces(refreshToken: string) {
  const t = await appelToken({ refresh_token: refreshToken, grant_type: "refresh_token" });
  return t.access_token;
}

/** Révocation au mieux : si elle échoue, la déconnexion locale a lieu quand même. */
export async function revoquer(refreshToken: string) {
  try {
    await fetch(`${OAUTH_BASE()}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    /* sans importance */
  }
}

// --- Événements -----------------------------------------------------------

export type EvenementDistant = {
  id: string;
  status?: "confirmed" | "tentative" | "cancelled";
  etag?: string;
  /** Pour une occurrence d'un événement récurrent : l'identifiant de la série. */
  recurringEventId?: string;
  summary?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
  extendedProperties?: { private?: Record<string, string> };
};

export type CorpsEvenement = {
  id?: string;
  status?: "confirmed";
  summary: string;
  location: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  transparency: "opaque";
  extendedProperties: { private: Record<string, string> };
};

async function appel(
  jeton: string,
  methode: string,
  chemin: string,
  opts: { requete?: Record<string, string>; corps?: unknown } = {},
) {
  const url = new URL(`${API_BASE()}${chemin}`);
  for (const [k, v] of Object.entries(opts.requete ?? {})) url.searchParams.set(k, v);
  const r = await fetch(url, {
    method: methode,
    headers: {
      Authorization: `Bearer ${jeton}`,
      ...(opts.corps ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.corps ? JSON.stringify(opts.corps) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (r.status === 204) return {};
  const json = await lireJson(r);
  if (!r.ok) {
    throw new GoogleErreur(
      r.status,
      json.error?.errors?.[0]?.reason ?? json.error?.status,
      json.error?.message ?? `Google Agenda a répondu ${r.status}`,
    );
  }
  return json;
}

const chemin = (cal: string) => `/calendars/${encodeURIComponent(cal)}/events`;

export async function listerEvenements(
  jeton: string,
  cal: string,
  requete: Record<string, string>,
): Promise<{ items: EvenementDistant[]; nextPageToken?: string; nextSyncToken?: string }> {
  const json = await appel(jeton, "GET", chemin(cal), { requete });
  return { items: json.items ?? [], nextPageToken: json.nextPageToken, nextSyncToken: json.nextSyncToken };
}

export async function creerEvenement(jeton: string, cal: string, corps: CorpsEvenement) {
  return (await appel(jeton, "POST", chemin(cal), { corps })) as EvenementDistant;
}

export async function modifierEvenement(
  jeton: string,
  cal: string,
  id: string,
  corps: Partial<CorpsEvenement>,
) {
  return (await appel(jeton, "PATCH", `${chemin(cal)}/${encodeURIComponent(id)}`, {
    corps,
  })) as EvenementDistant;
}

/** Un événement déjà supprimé n'est pas une erreur : le résultat voulu est atteint. */
export async function supprimerEvenement(jeton: string, cal: string, id: string) {
  try {
    await appel(jeton, "DELETE", `${chemin(cal)}/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof GoogleErreur && (e.statut === 404 || e.statut === 410)) return;
    throw e;
  }
}
