// Maps Supabase / PostgREST errors to safe, user-friendly messages.
// Raw error.message can leak schema details (table/constraint/policy names),
// so always pass errors through this helper before showing them to users.

type MaybeError = {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
} | null | undefined;

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "E-Mail oder Passwort ist falsch.",
  email_not_confirmed: "Bitte bestätige zuerst deine E-Mail-Adresse.",
  user_already_exists: "Es existiert bereits ein Konto mit dieser E-Mail.",
  weak_password: "Das Passwort ist zu schwach.",
  over_email_send_rate_limit: "Zu viele Anfragen. Bitte versuche es später erneut.",
};

export function toUserMessage(error: MaybeError, fallback = "Etwas ist schiefgelaufen. Bitte versuche es erneut."): string {
  if (!error) return fallback;

  // Always log the original error for developers (browser console only).
  if (typeof console !== "undefined") {
    console.error("[app error]", error);
  }

  const code = (error.code ?? "").toString();
  const msg = (error.message ?? "").toString();

  // Supabase Auth error codes
  if (code && AUTH_MESSAGES[code]) return AUTH_MESSAGES[code];

  // Common PostgREST / Postgres SQLSTATEs
  switch (code) {
    case "23505":
      return "Dieser Eintrag existiert bereits.";
    case "23503":
      return "Verknüpfter Eintrag wurde nicht gefunden.";
    case "23502":
      return "Pflichtfeld fehlt.";
    case "23514":
      return "Eingabe ist ungültig.";
    case "42501":
    case "PGRST301":
      return "Du hast keine Berechtigung für diese Aktion.";
    case "PGRST116":
      return "Eintrag nicht gefunden.";
  }

  // Heuristics for known auth message patterns (no code provided)
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login")) return "E-Mail oder Passwort ist falsch.";
  if (lower.includes("already registered") || lower.includes("already exists"))
    return "Es existiert bereits ein Konto mit dieser E-Mail.";
  if (lower.includes("rate limit")) return "Zu viele Anfragen. Bitte versuche es später erneut.";
  if (lower.includes("network")) return "Netzwerkfehler. Bitte prüfe deine Verbindung.";

  return fallback;
}
