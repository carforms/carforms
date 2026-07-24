import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "cf_consent";
const CONSENT_VERSION = 1;
const CONSENT_TTL_MS = 1000 * 60 * 60 * 24 * 365; // 12 Monate

type Categories = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

type StoredConsent = {
  version: number;
  timestamp: string;
  categories: Categories;
};

const DEFAULT_CATEGORIES: Categories = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

const OPEN_EVENT = "cf:open-cookie-settings";

function readConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed.version !== CONSENT_VERSION) return null;
    const age = Date.now() - new Date(parsed.timestamp).getTime();
    if (isNaN(age) || age > CONSENT_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(categories: Categories) {
  const payload: StoredConsent = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    categories,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("cf:consent-updated", { detail: payload }));
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CookieConsent() {
  const [mounted, setMounted] = React.useState(false);
  const [showBanner, setShowBanner] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [prefs, setPrefs] = React.useState<Categories>(DEFAULT_CATEGORIES);

  React.useEffect(() => {
    setMounted(true);
    const existing = readConsent();
    if (existing) {
      setPrefs(existing.categories);
    } else {
      setShowBanner(true);
    }
    const openHandler = () => {
      const cur = readConsent();
      if (cur) setPrefs(cur.categories);
      setShowSettings(true);
    };
    window.addEventListener(OPEN_EVENT, openHandler);
    return () => window.removeEventListener(OPEN_EVENT, openHandler);
  }, []);

  const acceptAll = () => {
    const all: Categories = { necessary: true, functional: true, analytics: true, marketing: true };
    setPrefs(all);
    writeConsent(all);
    setShowBanner(false);
    setShowSettings(false);
  };

  const rejectAll = () => {
    const none: Categories = { ...DEFAULT_CATEGORIES };
    setPrefs(none);
    writeConsent(none);
    setShowBanner(false);
    setShowSettings(false);
  };

  const saveSelection = () => {
    writeConsent(prefs);
    setShowBanner(false);
    setShowSettings(false);
  };

  if (!mounted) return null;

  return (
    <>
      {showBanner && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie-Hinweis"
          className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-6"
        >
          <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-neutral-950/95 p-5 shadow-2xl shadow-black/60 backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-yellow-400/15 text-yellow-400">
                <Cookie className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white">Cookies auf Carforms</h2>
                <p className="mt-1 text-sm text-neutral-300">
                  Wir nutzen Cookies, um Carforms bestmöglich für dich zu gestalten. Notwendige
                  Cookies sind immer aktiv. Alles andere entscheidest du.{" "}
                  <Link to="/datenschutz" className="underline text-neutral-100 hover:text-yellow-400">
                    Datenschutz
                  </Link>
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <Button
                variant="outline"
                onClick={rejectAll}
                className="w-full border-white/15 bg-transparent text-white hover:bg-white/5"
              >
                Alle ablehnen
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSettings(true)}
                className="w-full border-white/15 bg-transparent text-white hover:bg-white/5"
              >
                Einstellungen anpassen
              </Button>
              <Button
                onClick={acceptAll}
                className="w-full bg-yellow-400 text-white hover:bg-yellow-500"
              >
                Alle akzeptieren
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating re-open trigger once decision was made */}
      {!showBanner && (
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          aria-label="Cookie-Einstellungen öffnen"
          className="fixed bottom-4 left-4 z-40 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-neutral-900/80 text-neutral-300 shadow-lg backdrop-blur hover:text-yellow-400"
        >
          <Cookie className="h-4 w-4" />
        </button>
      )}

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg border-white/10 bg-neutral-950 text-white">
          <DialogHeader>
            <DialogTitle>Cookie-Einstellungen</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Wähle selbst, welche Kategorien du zulassen möchtest. Du kannst die Auswahl jederzeit
              ändern.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <CategoryRow
              title="Notwendige Cookies"
              description="Erforderlich für den Betrieb (Login, Sicherheit, Grundfunktionen). Nicht deaktivierbar."
              checked
              disabled
            />
            <CategoryRow
              title="Funktionale Cookies"
              description="Merken sich deine Einstellungen und verbessern die Nutzung."
              checked={prefs.functional}
              onChange={(v) => setPrefs((p) => ({ ...p, functional: v }))}
            />
            <CategoryRow
              title="Statistik / Analyse"
              description="Anonyme Nutzungsdaten helfen uns, Carforms zu verbessern."
              checked={prefs.analytics}
              onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
            />
            <CategoryRow
              title="Marketing"
              description="Für relevantere Inhalte und Kampagnen."
              checked={prefs.marketing}
              onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
            />
          </div>

          <DialogFooter className="grid gap-2 sm:grid-cols-3">
            <Button
              variant="outline"
              onClick={rejectAll}
              className="w-full border-white/15 bg-transparent text-white hover:bg-white/5"
            >
              Alle ablehnen
            </Button>
            <Button
              variant="outline"
              onClick={saveSelection}
              className="w-full border-white/15 bg-transparent text-white hover:bg-white/5"
            >
              Auswahl speichern
            </Button>
            <Button
              onClick={acceptAll}
              className="w-full bg-yellow-400 text-white hover:bg-yellow-500"
            >
              Alle akzeptieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CategoryRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="mt-0.5 text-xs text-neutral-400">{description}</div>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onChange?.(!!v)}
        className="shrink-0 data-[state=checked]:bg-yellow-400"
      />
    </div>
  );
}
